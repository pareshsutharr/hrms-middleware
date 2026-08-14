type LogLevel = "debug" | "info" | "warn" | "error";

const REDACT_KEYS = new Set([
  "password",
  "authorization",
  "secret",
  "token",
  "apisecret",
  "apikey",
]);

function redact(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redact);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, val]) => [
        key,
        REDACT_KEYS.has(key.toLowerCase()) ? "[REDACTED]" : redact(val),
      ])
    );
  }
  return value;
}

function log(level: LogLevel, event: string, meta?: Record<string, unknown>) {
  const entry = {
    level,
    event,
    time: new Date().toISOString(),
    ...(meta ? { meta: redact(meta) } : {}),
  };
  const line = JSON.stringify(entry);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export const logger = {
  debug: (event: string, meta?: Record<string, unknown>) => log("debug", event, meta),
  info: (event: string, meta?: Record<string, unknown>) => log("info", event, meta),
  warn: (event: string, meta?: Record<string, unknown>) => log("warn", event, meta),
  error: (event: string, meta?: Record<string, unknown>) => log("error", event, meta),
};
