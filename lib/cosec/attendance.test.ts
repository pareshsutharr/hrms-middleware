import { describe, expect, it } from "vitest";
import { parseAttendanceDaily } from "./attendance";
import { ATTENDANCE_DAILY_SAMPLE_RAW } from "./__fixtures__/samples";

describe("parseAttendanceDaily", () => {
  it("parses every row of the real sample response, dropping the undocumented header row", () => {
    const { rows, malformed } = parseAttendanceDaily(ATTENDANCE_DAILY_SAMPLE_RAW);
    expect(malformed).toHaveLength(0);
    expect(rows).toHaveLength(6);
    expect(rows.every((r) => r.userId !== "UserID")).toBe(true);
  });

  it("maps columns in the documented order", () => {
    const { rows } = parseAttendanceDaily(ATTENDANCE_DAILY_SAMPLE_RAW);
    const paresh = rows.find((r) => r.userId === "JBV0016");
    expect(paresh).toBeDefined();
    expect(paresh?.userName).toBe("PARESH SUTHAR");
    expect(paresh?.processDate).toBe("14/08/2026");
    expect(paresh?.punch1).toBe("14/08/2026 09:55:12");
    expect(paresh?.punch2).toBe("");
    expect(paresh?.lateIn).toBe("0");
    expect(paresh?.earlyOut).toBe("0");
    expect(paresh?.overtime).toBe("0");
    expect(paresh?.workTime).toBe("0");
  });

  it("does not crash the whole batch when one row is malformed", () => {
    const raw = `${ATTENDANCE_DAILY_SAMPLE_RAW}\nJBV999|MISSING COLUMNS`;
    const { rows, malformed } = parseAttendanceDaily(raw);
    expect(rows).toHaveLength(6);
    expect(malformed).toHaveLength(1);
  });
});
