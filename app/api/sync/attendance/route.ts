import type { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/api-response";
import { requireApiSession } from "@/lib/require-api-session";
import { syncAttendanceBodySchema } from "@/lib/validation";
import { parseIsoDateOnly } from "@/lib/cosec/dates";
import { syncAttendanceDaily } from "@/lib/sync/attendance";

export async function POST(req: NextRequest) {
  const { session, unauthorized } = await requireApiSession();
  if (!session) return unauthorized;

  const body = await req.json().catch(() => null);
  const parsed = syncAttendanceBodySchema.safeParse(body);
  if (!parsed.success) {
    return apiError("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Invalid request body", 400);
  }

  const from = parseIsoDateOnly(parsed.data.from);
  const to = parseIsoDateOnly(parsed.data.to);
  if (!from || !to) {
    return apiError("VALIDATION_ERROR", "Invalid date range", 400);
  }

  const summary = await syncAttendanceDaily(from, to);
  if (summary.status === "FAILED") {
    return apiError("SYNC_FAILED", summary.errorMessage ?? "Attendance sync failed", 502);
  }

  return apiSuccess(summary);
}
