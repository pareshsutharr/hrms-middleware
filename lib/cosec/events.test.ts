import { describe, expect, it } from "vitest";
import { parseEventTA } from "./events";
import { EVENT_TA_DATE_SAMPLE_RAW, COSEC_NO_RECORDS_RAW } from "./__fixtures__/samples";

describe("parseEventTA", () => {
  it("parses every row of the real sample response", () => {
    const { rows, malformed } = parseEventTA(EVENT_TA_DATE_SAMPLE_RAW);
    expect(malformed).toHaveLength(0);
    expect(rows).toHaveLength(3);
  });

  it("maps columns in the documented order, including the empty LeaveDT column", () => {
    const { rows } = parseEventTA(EVENT_TA_DATE_SAMPLE_RAW);
    const paresh = rows.find((r) => r.userId === "JBV0016");
    expect(paresh).toBeDefined();
    expect(paresh?.indexNo).toBe("729304");
    expect(paresh?.userName).toBe("PARESH SUTHAR");
    expect(paresh?.eventDateTime).toBe("14/08/2026 09:55:12");
    expect(paresh?.entryExitType).toBe("0");
    expect(paresh?.leaveDT).toBe("");
    expect(paresh?.idatetime).toBe("08/14/2026 10:11:12");
  });

  it("treats a zero-result 'success:' status response as an empty, non-malformed result", () => {
    const { rows, malformed } = parseEventTA(COSEC_NO_RECORDS_RAW);
    expect(rows).toHaveLength(0);
    expect(malformed).toHaveLength(0);
  });
});
