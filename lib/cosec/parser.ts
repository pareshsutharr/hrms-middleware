export interface MalformedRow {
  lineNumber: number;
  raw: string;
  reason: string;
}

export interface ParsedRow {
  raw: string;
  columns: string[];
}

export interface PipeParseResult {
  rows: ParsedRow[];
  malformed: MalformedRow[];
}

function stripBom(text: string): string {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

// Observed on the real server for a zero-result query, e.g.
// "success: 0040100000 : No records found" — a protocol status line, not a
// data row, so it must not count as a malformed row.
const STATUS_LINE_PATTERN = /^\s*(success|failed)\s*:\s*\S+\s*:/i;

/**
 * Parses COSEC's pipe-delimited text responses.
 *
 * Handles the quirks observed against the real API: a leading BOM, a
 * trailing <EOT> marker, blank lines between rows, a "success: CODE :
 * message" status line standing in for zero results, and rows with the
 * wrong column count (logged as malformed and skipped rather than thrown,
 * so one bad row never aborts a whole sync).
 */
export function parsePipeDelimited(raw: string, expectedColumns: number): PipeParseResult {
  const rows: ParsedRow[] = [];
  const malformed: MalformedRow[] = [];

  const cleaned = stripBom(raw ?? "").replace(/<EOT>/gi, "");
  const lines = cleaned.split(/\r\n|\r|\n/);

  lines.forEach((rawLine, index) => {
    const line = rawLine.trim();
    if (line.length === 0) return;
    if (STATUS_LINE_PATTERN.test(line)) return;

    const columns = line.split("|").map((c) => c.trim());
    if (columns.length !== expectedColumns) {
      malformed.push({
        lineNumber: index + 1,
        raw: rawLine,
        reason: `Expected ${expectedColumns} columns, got ${columns.length}`,
      });
      return;
    }

    rows.push({ raw: line, columns });
  });

  return { rows, malformed };
}

/**
 * COSEC's attendance-daily/event-ta(-date) responses include a leading
 * header row (e.g. "UserID|UserName|...") that isn't documented in the API
 * spec but does appear on the real server. It passes column-count
 * validation, so it must be dropped explicitly rather than left to fail
 * downstream field parsing.
 */
export function dropLeadingHeaderRow(rows: ParsedRow[], firstColumnHeader: string): ParsedRow[] {
  if (rows[0]?.columns[0]?.trim().toLowerCase() === firstColumnHeader.toLowerCase()) {
    return rows.slice(1);
  }
  return rows;
}
