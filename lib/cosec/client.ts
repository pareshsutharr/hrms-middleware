import { CosecError, assertCosecSuccess } from "./errors";
import { parseAttendanceDaily, type ParseAttendanceResult } from "./attendance";
import { parseEventTA, type ParseEventResult } from "./events";
import { formatAttendanceDateRange, formatEventDateRange } from "./dates";
import { logger } from "@/lib/logger";

export interface CosecClientConfig {
  /** Server root, e.g. http://192.168.0.107:85 — no /COSEC/api.svc suffix. */
  baseUrl: string;
  username: string;
  password: string;
  timeoutMs?: number;
}

export interface TestConnectionResult {
  success: boolean;
  message: string;
  latencyMs: number;
}

const DEFAULT_TIMEOUT_MS = 20_000;

export class CosecClient {
  private readonly config: Required<CosecClientConfig>;

  constructor(config: CosecClientConfig) {
    this.config = { timeoutMs: DEFAULT_TIMEOUT_MS, ...config };
  }

  private buildUrl(path: string, rawQuery?: string): string {
    const base = this.config.baseUrl.replace(/\/+$/, "");
    const url = `${base}/COSEC/api.svc${path}`;
    // COSEC's date-range query uses a raw `key=value;key=value` shape (semicolons,
    // not `&`) — build it as a plain string rather than via URLSearchParams so the
    // format matches exactly what's been verified to work against the real server.
    return rawQuery ? `${url}?${rawQuery}` : url;
  }

  private async request(path: string, rawQuery?: string): Promise<string> {
    const url = this.buildUrl(path, rawQuery);
    const authHeader =
      "Basic " + Buffer.from(`${this.config.username}:${this.config.password}`).toString("base64");

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);

    let response: Response;
    try {
      response = await fetch(url, {
        method: "GET",
        headers: { Authorization: authHeader },
        signal: controller.signal,
        cache: "no-store",
      });
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        throw new CosecError(`COSEC request timed out after ${this.config.timeoutMs}ms`, "TIMEOUT", {
          cause: err,
        });
      }
      throw new CosecError(`Could not reach COSEC server at ${this.config.baseUrl}`, "NETWORK", {
        cause: err,
      });
    } finally {
      clearTimeout(timeout);
    }

    const text = await response.text();

    if (!response.ok) {
      throw new CosecError(`COSEC server returned HTTP ${response.status}`, "HTTP", {
        httpStatus: response.status,
      });
    }

    if (!text || text.trim().length === 0) {
      // An empty-but-2xx body could legitimately mean "zero rows for this range",
      // so this is not treated as fatal — just logged, and callers get an empty parse.
      logger.warn("cosec.empty_response_body", { path });
    }

    // HTTP 200 does not guarantee success — COSEC embeds "failed: <code> : <message>" in the body.
    assertCosecSuccess(text, response.status);

    return text;
  }

  /** Raw pipe-delimited response, unparsed — what /agent/cosec-agent relays to the cloud instead of parsing locally. */
  async getAttendanceDailyRaw(from: Date, to: Date): Promise<string> {
    const query = `action=get;date-range=${formatAttendanceDateRange(from, to)}`;
    return this.request("/V2/attendance-daily", query);
  }

  async getAttendanceDaily(from: Date, to: Date): Promise<ParseAttendanceResult> {
    const text = await this.getAttendanceDailyRaw(from, to);
    return parseAttendanceDaily(text);
  }

  async getEventTaDateRaw(from: Date, to: Date): Promise<string> {
    const query = `action=get;date-range=${formatEventDateRange(from, to)}`;
    return this.request("/V2/event-ta-date", query);
  }

  async getEventTaDate(from: Date, to: Date): Promise<ParseEventResult> {
    const text = await this.getEventTaDateRaw(from, to);
    return parseEventTA(text);
  }

  async getAllEventsRaw(): Promise<string> {
    return this.request("/V2/event-ta", "action=get");
  }

  /** Returns the full event history. Caller is responsible for batching DB writes and never sends this to the browser in one payload. */
  async getAllEvents(): Promise<ParseEventResult> {
    const text = await this.getAllEventsRaw();
    return parseEventTA(text);
  }

  async testConnection(): Promise<TestConnectionResult> {
    const start = Date.now();
    try {
      const today = new Date();
      await this.getAttendanceDaily(today, today);
      return {
        success: true,
        message: "Connected to COSEC and authenticated successfully.",
        latencyMs: Date.now() - start,
      };
    } catch (err) {
      const message = err instanceof CosecError ? err.message : "Unknown error while contacting COSEC.";
      logger.warn("cosec.test_connection_failed", { message, kind: err instanceof CosecError ? err.kind : undefined });
      return { success: false, message, latencyMs: Date.now() - start };
    }
  }
}
