/**
 * Client-safe (no Luxon, no server-only imports) IST date helpers for the
 * "Today"/"Yesterday"/"This Week"/"This Month" quick filters. Deliberately
 * does not use `new Date().toISOString().slice(0, 10)` for "today" — that
 * gives the UTC calendar date, which is wrong for roughly 5.5 hours a day
 * (midnight-05:30 IST) since it's still "yesterday" in UTC at that point.
 */

function istDateString(date: Date): string {
  // en-CA formats as YYYY-MM-DD.
  return date.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}

function istDateParts(date: Date): { year: number; month: number; day: number } {
  const [year, month, day] = istDateString(date).split("-").map(Number);
  return { year, month, day };
}

// A UTC-anchored Date built from the real IST calendar date — safe for
// calendar arithmetic (getUTCDay/setUTCDate) without timezone ambiguity,
// since it's never treated as a real instant, only as Y/M/D.
function calendarDate(date: Date): Date {
  const { year, month, day } = istDateParts(date);
  return new Date(Date.UTC(year, month - 1, day));
}

export function istToday(): string {
  return istDateString(new Date());
}

export function istDaysAgo(days: number): string {
  const d = calendarDate(new Date());
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

export function istStartOfWeek(): string {
  const d = calendarDate(new Date());
  const day = d.getUTCDay(); // 0 Sun - 6 Sat
  const diff = (day === 0 ? -6 : 1) - day; // back to Monday
  d.setUTCDate(d.getUTCDate() + diff);
  return d.toISOString().slice(0, 10);
}

export function istStartOfMonth(): string {
  const { year, month } = istDateParts(new Date());
  return new Date(Date.UTC(year, month - 1, 1)).toISOString().slice(0, 10);
}
