import { describe, expect, it } from "vitest";
import { tokenSimilarity } from "./similarity";

describe("tokenSimilarity", () => {
  it("scores an exact match as 1", () => {
    expect(tokenSimilarity("PARESH SUTHAR", "PARESH SUTHAR")).toBe(1);
  });

  // Real name pairs observed between this COSEC device and this Frappe instance.
  it("is tolerant of a minor spelling difference (DINESH CHOURASIA / CHAURASIA)", () => {
    expect(tokenSimilarity("DINESH CHOURASIA", "DINESH CHAURASIA")).toBeGreaterThan(0.85);
  });

  it("is tolerant of two minor spelling differences (KHUSHBU GAIKWAD / KUSHBU GAYAKWAD)", () => {
    expect(tokenSimilarity("KHUSHBU GAIKWAD", "KUSHBU GAYAKWAD")).toBeGreaterThan(0.7);
  });

  it("ignores a stray middle initial and an extra token (JIGARKUMAR J PADHIYAR / JIGAR PADHIYAR)", () => {
    expect(tokenSimilarity("JIGARKUMAR J PADHIYAR", "JIGAR PADHIYAR")).toBeGreaterThan(0.85);
  });

  it("ignores a middle initial (YATIN R VANI / YATIN VANI)", () => {
    expect(tokenSimilarity("YATIN R VANI", "YATIN VANI")).toBe(1);
  });

  it("handles reordered tokens plus an extra name (DEEPALI DALAL / DALAL DEEPALI DENISH)", () => {
    expect(tokenSimilarity("DEEPALI DALAL", "DALAL DEEPALI DENISH")).toBe(1);
  });

  it("scores unrelated names low", () => {
    expect(tokenSimilarity("PARESH SUTHAR", "NIKUNJ PATEL")).toBeLessThan(0.3);
  });

  it("returns 0 for empty input", () => {
    expect(tokenSimilarity("", "SOMETHING")).toBe(0);
    expect(tokenSimilarity("SOMETHING", "")).toBe(0);
  });
});
