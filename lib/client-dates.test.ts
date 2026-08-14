import { describe, expect, it, vi, afterEach } from "vitest";
import { istToday, istDaysAgo, istStartOfWeek, istStartOfMonth } from "./client-dates";

describe("client-dates (IST-anchored, no server-only deps)", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("istToday returns the IST calendar date even right after UTC midnight", () => {
    // 2026-08-14T00:10:00Z is still 2026-08-13 in UTC terms of "yesterday vs today"
    // relative to naive UTC slicing, but it's 05:40 IST on 2026-08-14.
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-14T00:10:00.000Z"));
    expect(istToday()).toBe("2026-08-14");
  });

  it("istToday does not regress to the UTC date during the pre-05:30-IST window", () => {
    // 2026-08-13T20:00:00Z = 2026-08-14T01:30 IST — already "tomorrow" in IST.
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-13T20:00:00.000Z"));
    expect(istToday()).toBe("2026-08-14");
  });

  it("istDaysAgo subtracts whole IST calendar days", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-14T10:00:00.000Z")); // well within IST Aug 14
    expect(istDaysAgo(1)).toBe("2026-08-13");
    expect(istDaysAgo(0)).toBe(istToday());
  });

  it("istStartOfWeek returns a Monday on or before today", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-14T10:00:00.000Z")); // Friday
    expect(istStartOfWeek()).toBe("2026-08-10"); // the preceding Monday
  });

  it("istStartOfMonth returns the 1st of the current IST month", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-14T10:00:00.000Z"));
    expect(istStartOfMonth()).toBe("2026-08-01");
  });
});
