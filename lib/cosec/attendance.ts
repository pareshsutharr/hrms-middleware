import { parsePipeDelimited, dropLeadingHeaderRow, type MalformedRow } from "./parser";
import { logger } from "@/lib/logger";

// UserID|UserName|ProcessDate|Punch1|Punch2|WorkingShift|LateIn|EarlyOut|Overtime|WorkTime
const EXPECTED_COLUMNS = 10;

export interface RawAttendanceRow {
  userId: string;
  userName: string;
  processDate: string;
  punch1: string;
  punch2: string;
  workingShift: string;
  lateIn: string;
  earlyOut: string;
  overtime: string;
  workTime: string;
  raw: string;
}

export interface ParseAttendanceResult {
  rows: RawAttendanceRow[];
  malformed: MalformedRow[];
}

export function parseAttendanceDaily(raw: string): ParseAttendanceResult {
  const { rows: parsedRows, malformed } = parsePipeDelimited(raw, EXPECTED_COLUMNS);
  const rows = dropLeadingHeaderRow(parsedRows, "UserID");

  const parsed: RawAttendanceRow[] = rows.map(({ raw: rawLine, columns }) => ({
    userId: columns[0],
    userName: columns[1],
    processDate: columns[2],
    punch1: columns[3],
    punch2: columns[4],
    workingShift: columns[5],
    lateIn: columns[6],
    earlyOut: columns[7],
    overtime: columns[8],
    workTime: columns[9],
    raw: rawLine,
  }));

  if (malformed.length > 0) {
    logger.warn("cosec.attendance.malformed_rows", {
      count: malformed.length,
      samples: malformed.slice(0, 5),
    });
  }

  return { rows: parsed, malformed };
}
