import type { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/api-response";
import { requireApiSession } from "@/lib/require-api-session";
import { attendanceQuerySchema } from "@/lib/validation";
import { queryAttendanceRecords } from "@/lib/queries/attendance";

export async function GET(req: NextRequest) {
  const { session, unauthorized } = await requireApiSession();
  if (!session) return unauthorized;

  const parsed = attendanceQuerySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!parsed.success) {
    return apiError("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Invalid query", 400);
  }

  const { from, to, search, status, late, earlyOut, overtime, page, pageSize } = parsed.data;

  let result;
  try {
    result = await queryAttendanceRecords({
      from,
      to,
      search,
      status,
      late: Boolean(late),
      earlyOut: Boolean(earlyOut),
      overtime: Boolean(overtime),
      page,
      pageSize,
    });
  } catch {
    return apiError("VALIDATION_ERROR", "Invalid date range", 400);
  }

  const { records, count } = result;
  return apiSuccess(records, { from, to, count, page, pageSize, totalPages: Math.ceil(count / pageSize) });
}
