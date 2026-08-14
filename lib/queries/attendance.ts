import { db } from "@/lib/db";
import { parseIsoDateOnly } from "@/lib/cosec/dates";
import type { AttendanceStatus, Prisma } from "@/lib/generated/prisma/client";

export interface AttendanceQueryParams {
  from: string;
  to: string;
  search?: string;
  status?: AttendanceStatus;
  late?: boolean;
  earlyOut?: boolean;
  overtime?: boolean;
  page: number;
  pageSize: number;
}

function nonZero(field: "lateIn" | "earlyOut" | "overtime"): Prisma.AttendanceRecordWhereInput {
  return { AND: [{ [field]: { not: null } }, { [field]: { not: "0" } }, { [field]: { not: "" } }] };
}

export async function queryAttendanceRecords(params: AttendanceQueryParams) {
  const fromDate = parseIsoDateOnly(params.from);
  const toDate = parseIsoDateOnly(params.to);
  if (!fromDate || !toDate) {
    throw new Error("Invalid date range");
  }

  const where: Prisma.AttendanceRecordWhereInput = {
    processDate: { gte: fromDate, lte: toDate },
    ...(params.status ? { status: params.status } : {}),
    ...(params.search
      ? {
          OR: [
            { employeeName: { contains: params.search, mode: "insensitive" } },
            { cosecUserId: { contains: params.search, mode: "insensitive" } },
          ],
        }
      : {}),
    ...(params.late ? nonZero("lateIn") : {}),
    ...(params.earlyOut ? nonZero("earlyOut") : {}),
    ...(params.overtime ? nonZero("overtime") : {}),
  };

  const [records, count] = await Promise.all([
    db.attendanceRecord.findMany({
      where,
      orderBy: [{ processDate: "desc" }, { employeeName: "asc" }],
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
    }),
    db.attendanceRecord.count({ where }),
  ]);

  return { records, count };
}
