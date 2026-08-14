import type { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/api-response";
import { requireApiSession } from "@/lib/require-api-session";
import { syncEventsBodySchema } from "@/lib/validation";
import { parseIsoDateAsIstStartOfDay, parseIsoDateAsIstEndOfDay } from "@/lib/cosec/dates";
import { syncEventsForRange, syncAllEvents } from "@/lib/sync/events";

export async function POST(req: NextRequest) {
  const { session, unauthorized } = await requireApiSession();
  if (!session) return unauthorized;

  const body = await req.json().catch(() => null);
  const parsed = syncEventsBodySchema.safeParse(body);
  if (!parsed.success) {
    return apiError("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Invalid request body", 400);
  }

  if (parsed.data.mode === "full") {
    const summary = await syncAllEvents();
    if (summary.status === "FAILED") {
      return apiError("SYNC_FAILED", summary.errorMessage ?? "Full event sync failed", 502);
    }
    return apiSuccess(summary);
  }

  const from = parseIsoDateAsIstStartOfDay(parsed.data.from);
  const to = parseIsoDateAsIstEndOfDay(parsed.data.to);
  if (!from || !to) {
    return apiError("VALIDATION_ERROR", "Invalid date range", 400);
  }

  const summary = await syncEventsForRange(from, to);
  if (summary.status === "FAILED") {
    return apiError("SYNC_FAILED", summary.errorMessage ?? "Event sync failed", 502);
  }

  return apiSuccess(summary);
}
