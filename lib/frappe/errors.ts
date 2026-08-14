export type FrappeErrorKind = "NETWORK" | "TIMEOUT" | "HTTP" | "AUTH_ERROR";

export class FrappeError extends Error {
  readonly kind: FrappeErrorKind;
  readonly httpStatus?: number;

  constructor(message: string, kind: FrappeErrorKind, options?: { httpStatus?: number; cause?: unknown }) {
    super(message, { cause: options?.cause });
    this.name = "FrappeError";
    this.kind = kind;
    this.httpStatus = options?.httpStatus;
  }
}

interface FrappeErrorBody {
  exception?: string;
  exc_type?: string;
  _server_messages?: string;
  message?: string;
}

/**
 * Frappe error responses are JSON with an `exception`/`exc_type`, and often a
 * `_server_messages` field that is itself a JSON-encoded array of JSON-encoded
 * message objects (how frappe.throw()/msgprint() surface to the REST API).
 * Unlike COSEC, Frappe uses real HTTP status codes for failures — this just
 * extracts the most human-readable message from whichever shape shows up.
 */
export function extractFrappeErrorMessage(body: unknown, httpStatus: number): string {
  if (body && typeof body === "object") {
    const b = body as FrappeErrorBody;
    if (b._server_messages) {
      try {
        const messages = JSON.parse(b._server_messages) as string[];
        const first = messages[0] ? JSON.parse(messages[0]) : null;
        if (first?.message) return first.message;
      } catch {
        // fall through to other fields
      }
    }
    if (b.exception) return b.exception;
    if (b.message) return b.message;
  }
  return `Frappe returned HTTP ${httpStatus}`;
}
