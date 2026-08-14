import { DateTime } from "luxon";

export const COSEC_TIMEZONE = "Asia/Kolkata";

const DATE_RANGE_FMT = "ddMMyyyy";
const DATETIME_RANGE_FMT = "ddMMyyyyHHmmss";
const DATE_DISPLAY_FMT = "dd/MM/yyyy";
const DATETIME_DISPLAY_FMT = "dd/MM/yyyy HH:mm:ss";
// COSEC's IDateTime column is the one exception that uses US month/day order,
// unlike ProcessDate/Punch*/EventDateTime which all use DD/MM/YYYY.
const IDATETIME_DISPLAY_FMT = "MM/dd/yyyy HH:mm:ss";

export function nowInIst(): DateTime {
  return DateTime.now().setZone(COSEC_TIMEZONE);
}

export function toIst(date: Date | DateTime): DateTime {
  const dt = date instanceof Date ? DateTime.fromJSDate(date) : date;
  return dt.setZone(COSEC_TIMEZONE);
}

/** DDMMYYYY, for the attendance-daily `date-range` query parameter. */
export function formatCosecDate(date: Date | DateTime): string {
  return toIst(date).toFormat(DATE_RANGE_FMT);
}

/** DDMMYYYYHHMMSS, for the event-ta-date `date-range` query parameter. */
export function formatCosecDateTime(date: Date | DateTime): string {
  return toIst(date).toFormat(DATETIME_RANGE_FMT);
}

export function formatAttendanceDateRange(from: Date | DateTime, to: Date | DateTime): string {
  return `${formatCosecDate(from)}-${formatCosecDate(to)}`;
}

export function formatEventDateRange(from: Date | DateTime, to: Date | DateTime): string {
  return `${formatCosecDateTime(from)}-${formatCosecDateTime(to)}`;
}

export function dayBoundsIst(date: Date | DateTime): { start: DateTime; end: DateTime } {
  const d = toIst(date);
  return { start: d.startOf("day"), end: d.endOf("day") };
}

/** Parses "14/08/2026" (DD/MM/YYYY) as used by ProcessDate. Never relies on locale parsing. */
export function parseCosecDate(text: string | null | undefined): DateTime | null {
  const trimmed = text?.trim();
  if (!trimmed) return null;
  const dt = DateTime.fromFormat(trimmed, DATE_DISPLAY_FMT, { zone: COSEC_TIMEZONE });
  return dt.isValid ? dt : null;
}

/** Parses "14/08/2026 08:24:36" (DD/MM/YYYY HH:mm:ss) as used by Punch1/Punch2/EventDateTime. */
export function parseCosecDateTime(text: string | null | undefined): DateTime | null {
  const trimmed = text?.trim();
  if (!trimmed) return null;
  const dt = DateTime.fromFormat(trimmed, DATETIME_DISPLAY_FMT, { zone: COSEC_TIMEZONE });
  return dt.isValid ? dt : null;
}

/** Parses "08/14/2026 10:11:11" (MM/DD/YYYY HH:mm:ss) — IDateTime only. */
export function parseCosecIDateTime(text: string | null | undefined): DateTime | null {
  const trimmed = text?.trim();
  if (!trimmed) return null;
  const dt = DateTime.fromFormat(trimmed, IDATETIME_DISPLAY_FMT, { zone: COSEC_TIMEZONE });
  return dt.isValid ? dt : null;
}

/**
 * A calendar date (no time-of-day) has no timezone of its own. Building the
 * JS Date at UTC midnight for the resolved Y/M/D — rather than converting
 * the IST-zoned instant with .toJSDate() — keeps the stored date-only
 * Postgres column immune to any local/UTC offset shifting it by a day.
 */
export function toUtcDateOnly(dt: DateTime): Date {
  return new Date(Date.UTC(dt.year, dt.month - 1, dt.day));
}

/** Parses a "YYYY-MM-DD" API query param into the same UTC-midnight representation used for storage. */
export function parseIsoDateOnly(text: string | null | undefined): Date | null {
  const trimmed = text?.trim();
  if (!trimmed) return null;
  const dt = DateTime.fromFormat(trimmed, "yyyy-MM-dd", { zone: "utc" });
  return dt.isValid ? dt.toJSDate() : null;
}

/**
 * Parses a "YYYY-MM-DD" API query param as the start of that calendar day in
 * Asia/Kolkata — NOT the same as parseIsoDateOnly(), which anchors to UTC
 * midnight (05:30 IST) and is only correct for date-only column comparisons.
 * Use this pair for filtering/querying DATETIME columns (eventDateTime,
 * punchIn, etc.) by calendar day, so "from === to" still covers the whole
 * IST day instead of collapsing to a single instant.
 */
export function parseIsoDateAsIstStartOfDay(text: string | null | undefined): Date | null {
  const trimmed = text?.trim();
  if (!trimmed) return null;
  const dt = DateTime.fromFormat(trimmed, "yyyy-MM-dd", { zone: COSEC_TIMEZONE }).startOf("day");
  return dt.isValid ? dt.toJSDate() : null;
}

/** End-of-day (23:59:59.999 IST) counterpart to parseIsoDateAsIstStartOfDay(). */
export function parseIsoDateAsIstEndOfDay(text: string | null | undefined): Date | null {
  const trimmed = text?.trim();
  if (!trimmed) return null;
  const dt = DateTime.fromFormat(trimmed, "yyyy-MM-dd", { zone: COSEC_TIMEZONE }).endOf("day");
  return dt.isValid ? dt.toJSDate() : null;
}

export interface DateRange {
  from: DateTime;
  to: DateTime;
}

export function rangeToday(): DateRange {
  const today = nowInIst().startOf("day");
  return { from: today, to: today };
}

export function rangeYesterday(): DateRange {
  const yesterday = nowInIst().minus({ days: 1 }).startOf("day");
  return { from: yesterday, to: yesterday };
}

export function rangeThisWeek(): DateRange {
  const now = nowInIst();
  return { from: now.startOf("week"), to: now.startOf("day") };
}

export function rangeThisMonth(): DateRange {
  const now = nowInIst();
  return { from: now.startOf("month"), to: now.startOf("day") };
}
