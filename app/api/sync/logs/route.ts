import type { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/api-response";
import { requireApiSession } from "@/lib/require-api-session";
import { db } from "@/lib/db";
import { paginationQuerySchema } from "@/lib/validation";

export async function GET(req: NextRequest) {
  const { session, unauthorized } = await requireApiSession();
  if (!session) return unauthorized;

  const parsed = paginationQuerySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!parsed.success) {
    return apiError("VALIDATION_ERROR", "Invalid query", 400);
  }
  const { page, pageSize } = parsed.data;

  const [logs, count] = await Promise.all([
    db.cosecSyncLog.findMany({ orderBy: { startTime: "desc" }, skip: (page - 1) * pageSize, take: pageSize }),
    db.cosecSyncLog.count(),
  ]);

  return apiSuccess(logs, { count, page, pageSize, totalPages: Math.ceil(count / pageSize) });
}
