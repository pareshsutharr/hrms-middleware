import { fetchAllEventsRaw } from "./cosecClient.js";
import { postSync } from "./cloudClient.js";
import { start } from "./scheduler.js";

/**
 * One-time full event-history backfill (`npm run full-sync` / `--full-sync`).
 * Not part of the periodic loop — per the spec, the agent should not
 * repeatedly download the entire event history.
 */
async function runFullSync(): Promise<void> {
  console.log("[cosec-agent] Fetching full COSEC event history (one-time backfill, may be large)...");
  const raw = await fetchAllEventsRaw();
  const summary = await postSync("event-ta", raw);
  console.log(
    `[cosec-agent] event-ta (full): ${summary.status} — fetched ${summary.recordsFetched}, created ${summary.recordsCreated}, skipped ${summary.recordsSkipped}, failed ${summary.recordsFailed}`
  );
}

async function main() {
  if (process.argv.includes("--full-sync")) {
    await runFullSync();
    return;
  }

  start();
}

main().catch((err) => {
  console.error("[cosec-agent] fatal error:", err);
  process.exitCode = 1;
});
