import { describe, expect, it } from "vitest";
import { parsePipeDelimited, dropLeadingHeaderRow } from "./parser";
import { COSEC_NO_RECORDS_RAW } from "./__fixtures__/samples";

describe("parsePipeDelimited", () => {
  it("parses well-formed rows", () => {
    const raw = "A|B|C\nD|E|F";
    const { rows, malformed } = parsePipeDelimited(raw, 3);
    expect(rows).toHaveLength(2);
    expect(rows[0].columns).toEqual(["A", "B", "C"]);
    expect(malformed).toHaveLength(0);
  });

  it("strips a leading BOM", () => {
    const raw = "﻿A|B|C";
    const { rows } = parsePipeDelimited(raw, 3);
    expect(rows[0].columns[0]).toBe("A");
  });

  it("strips trailing <EOT> markers", () => {
    const raw = "A|B|C\n<EOT>";
    const { rows } = parsePipeDelimited(raw, 3);
    expect(rows).toHaveLength(1);
  });

  it("skips blank lines", () => {
    const raw = "A|B|C\n\n\nD|E|F\n";
    const { rows } = parsePipeDelimited(raw, 3);
    expect(rows).toHaveLength(2);
  });

  it("trims whitespace around columns", () => {
    const raw = "  A  | B |C ";
    const { rows } = parsePipeDelimited(raw, 3);
    expect(rows[0].columns).toEqual(["A", "B", "C"]);
  });

  it("logs a malformed row instead of throwing when the column count is wrong", () => {
    const raw = "A|B|C\nD|E\nF|G|H";
    const { rows, malformed } = parsePipeDelimited(raw, 3);
    expect(rows).toHaveLength(2);
    expect(malformed).toHaveLength(1);
    expect(malformed[0].reason).toContain("Expected 3 columns, got 2");
    expect(malformed[0].raw).toBe("D|E");
  });

  it("handles an empty response body", () => {
    const { rows, malformed } = parsePipeDelimited("", 10);
    expect(rows).toHaveLength(0);
    expect(malformed).toHaveLength(0);
  });

  it("treats a 'success: CODE : message' status line as zero results, not a malformed row", () => {
    const { rows, malformed } = parsePipeDelimited(COSEC_NO_RECORDS_RAW, 10);
    expect(rows).toHaveLength(0);
    expect(malformed).toHaveLength(0);
  });
});

describe("dropLeadingHeaderRow", () => {
  it("drops a leading header row matching the given first-column name", () => {
    const { rows } = parsePipeDelimited("UserID|UserName\nJBV001|DINESH CHOURASIA", 2);
    expect(dropLeadingHeaderRow(rows, "UserID")).toHaveLength(1);
  });

  it("is case-insensitive", () => {
    const { rows } = parsePipeDelimited("userid|UserName\nJBV001|DINESH CHOURASIA", 2);
    expect(dropLeadingHeaderRow(rows, "UserID")).toHaveLength(1);
  });

  it("leaves rows untouched when there is no header row", () => {
    const { rows } = parsePipeDelimited("JBV001|DINESH CHOURASIA\nJBV002|X", 2);
    expect(dropLeadingHeaderRow(rows, "UserID")).toHaveLength(2);
  });

  it("does not touch an empty result set", () => {
    expect(dropLeadingHeaderRow([], "UserID")).toHaveLength(0);
  });
});
