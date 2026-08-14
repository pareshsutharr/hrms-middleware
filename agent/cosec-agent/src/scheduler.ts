import { config } from "./config.js";
import { fetchAttendanceDailyRaw, fetchEventTaDateRaw } from "./cosecClient.js";
import { postSync, postHeartbeat } from "./cloudClient.js";
import { todayIstBounds } from "./dates.js";

async function runSyncCycle(): Promise<void> {
  const { start, end } = todayIstBounds();
  console.log(`[cosec-agent] Sync cycle starting for ${start.toISOString()} - ${end.toISOString()}`);

  try {
    const attendanceRaw = await fetchAttendanceDailyRaw(start, end);
    const summary = await postSync("attendance-daily", attendanceRaw);
    console.log(
      `[cosec-agent] attendance-daily: ${summary.status} — fetched ${summary.recordsFetched}, created ${summary.recordsCreated}, updated ${summary.recordsUpdated ?? 0}, skipped ${summary.recordsSkipped}, failed ${summary.recordsFailed}`
    );
  } catch (err) {
    console.error(`[cosec-agent] attendance-daily sync failed: ${(err as Error).message}`);
  }

  try {
    const eventsRaw = await fetchEventTaDateRaw(start, end);
    const summary = await postSync("event-ta-date", eventsRaw);
    console.log(
      `[cosec-agent] event-ta-date: ${summary.status} — fetched ${summary.recordsFetched}, created ${summary.recordsCreated}, skipped ${summary.recordsSkipped}, failed ${summary.recordsFailed}`
    );
  } catch (err) {
    console.error(`[cosec-agent] event-ta-date sync failed: ${(err as Error).message}`);
  }
}

async function sendHeartbeat(): Promise<void> {
  try {
    await postHeartbeat();
    console.log("[cosec-agent] heartbeat sent");
  } catch (err) {
    console.error(`[cosec-agent] heartbeat failed: ${(err as Error).message}`);
  }
}

/** Starts the periodic loop — heartbeat and a sync cycle (today's attendance + events) on every tick. */
export function start(): void {
  const intervalMs = config.syncIntervalMinutes * 60 * 1000;
  console.log(
    `[cosec-agent] starting — sync every ${config.syncIntervalMinutes} minute(s), cloud API at ${config.cloudApiUrl}`
  );

  void sendHeartbeat();
  void runSyncCycle();

  setInterval(() => void sendHeartbeat(), intervalMs);
  setInterval(() => void runSyncCycle(), intervalMs);
}
