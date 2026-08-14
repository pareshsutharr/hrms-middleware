import type { NextRequest } from "next/server";
import { z } from "zod";
import { requireAgentAuth } from "@/lib/agent-auth";
import { apiSuccess, apiError } from "@/lib/api-response";
import { ingestAttendanceDailyRaw } from "@/lib/sync/attendance";
import { ingestEventsRaw } from "@/lib/sync/events";
import { isFrappeConfigured } from "@/lib/frappe/config";
import { syncTodaysCheckinsToFrappe } from "@/lib/frappe/checkin";
import { logger } from "@/lib/logger";
import { SyncSource, SyncStatus } from "@/lib/generated/prisma/client";

const bodySchema = z.object({
  type: z.enum(["attendance-daily", "event-ta-date", "event-ta"]),
  rawResponse: z.string(),
});

export async function POST(req: NextRequest) {
  const { authorized, unauthorized } = requireAgentAuth(req);
  if (!authorized) return unauthorized;

  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return apiError("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Invalid request body", 400);
  }

  const { type, rawResponse } = parsed.data;

  const summary =
    type === "attendance-daily"
      ? await ingestAttendanceDailyRaw(rawResponse)
      : type === "event-ta-date"
        ? await ingestEventsRaw(rawResponse, SyncSource.EVENT_TA_DATE)
        : await ingestEventsRaw(rawResponse, SyncSource.EVENT_TA);

  if (summary.status === SyncStatus.FAILED) {
    return apiError("SYNC_FAILED", summary.errorMessage ?? "Agent-relayed sync failed", 502);
  }

  // Auto-push today's checkins to Frappe right after new event data lands —
  // best-effort: its own errors land in FrappeSyncLog, never in this response.
  if ((type === "event-ta-date" || type === "event-ta") && (await isFrappeConfigured())) {
    try {
      await syncTodaysCheckinsToFrappe();
    } catch (err) {
      logger.error("frappe.checkin_sync.auto_push_failed", {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return apiSuccess(summary);
}
