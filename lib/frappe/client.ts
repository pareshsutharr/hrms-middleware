import { FrappeError, extractFrappeErrorMessage } from "./errors";
import { logger } from "@/lib/logger";

export interface FrappeClientConfig {
  /** e.g. https://hr.yourcompany.com — no trailing slash needed. */
  baseUrl: string;
  apiKey: string;
  apiSecret: string;
  timeoutMs?: number;
}

export interface TestConnectionResult {
  success: boolean;
  message: string;
  latencyMs: number;
}

const DEFAULT_TIMEOUT_MS = 15_000;

function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}

export class FrappeClient {
  private readonly config: Required<FrappeClientConfig>;

  constructor(config: FrappeClientConfig) {
    this.config = { timeoutMs: DEFAULT_TIMEOUT_MS, ...config };
  }

  /** GET an arbitrary Frappe REST path — used by doctype-specific modules (lib/frappe/employee.ts, etc). */
  async get<T = unknown>(path: string): Promise<T> {
    return this.request<T>(path);
  }

  /** PUT (partial update) an arbitrary Frappe REST path. */
  async put<T = unknown>(path: string, data: Record<string, unknown>): Promise<T> {
    return this.request<T>(path, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  }

  /** POST (create) an arbitrary Frappe REST path. */
  async post<T = unknown>(path: string, data: Record<string, unknown>): Promise<T> {
    return this.request<T>(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  }

  private async request<T = unknown>(path: string, init?: RequestInit): Promise<T> {
    const base = this.config.baseUrl.replace(/\/+$/, "");
    const url = `${base}${path}`;
    const authHeader = `token ${this.config.apiKey}:${this.config.apiSecret}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);

    let response: Response;
    try {
      response = await fetch(url, {
        ...init,
        headers: { Authorization: authHeader, Accept: "application/json", ...(init?.headers ?? {}) },
        signal: controller.signal,
        cache: "no-store",
      });
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        throw new FrappeError(`Frappe request timed out after ${this.config.timeoutMs}ms`, "TIMEOUT", { cause: err });
      }
      throw new FrappeError(`Could not reach Frappe server at ${this.config.baseUrl}`, "NETWORK", { cause: err });
    } finally {
      clearTimeout(timeout);
    }

    const text = await response.text();
    const body = text ? safeJsonParse(text) : null;

    if (!response.ok) {
      const kind = response.status === 401 || response.status === 403 ? "AUTH_ERROR" : "HTTP";
      throw new FrappeError(extractFrappeErrorMessage(body, response.status), kind, {
        httpStatus: response.status,
      });
    }

    return body as T;
  }

  /**
   * Two-stage probe: `frappe.auth.get_logged_user` confirms the API
   * key/secret is valid against the Frappe framework itself (stable across
   * versions), then a minimal Employee list call confirms the HR module is
   * actually installed and this user can read it.
   */
  async testConnection(): Promise<TestConnectionResult> {
    const start = Date.now();
    try {
      const auth = await this.request<{ message: string }>("/api/method/frappe.auth.get_logged_user");

      try {
        await this.request("/api/resource/Employee?limit_page_length=1");
        return {
          success: true,
          message: `Connected to Frappe as ${auth.message}. Employee doctype is reachable.`,
          latencyMs: Date.now() - start,
        };
      } catch (err) {
        const detail = err instanceof FrappeError ? err.message : "Employee doctype check failed.";
        return {
          success: true,
          message: `Connected to Frappe as ${auth.message}, but the Employee doctype check failed: ${detail}. HRMS may not be installed, or this user lacks permission on Employee.`,
          latencyMs: Date.now() - start,
        };
      }
    } catch (err) {
      const message = err instanceof FrappeError ? err.message : "Unknown error while contacting Frappe.";
      logger.warn("frappe.test_connection_failed", {
        message,
        kind: err instanceof FrappeError ? err.kind : undefined,
      });
      return { success: false, message, latencyMs: Date.now() - start };
    }
  }
}
