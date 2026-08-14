import { db } from "@/lib/db";
import { getCosecClient } from "@/lib/cosec/config";
import { parseEventTA } from "@/lib/cosec/events";
import { parseCosecDateTime, parseCosecIDateTime } from "@/lib/cosec/dates";
import { logger } from "@/lib/logger";
import { CosecError, assertCosecSuccess } from "@/lib/cosec/errors";
import { SyncSource, SyncStatus, type Prisma } from "@/lib/generated/prisma/client";
import { refreshEmployeeStats } from "./employee";
import type { RawEventRow, ParseEventResult } from "@/lib/cosec/events";
import type { SyncSummary } from "./types";

const BATCH_SIZE = 500;
const INDEX_NO_PATTERN = /^\d+$/;

async function insertEventRows(rows: RawEventRow[]): Promise<{
  inserted: number;
  failed: number;
  skippedParse: number;
}> {
  let inserted = 0;
  let failed = 0;
  let skippedParse = 0;
  const nameByUserId = new Map<string, string>();
  const touchedUserIds = new Set<string>();

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const records: Prisma.EventRecordCreateManyInput[] = [];

    for (const row of batch) {
      const eventDateTime = parseCosecDateTime(row.eventDateTime);
      const idatetime = parseCosecIDateTime(row.idatetime);

      if (!INDEX_NO_PATTERN.test(row.indexNo) || !eventDateTime || !idatetime) {
        skippedParse += 1;
        logger.warn("sync.events.unparseable_row", { raw: row.raw });
        continue;
      }

      nameByUserId.set(row.userId, row.userName);
      touchedUserIds.add(row.userId);

      records.push({
        indexNo: BigInt(row.indexNo),
        cosecUserId: row.userId,
        employeeName: row.userName,
        eventDateTime: eventDateTime.toJSDate(),
        entryExitType: Number(row.entryExitType) || 0,
        masterControllerId: Number(row.masterControllerId) || 0,
        doorControllerId: Number(row.doorControllerId) || 0,
        specialFunctionId: Number(row.specialFunctionId) || 0,
        leaveDateTime: row.leaveDT || null,
        idatetime: idatetime.toJSDate(),
        rawData: row.raw,
      });
    }

    if (records.length > 0) {
      try {
        const result = await db.eventRecord.createMany({ data: records, skipDuplicates: true });
        inserted += result.count;
      } catch (err) {
        failed += records.length;
        logger.error("sync.events.batch_insert_failed", {
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }

  await refreshEmployeeStats(Array.from(touchedUserIds), nameByUserId);

  return { inserted, failed, skippedParse };
}

/**
 * Shared core: given a way to obtain {rows, malformed} (either "fetch +
 * parse from COSEC now" for Mode A, or "parse this raw text the agent
 * already fetched" for Mode B), inserts under one sync log entry.
 */
async function runEventSync(
  source: typeof SyncSource.EVENT_TA_DATE | typeof SyncSource.EVENT_TA,
  fetchFn: () => Promise<ParseEventResult>,
  viaAgent: boolean
): Promise<SyncSummary> {
  const log = await db.cosecSyncLog.create({ data: { source, status: SyncStatus.RUNNING, viaAgent } });

  try {
    const { rows, malformed } = await fetchFn();
    const { inserted, failed, skippedParse } = await insertEventRows(rows);
    // createMany(skipDuplicates) doesn't report which rows were duplicates vs
    // inserted individually — anything not inserted/failed/parse-skipped was a duplicate.
    const duplicates = Math.max(rows.length - inserted - failed - skippedParse, 0);
    const recordsSkipped = malformed.length + skippedParse + duplicates;
    const status = failed > 0 || recordsSkipped > 0 ? SyncStatus.PARTIAL : SyncStatus.SUCCESS;

    await db.cosecSyncLog.update({
      where: { id: log.id },
      data: {
        status,
        endTime: new Date(),
        recordsFetched: rows.length,
        recordsCreated: inserted,
        recordsSkipped,
        recordsFailed: failed,
      },
    });

    return {
      syncId: log.syncId,
      source,
      status,
      recordsFetched: rows.length,
      recordsCreated: inserted,
      recordsUpdated: 0,
      recordsSkipped,
      recordsFailed: failed,
    };
  } catch (err) {
    const errorMessage =
      err instanceof CosecError ? err.message : err instanceof Error ? err.message : "Unknown sync error";
    await db.cosecSyncLog.update({
      where: { id: log.id },
      data: { status: SyncStatus.FAILED, endTime: new Date(), errorMessage },
    });
    return {
      syncId: log.syncId,
      source,
      status: SyncStatus.FAILED,
      recordsFetched: 0,
      recordsCreated: 0,
      recordsUpdated: 0,
      recordsSkipped: 0,
      recordsFailed: 0,
      errorMessage,
    };
  }
}

/** Mode A: this app fetches directly from COSEC. */
export async function syncEventsForRange(from: Date, to: Date): Promise<SyncSummary> {
  const client = await getCosecClient();
  return runEventSync(SyncSource.EVENT_TA_DATE, () => client.getEventTaDate(from, to), false);
}

/** Mode A: fetches and stores the full COSEC event history. Server-side only — never send this to the browser. */
export async function syncAllEvents(): Promise<SyncSummary> {
  const client = await getCosecClient();
  return runEventSync(SyncSource.EVENT_TA, () => client.getAllEvents(), false);
}

/** Mode B: /agent/cosec-agent already fetched this raw response — parse and upsert it here, never on the agent. */
export async function ingestEventsRaw(
  rawText: string,
  source: typeof SyncSource.EVENT_TA_DATE | typeof SyncSource.EVENT_TA
): Promise<SyncSummary> {
  return runEventSync(
    source,
    async () => {
      // Mode A's CosecClient already checks this before returning raw text;
      // Mode B's raw text hasn't been checked yet — do it here so a forwarded
      // "failed: CODE" body fails the sync loudly instead of silently parsing
      // as zero rows.
      assertCosecSuccess(rawText, 200);
      return parseEventTA(rawText);
    },
    true
  );
}
