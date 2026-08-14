export type CosecErrorKind = "NETWORK" | "TIMEOUT" | "HTTP" | "API_ERROR";

export class CosecError extends Error {
  readonly kind: CosecErrorKind;
  readonly code?: string;
  readonly httpStatus?: number;

  constructor(
    message: string,
    kind: CosecErrorKind,
    options?: { code?: string; httpStatus?: number; cause?: unknown }
  ) {
    super(message, { cause: options?.cause });
    this.name = "CosecError";
    this.kind = kind;
    this.code = options?.code;
    this.httpStatus = options?.httpStatus;
  }
}

export interface CosecFailure {
  code: string;
  message: string;
}

const FAILURE_PATTERN = /^\s*failed\s*:\s*(\S+)\s*:\s*(.+)$/im;

/**
 * COSEC returns HTTP 200 even for application-level failures, e.g.
 * "failed: 0000002001 : API access denied. username = HR" — every response
 * body must be scanned for this shape before being trusted, regardless of
 * HTTP status.
 */
export function detectCosecFailure(body: string): CosecFailure | null {
  if (!body) return null;
  const match = FAILURE_PATTERN.exec(body);
  if (!match) return null;
  return { code: match[1], message: match[2].trim() };
}

export function assertCosecSuccess(body: string, httpStatus: number): void {
  const failure = detectCosecFailure(body);
  if (failure) {
    throw new CosecError(`COSEC API error ${failure.code}: ${failure.message}`, "API_ERROR", {
      code: failure.code,
      httpStatus,
    });
  }
}
