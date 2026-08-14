import type { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/api-response";
import { requireApiSession } from "@/lib/require-api-session";
import { paginationQuerySchema } from "@/lib/validation";
import { queryEmployees } from "@/lib/queries/employees";

export async function GET(req: NextRequest) {
  const { session, unauthorized } = await requireApiSession();
  if (!session) return unauthorized;

  const query = Object.fromEntries(req.nextUrl.searchParams);
  const parsed = paginationQuerySchema.safeParse(query);
  if (!parsed.success) {
    return apiError("VALIDATION_ERROR", "Invalid query", 400);
  }
  const { page, pageSize } = parsed.data;
  const search = typeof query.search === "string" ? query.search : undefined;

  const { employees, count } = await queryEmployees({ search, page, pageSize });

  return apiSuccess(employees, { count, page, pageSize, totalPages: Math.ceil(count / pageSize) });
}
