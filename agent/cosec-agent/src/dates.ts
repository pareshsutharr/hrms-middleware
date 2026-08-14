/**
 * Thin, dependency-free IST date helpers for the agent — deliberately
 * duplicated from lib/cosec/dates.ts rather than imported, since the agent
 * is a separate deployable with no access to the Next.js app's node_modules
 * (see cosec-agent/README.md "Why this duplicates lib/cosec"). India has a
 * single fixed UTC+05:30 offset with no DST, so the offset math below is
 * exact, not an approximation.
 */

const COSEC_TIMEZONE = "Asia/Kolkata";
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

function istParts(date: Date) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: COSEC_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = Object.fromEntries(formatter.formatToParts(date).map((p) => [p.type, p.value]));
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    // Some locales report midnight as "24" with hour12: false.
    hour: parts.hour === "24" ? 0 : Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
  };
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** DDMMYYYY, for attendance-daily's date-range query parameter. */
export function formatCosecDate(date: Date): string {
  const { year, month, day } = istParts(date);
  return `${pad(day)}${pad(month)}${year}`;
}

/** DDMMYYYYHHMMSS, for event-ta-date's date-range query parameter. */
export function formatCosecDateTime(date: Date): string {
  const { year, month, day, hour, minute, second } = istParts(date);
  return `${pad(day)}${pad(month)}${year}${pad(hour)}${pad(minute)}${pad(second)}`;
}

export function formatAttendanceDateRange(from: Date, to: Date): string {
  return `${formatCosecDate(from)}-${formatCosecDate(to)}`;
}

export function formatEventDateRange(from: Date, to: Date): string {
  return `${formatCosecDateTime(from)}-${formatCosecDateTime(to)}`;
}

/** Today's IST calendar-day bounds (00:00:00 - 23:59:59 IST), as real UTC instants. */
export function todayIstBounds(): { start: Date; end: Date } {
  const { year, month, day } = istParts(new Date());
  const start = new Date(Date.UTC(year, month - 1, day) - IST_OFFSET_MS);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1000);
  return { start, end };
}
