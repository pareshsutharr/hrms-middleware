import { DateTime } from "luxon";
import { describe, expect, it } from "vitest";
import {
  COSEC_TIMEZONE,
  dayBoundsIst,
  formatAttendanceDateRange,
  formatEventDateRange,
  parseCosecDate,
  parseCosecDateTime,
  parseCosecIDateTime,
  parseIsoDateAsIstStartOfDay,
  parseIsoDateAsIstEndOfDay,
  parseIsoDateOnly,
} from "./dates";

const AUG_14_2026 = DateTime.fromObject({ year: 2026, month: 8, day: 14 }, { zone: COSEC_TIMEZONE });

describe("date-range formatting", () => {
  it("formats an attendance-daily range as DDMMYYYY-DDMMYYYY", () => {
    expect(formatAttendanceDateRange(AUG_14_2026, AUG_14_2026)).toBe("14082026-14082026");
  });

  it("formats an event-ta-date range as DDMMYYYYHHMMSS-DDMMYYYYHHMMSS for a full day", () => {
    const { start, end } = dayBoundsIst(AUG_14_2026);
    expect(formatEventDateRange(start, end)).toBe("14082026000000-14082026235959");
  });
});

describe("COSEC timestamp parsing", () => {
  it("parses ProcessDate as DD/MM/YYYY", () => {
    const dt = parseCosecDate("14/08/2026");
    expect(dt?.year).toBe(2026);
    expect(dt?.month).toBe(8);
    expect(dt?.day).toBe(14);
  });

  it("parses Punch1/EventDateTime as DD/MM/YYYY HH:mm:ss", () => {
    const dt = parseCosecDateTime("14/08/2026 09:55:12");
    expect(dt?.toFormat("yyyy-MM-dd HH:mm:ss")).toBe("2026-08-14 09:55:12");
  });

  it("parses IDateTime as MM/DD/YYYY HH:mm:ss (the one US-order column)", () => {
    const dt = parseCosecIDateTime("08/14/2026 10:11:12");
    expect(dt?.toFormat("yyyy-MM-dd HH:mm:ss")).toBe("2026-08-14 10:11:12");
  });

  it("agrees with EventDateTime on the same real event despite the differing column order", () => {
    const eventDateTime = parseCosecDateTime("14/08/2026 09:55:12");
    const idatetime = parseCosecIDateTime("08/14/2026 10:11:12");
    expect(eventDateTime?.toISODate()).toBe(idatetime?.toISODate());
  });

  it("returns null instead of throwing for empty or malformed input", () => {
    expect(parseCosecDate("")).toBeNull();
    expect(parseCosecDate(undefined)).toBeNull();
    expect(parseCosecDateTime("not-a-date")).toBeNull();
    expect(parseCosecIDateTime("14/08/2026 09:55:12")).toBeNull(); // wrong order for this parser
  });
});

describe("IST day-boundary parsing (for DATETIME range queries/syncs)", () => {
  it("start-of-day is midnight IST, not midnight UTC", () => {
    const start = parseIsoDateAsIstStartOfDay("2026-08-14");
    expect(start).not.toBeNull();
    expect(DateTime.fromJSDate(start as Date).setZone(COSEC_TIMEZONE).toFormat("yyyy-MM-dd HH:mm:ss")).toBe(
      "2026-08-14 00:00:00"
    );
  });

  it("end-of-day is 23:59:59.999 IST", () => {
    const end = parseIsoDateAsIstEndOfDay("2026-08-14");
    expect(end).not.toBeNull();
    const dt = DateTime.fromJSDate(end as Date).setZone(COSEC_TIMEZONE);
    expect(dt.toFormat("yyyy-MM-dd HH:mm:ss")).toBe("2026-08-14 23:59:59");
  });

  it("gives a full 24h window even when from === to (the bug this guards against)", () => {
    const start = parseIsoDateAsIstStartOfDay("2026-08-14") as Date;
    const end = parseIsoDateAsIstEndOfDay("2026-08-14") as Date;
    const spanHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    expect(spanHours).toBeGreaterThan(23.9);
    expect(spanHours).toBeLessThanOrEqual(24);
  });

  it("differs from parseIsoDateOnly's UTC-midnight anchor (which is 05:30 IST, not midnight IST)", () => {
    const utcMidnight = parseIsoDateOnly("2026-08-14") as Date;
    const istMidnight = parseIsoDateAsIstStartOfDay("2026-08-14") as Date;
    expect(utcMidnight.getTime()).not.toBe(istMidnight.getTime());
  });
});
