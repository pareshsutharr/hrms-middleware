import { describe, expect, it } from "vitest";
import { assertCosecSuccess, detectCosecFailure, CosecError } from "./errors";
import { COSEC_AUTH_FAILURE_RAW } from "./__fixtures__/samples";

describe("detectCosecFailure", () => {
  it("detects the real 'API access denied' failure body under HTTP 200", () => {
    const failure = detectCosecFailure(COSEC_AUTH_FAILURE_RAW);
    expect(failure).toEqual({ code: "0000002001", message: "API access denied. username = HR" });
  });

  it("returns null for a successful pipe-delimited body", () => {
    expect(detectCosecFailure("JBV001|DINESH CHOURASIA|14/08/2026|...")).toBeNull();
  });

  it("returns null for an empty body", () => {
    expect(detectCosecFailure("")).toBeNull();
  });
});

describe("assertCosecSuccess", () => {
  it("throws a CosecError for a failure body even though HTTP status is 200", () => {
    expect(() => assertCosecSuccess(COSEC_AUTH_FAILURE_RAW, 200)).toThrow(CosecError);
    try {
      assertCosecSuccess(COSEC_AUTH_FAILURE_RAW, 200);
    } catch (err) {
      expect(err).toBeInstanceOf(CosecError);
      expect((err as CosecError).kind).toBe("API_ERROR");
      expect((err as CosecError).code).toBe("0000002001");
    }
  });

  it("does not throw for a successful body", () => {
    expect(() => assertCosecSuccess("JBV001|...", 200)).not.toThrow();
  });
});
