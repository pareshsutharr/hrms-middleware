import type { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/api-response";
import { requireApiSession } from "@/lib/require-api-session";
import { eventsQuerySchema } from "@/lib/validation";
import { queryEventRecords } from "@/lib/queries/events";

export async function GET(req: NextRequest) {
  const { session, unauthorized } = await requireApiSession();
  if (!session) return unauthorized;

  const parsed = eventsQuerySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!parsed.success) {
    return apiError("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Invalid query", 400);
  }

  const { from, to, userId, employee, entryExitType, page, pageSize } = parsed.data;

  let result;
  try {
    result = await queryEventRecords({ from, to, userId, employee, entryExitType, page, pageSize });
  } catch {
    return apiError("VALIDATION_ERROR", "Invalid date range", 400);
  }

  // BigInt indexNo can't be JSON-serialized as-is.
  const serialized = result.records.map((r) => ({ ...r, indexNo: r.indexNo.toString() }));

  return apiSuccess(serialized, {
    from,
    to,
    count: result.count,
    page,
    pageSize,
    totalPages: Math.ceil(result.count / pageSize),
  });
}
