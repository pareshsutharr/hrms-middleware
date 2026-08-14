import { describe, expect, it } from "vitest";
import { calculateAttendanceStatus } from "./status";

describe("calculateAttendanceStatus", () => {
  it("is ABSENT when Punch1 is missing", () => {
    expect(calculateAttendanceStatus("", "")).toBe("ABSENT");
    expect(calculateAttendanceStatus(null, null)).toBe("ABSENT");
  });

  it("is INCOMPLETE when Punch1 exists but Punch2 does not", () => {
    expect(calculateAttendanceStatus("14/08/2026 09:55:12", "")).toBe("INCOMPLETE");
  });

  it("is PRESENT when both Punch1 and Punch2 exist", () => {
    expect(calculateAttendanceStatus("14/08/2026 09:55:12", "14/08/2026 18:30:00")).toBe("PRESENT");
  });
});
