import { config } from "./config.js";
import { formatAttendanceDateRange, formatEventDateRange } from "./dates.js";

export class CosecFetchError extends Error {}

const REQUEST_TIMEOUT_MS = 20_000;

function buildUrl(path: string, rawQuery?: string): string {
  const base = config.cosecBaseUrl.replace(/\/+$/, "");
  const url = `${base}/COSEC/api.svc${path}`;
  // COSEC's date-range query uses a raw `key=value;key=value` shape (semicolons,
  // not `&`) — built as a plain string, matching the cloud app's client exactly.
  return rawQuery ? `${url}?${rawQuery}` : url;
}

async function request(path: string, rawQuery?: string): Promise<string> {
  const url = buildUrl(path, rawQuery);
  const authHeader = "Basic " + Buffer.from(`${config.cosecUsername}:${config.cosecPassword}`).toString("base64");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(url, {
      method: "GET",
      headers: { Authorization: authHeader },
      signal: controller.signal,
    });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new CosecFetchError(`COSEC request timed out after ${REQUEST_TIMEOUT_MS}ms`);
    }
    throw new CosecFetchError(`Could not reach COSEC at ${config.cosecBaseUrl}: ${(err as Error).message}`);
  } finally {
    clearTimeout(timeout);
  }

  const text = await response.text();
  if (!response.ok) {
    throw new CosecFetchError(`COSEC returned HTTP ${response.status}`);
  }

  // Deliberately NOT checking for COSEC's "failed: CODE : message" body here —
  // the agent is a thin relay. Raw text (success or COSEC-level failure) is
  // forwarded either way; the cloud's existing lib/cosec/errors.ts detects it
  // on ingest and fails the sync log with a clear message.
  return text;
}

export async function fetchAttendanceDailyRaw(from: Date, to: Date): Promise<string> {
  const query = `action=get;date-range=${formatAttendanceDateRange(from, to)}`;
  return request("/V2/attendance-daily", query);
}

export async function fetchEventTaDateRaw(from: Date, to: Date): Promise<string> {
  const query = `action=get;date-range=${formatEventDateRange(from, to)}`;
  return request("/V2/event-ta-date", query);
}

export async function fetchAllEventsRaw(): Promise<string> {
  return request("/V2/event-ta", "action=get");
}
