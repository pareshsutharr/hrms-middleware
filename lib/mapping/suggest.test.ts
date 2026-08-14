import { describe, expect, it } from "vitest";
import { suggestFrappeMatch } from "./suggest";

// Real (anonymization-free) candidate shape from the connected Frappe instance.
const CANDIDATES = [
  { id: "HR-EMP-00021", name: "RAKESH DOSHI" },
  { id: "HR-EMP-00027", name: "DINESH CHAURASIA" },
  { id: "HR-EMP-00034", name: "KUSHBU GAYAKWAD" },
  { id: "HR-EMP-00030", name: "JIGAR PADHIYAR" },
];

describe("suggestFrappeMatch", () => {
  it("suggests the best real-world match despite spelling differences", () => {
    const suggestion = suggestFrappeMatch("DINESH CHOURASIA", CANDIDATES);
    expect(suggestion?.employeeId).toBe("HR-EMP-00027");
  });

  it("suggests the right match among several similarly-shaped names", () => {
    const suggestion = suggestFrappeMatch("KHUSHBU GAIKWAD", CANDIDATES);
    expect(suggestion?.employeeId).toBe("HR-EMP-00034");
  });

  it("suggests the right match despite an extra token and middle initial", () => {
    const suggestion = suggestFrappeMatch("JIGARKUMAR J PADHIYAR", CANDIDATES);
    expect(suggestion?.employeeId).toBe("HR-EMP-00030");
  });

  it("returns null when nothing is a good enough match", () => {
    expect(suggestFrappeMatch("COMPLETELY DIFFERENT NAME", CANDIDATES)).toBeNull();
  });

  it("returns null for an empty candidate list", () => {
    expect(suggestFrappeMatch("ANYONE", [])).toBeNull();
  });
});
