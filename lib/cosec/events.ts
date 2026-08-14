import { parsePipeDelimited, dropLeadingHeaderRow, type MalformedRow } from "./parser";
import { logger } from "@/lib/logger";

// IndexNo|UserID|UserName|EventDateTime|EntryExitType|MasterControllerID|DoorControllerID|SpecialFunctionID|LeaveDT|IDateTime
const EXPECTED_COLUMNS = 10;

export interface RawEventRow {
  indexNo: string;
  userId: string;
  userName: string;
  eventDateTime: string;
  entryExitType: string;
  masterControllerId: string;
  doorControllerId: string;
  specialFunctionId: string;
  leaveDT: string;
  idatetime: string;
  raw: string;
}

export interface ParseEventResult {
  rows: RawEventRow[];
  malformed: MalformedRow[];
}

export function parseEventTA(raw: string): ParseEventResult {
  const { rows: parsedRows, malformed } = parsePipeDelimited(raw, EXPECTED_COLUMNS);
  const rows = dropLeadingHeaderRow(parsedRows, "IndexNo");

  const parsed: RawEventRow[] = rows.map(({ raw: rawLine, columns }) => ({
    indexNo: columns[0],
    userId: columns[1],
    userName: columns[2],
    eventDateTime: columns[3],
    entryExitType: columns[4],
    masterControllerId: columns[5],
    doorControllerId: columns[6],
    specialFunctionId: columns[7],
    leaveDT: columns[8],
    idatetime: columns[9],
    raw: rawLine,
  }));

  if (malformed.length > 0) {
    logger.warn("cosec.events.malformed_rows", {
      count: malformed.length,
      samples: malformed.slice(0, 5),
    });
  }

  return { rows: parsed, malformed };
}
