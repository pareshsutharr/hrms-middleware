import { config } from "./config.js";

export interface SyncSummary {
  syncId: string;
  status: "RUNNING" | "SUCCESS" | "PARTIAL" | "FAILED";
  recordsFetched: number;
  recordsCreated: number;
  recordsUpdated?: number;
  recordsSkipped: number;
  recordsFailed: number;
  errorMessage?: string;
}

interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string };
}

const MAX_ATTEMPTS = 3;
const RETRY_BASE_DELAY_MS = 2000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const res = await fetch(`${config.cloudApiUrl}${path}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.agentSecret}`,
        },
        body: JSON.stringify(body),
      });

      const json = (await res.json()) as ApiEnvelope<T>;
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message ?? `Cloud API returned HTTP ${res.status}`);
      }
      return json.data as T;
    } catch (err) {
      lastError = err;
      if (attempt < MAX_ATTEMPTS) {
        const delay = RETRY_BASE_DELAY_MS * attempt;
        console.warn(
          `[cosec-agent] ${path} failed (attempt ${attempt}/${MAX_ATTEMPTS}), retrying in ${delay}ms: ${(err as Error).message}`
        );
        await sleep(delay);
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

export type SyncType = "attendance-daily" | "event-ta-date" | "event-ta";

/** Posts a raw COSEC response for the cloud to parse and upsert — never parsed here. */
export async function postSync(type: SyncType, rawResponse: string): Promise<SyncSummary> {
  return postJson<SyncSummary>("/sync", { type, rawResponse });
}

export async function postHeartbeat(): Promise<{ acknowledged: boolean; serverTime: string }> {
  return postJson("/heartbeat", {});
}
