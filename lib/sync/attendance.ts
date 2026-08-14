import { db } from "@/lib/db";
import { getCosecClient } from "@/lib/cosec/config";
import { parseAttendanceDaily } from "@/lib/cosec/attendance";
import { parseCosecDate, parseCosecDateTime, toUtcDateOnly } from "@/lib/cosec/dates";
import { calculateAttendanceStatus } from "@/lib/status";
import { logger } from "@/lib/logger";
import { CosecError, assertCosecSuccess } from "@/lib/cosec/errors";
import { SyncSource, SyncStatus } from "@/lib/generated/prisma/client";
import { ensureEmployee } from "./employee";
import type { SyncSummary } from "./types";

/**
 * Shared core: given a way to obtain the raw attendance-daily response text
 * (either "fetch it from COSEC now" for the direct Mode A path, or "here's
 * what the agent already fetched" for Mode B), parses and upserts it under
 * one sync log entry — so a log always exists whether the failure happened
 * while fetching or while ingesting.
 */
async function runAttendanceSync(fetchRawText: () => Promise<string>, viaAgent: boolean): Promise<SyncSummary> {
  const log = await db.cosecSyncLog.create({
    data: { source: SyncSource.ATTENDANCE_DAILY, status: SyncStatus.RUNNING, viaAgent },
  });

  let recordsFetched = 0;
  let recordsCreated = 0;
  let recordsUpdated = 0;
  let recordsSkipped = 0;
  let recordsFailed = 0;

  try {
    const rawText = await fetchRawText();
    // Mode A's CosecClient already checks this before returning raw text, but
    // Mode B's raw text arrives from the agent without having passed through
    // it yet — checking here too means a forwarded "failed: CODE" body fails
    // the sync loudly instead of silently parsing as zero rows.
    assertCosecSuccess(rawText, 200);
    const { rows, malformed } = parseAttendanceDaily(rawText);
    recordsFetched = rows.length;
    recordsSkipped = malformed.length;

    for (const row of rows) {
      try {
        const processDate = parseCosecDate(row.processDate);
        if (!processDate) {
          recordsFailed += 1;
          logger.warn("sync.attendance.unparseable_process_date", { userId: row.userId, raw: row.raw });
          continue;
        }

        const punchInDt = parseCosecDateTime(row.punch1);
        const punchOutDt = parseCosecDateTime(row.punch2);
        const status = calculateAttendanceStatus(row.punch1, row.punch2);
        const where = {
          cosecUserId_processDate: {
            cosecUserId: row.userId,
            processDate: toUtcDateOnly(processDate),
          },
        };

        const existing = await db.attendanceRecord.findUnique({ where, select: { id: true } });

        const fields = {
          employeeName: row.userName,
          punchIn: punchInDt?.toJSDate(),
          punchOut: punchOutDt?.toJSDate(),
          workingShift: row.workingShift || null,
          lateIn: row.lateIn || null,
          earlyOut: row.earlyOut || null,
          overtime: row.overtime || null,
          workTime: row.workTime || null,
          status,
          rawData: row.raw,
        };

        await db.attendanceRecord.upsert({
          where,
          create: {
            cosecUserId: row.userId,
            processDate: toUtcDateOnly(processDate),
            ...fields,
          },
          update: fields,
        });

        if (existing) {
          recordsUpdated += 1;
        } else {
          recordsCreated += 1;
        }
        await ensureEmployee(row.userId, row.userName);
      } catch (err) {
        recordsFailed += 1;
        logger.error("sync.attendance.row_failed", {
          userId: row.userId,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    const status = recordsFailed > 0 || recordsSkipped > 0 ? SyncStatus.PARTIAL : SyncStatus.SUCCESS;
    await db.cosecSyncLog.update({
      where: { id: log.id },
      data: { status, endTime: new Date(), recordsFetched, recordsCreated, recordsUpdated, recordsSkipped, recordsFailed },
    });

    return {
      syncId: log.syncId,
      source: SyncSource.ATTENDANCE_DAILY,
      status,
      recordsFetched,
      recordsCreated,
      recordsUpdated,
      recordsSkipped,
      recordsFailed,
    };
  } catch (err) {
    const errorMessage =
      err instanceof CosecError ? err.message : err instanceof Error ? err.message : "Unknown sync error";
    await db.cosecSyncLog.update({
      where: { id: log.id },
      data: {
        status: SyncStatus.FAILED,
        endTime: new Date(),
        recordsFetched,
        recordsCreated,
        recordsUpdated,
        recordsSkipped,
        recordsFailed,
        errorMessage,
      },
    });
    return {
      syncId: log.syncId,
      source: SyncSource.ATTENDANCE_DAILY,
      status: SyncStatus.FAILED,
      recordsFetched,
      recordsCreated,
      recordsUpdated,
      recordsSkipped,
      recordsFailed,
      errorMessage,
    };
  }
}

/** Mode A: this app fetches directly from COSEC. */
export async function syncAttendanceDaily(from: Date, to: Date): Promise<SyncSummary> {
  const client = await getCosecClient();
  return runAttendanceSync(() => client.getAttendanceDailyRaw(from, to), false);
}

/** Mode B: /agent/cosec-agent already fetched this raw response — parse and upsert it here, never on the agent. */
export async function ingestAttendanceDailyRaw(rawText: string): Promise<SyncSummary> {
  return runAttendanceSync(async () => rawText, true);
}
