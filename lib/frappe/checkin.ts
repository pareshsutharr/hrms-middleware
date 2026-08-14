import { db } from "@/lib/db";
import { getFrappeClient } from "./config";
import { FrappeError } from "./errors";
import { toIst, nowInIst } from "@/lib/cosec/dates";
import { logger } from "@/lib/logger";
import { FrappeSyncSource, SyncStatus, EmployeeMappingStatus } from "@/lib/generated/prisma/client";

export interface FrappeSyncSummary {
  syncId: string;
  status: SyncStatus;
  recordsFetched: number;
  recordsCreated: number;
  recordsSkipped: number;
  recordsFailed: number;
  errorMessage?: string;
}

const EMPLOYEE_CHECKIN_DOCTYPE = "Employee Checkin";
const DEVICE_ID_PATTERN = /^COSEC-(\d+)$/;

/**
 * Shift types where Frappe marks attendance Present regardless of check-in
 * data (confirmed on the connected instance: "Open Attendence" has
 * working_hours_threshold_for_absent = 0). Pushing COSEC punches for
 * employees on these shifts would create Checkin records with no effect on
 * their Attendance, so they're skipped rather than synced.
 */
const EXCLUDED_SHIFT_TYPES = new Set(["Open Attendence"]);

function formatFrappeDateTime(date: Date): string {
  return toIst(date).toFormat("yyyy-MM-dd HH:mm:ss");
}

/** Frappe employee IDs (from the given list) whose default_shift is in EXCLUDED_SHIFT_TYPES. */
async function fetchExcludedFrappeEmployeeIds(frappeEmployeeIds: string[]): Promise<Set<string>> {
  if (frappeEmployeeIds.length === 0) return new Set();

  const client = await getFrappeClient();
  const filters = encodeURIComponent(JSON.stringify([["name", "in", frappeEmployeeIds]]));
  const fields = encodeURIComponent(JSON.stringify(["name", "default_shift"]));
  const result = await client.get<{ data: { name: string; default_shift: string | null }[] }>(
    `/api/resource/Employee?filters=${filters}&fields=${fields}&limit_page_length=0`
  );

  const excluded = new Set<string>();
  for (const row of result.data) {
    if (row.default_shift && EXCLUDED_SHIFT_TYPES.has(row.default_shift)) {
      excluded.add(row.name);
    }
  }
  return excluded;
}

/**
 * Employee Checkin's device_id field has no uniqueness constraint in Frappe,
 * so idempotency has to be enforced here: fetch which COSEC index numbers
 * already have a Checkin in this range before creating anything new.
 */
async function fetchAlreadySyncedIndexNos(from: Date, to: Date): Promise<Set<string>> {
  const client = await getFrappeClient();
  const filters = encodeURIComponent(
    JSON.stringify([
      ["time", ">=", formatFrappeDateTime(from)],
      ["time", "<=", formatFrappeDateTime(to)],
    ])
  );
  const fields = encodeURIComponent(JSON.stringify(["device_id"]));
  const result = await client.get<{ data: { device_id: string | null }[] }>(
    `/api/resource/${encodeURIComponent(EMPLOYEE_CHECKIN_DOCTYPE)}?filters=${filters}&fields=${fields}&limit_page_length=0`
  );

  const seen = new Set<string>();
  for (const row of result.data) {
    const match = row.device_id ? DEVICE_ID_PATTERN.exec(row.device_id) : null;
    if (match) seen.add(match[1]);
  }
  return seen;
}

/**
 * Pushes COSEC punches into Frappe as Employee Checkin records, for mapped
 * employees only, within [from, to]. Deliberately does not touch Attendance
 * directly — whether Frappe derives Attendance from these checkins depends
 * on Shift Type.enable_auto_attendance, a decision left to the Frappe side.
 */
export async function syncCheckinsToFrappe(from: Date, to: Date): Promise<FrappeSyncSummary> {
  const log = await db.frappeSyncLog.create({
    data: { source: FrappeSyncSource.CHECKIN_SYNC, status: SyncStatus.RUNNING },
  });

  let recordsFetched = 0;
  let recordsCreated = 0;
  let recordsSkipped = 0;
  let recordsFailed = 0;

  try {
    const mappings = await db.employeeMapping.findMany({ where: { status: EmployeeMappingStatus.MAPPED } });
    const frappeIdByCosecUserId = new Map(mappings.map((m) => [m.cosecUserId, m.frappeEmployeeId as string]));

    if (frappeIdByCosecUserId.size > 0) {
      const events = await db.eventRecord.findMany({
        where: {
          eventDateTime: { gte: from, lte: to },
          cosecUserId: { in: Array.from(frappeIdByCosecUserId.keys()) },
        },
        orderBy: { eventDateTime: "asc" },
      });
      recordsFetched = events.length;

      const alreadySynced = await fetchAlreadySyncedIndexNos(from, to);
      const excludedFrappeEmployeeIds = await fetchExcludedFrappeEmployeeIds(
        Array.from(new Set(frappeIdByCosecUserId.values()))
      );
      const client = await getFrappeClient();

      for (const event of events) {
        const indexNoStr = event.indexNo.toString();
        if (alreadySynced.has(indexNoStr)) {
          recordsSkipped += 1;
          continue;
        }

        const frappeEmployeeId = frappeIdByCosecUserId.get(event.cosecUserId);
        if (!frappeEmployeeId) {
          recordsSkipped += 1;
          continue;
        }

        if (excludedFrappeEmployeeIds.has(frappeEmployeeId)) {
          recordsSkipped += 1;
          continue;
        }

        // Inferred from the field name (0=IN, 1=OUT) — no confirmed OUT-type
        // sample seen yet. Anything else is left unset rather than guessed;
        // log_type is optional on Employee Checkin.
        const logType = event.entryExitType === 0 ? "IN" : event.entryExitType === 1 ? "OUT" : undefined;

        try {
          await client.post(`/api/resource/${encodeURIComponent(EMPLOYEE_CHECKIN_DOCTYPE)}`, {
            employee: frappeEmployeeId,
            time: formatFrappeDateTime(event.eventDateTime),
            ...(logType ? { log_type: logType } : {}),
            device_id: `COSEC-${indexNoStr}`,
          });
          recordsCreated += 1;
        } catch (err) {
          recordsFailed += 1;
          logger.error("frappe.checkin_sync.row_failed", {
            indexNo: indexNoStr,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }
    }

    const status = recordsFailed > 0 ? SyncStatus.PARTIAL : SyncStatus.SUCCESS;
    await db.frappeSyncLog.update({
      where: { id: log.id },
      data: { status, endTime: new Date(), recordsFetched, recordsCreated, recordsSkipped, recordsFailed },
    });

    return { syncId: log.syncId, status, recordsFetched, recordsCreated, recordsSkipped, recordsFailed };
  } catch (err) {
    const errorMessage =
      err instanceof FrappeError ? err.message : err instanceof Error ? err.message : "Unknown sync error";
    await db.frappeSyncLog.update({
      where: { id: log.id },
      data: {
        status: SyncStatus.FAILED,
        endTime: new Date(),
        recordsFetched,
        recordsCreated,
        recordsSkipped,
        recordsFailed,
        errorMessage,
      },
    });
    return {
      syncId: log.syncId,
      status: SyncStatus.FAILED,
      recordsFetched,
      recordsCreated,
      recordsSkipped,
      recordsFailed,
      errorMessage,
    };
  }
}

/**
 * Pushes today's (IST) checkins — used by both the agent-triggered auto-push
 * (after each COSEC sync cycle) and the daily Vercel Cron safety net.
 */
export async function syncTodaysCheckinsToFrappe(): Promise<FrappeSyncSummary> {
  const today = nowInIst();
  return syncCheckinsToFrappe(today.startOf("day").toJSDate(), today.endOf("day").toJSDate());
}
