import { db } from "@/lib/db";
import { parseIsoDateAsIstStartOfDay, parseIsoDateAsIstEndOfDay } from "@/lib/cosec/dates";
import type { Prisma } from "@/lib/generated/prisma/client";

export interface EventsQueryParams {
  from: string;
  to: string;
  userId?: string;
  employee?: string;
  entryExitType?: number;
  page: number;
  pageSize: number;
}

export async function queryEventRecords(params: EventsQueryParams) {
  const fromDate = parseIsoDateAsIstStartOfDay(params.from);
  const toDate = parseIsoDateAsIstEndOfDay(params.to);
  if (!fromDate || !toDate) {
    throw new Error("Invalid date range");
  }

  const where: Prisma.EventRecordWhereInput = {
    eventDateTime: { gte: fromDate, lte: toDate },
    ...(params.userId ? { cosecUserId: params.userId } : {}),
    ...(params.employee ? { employeeName: { contains: params.employee, mode: "insensitive" } } : {}),
    ...(params.entryExitType !== undefined ? { entryExitType: params.entryExitType } : {}),
  };

  const [records, count] = await Promise.all([
    db.eventRecord.findMany({
      where,
      orderBy: { eventDateTime: "desc" },
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
    }),
    db.eventRecord.count({ where }),
  ]);

  return { records, count };
}
