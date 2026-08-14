import type { NextRequest } from "next/server";
import { requireCronAuth } from "@/lib/cron-auth";
import { apiSuccess, apiError } from "@/lib/api-response";
import { isFrappeConfigured } from "@/lib/frappe/config";
import { syncCheckinsToFrappe } from "@/lib/frappe/checkin";
import { nowInIst } from "@/lib/cosec/dates";
import { SyncStatus } from "@/lib/generated/prisma/client";

/**
 * Daily safety-net push of COSEC checkins into Frappe — the primary trigger
 * is the agent's own auto-push after each sync cycle (see /api/agent/sync);
 * this exists in case the agent was offline for a stretch. Covers the last 3
 * IST days (not just today) so a missed day still gets caught; idempotent
 * (syncCheckinsToFrappe skips already-synced device_ids), so re-covering
 * days is cheap. Vercel Hobby plan only allows once-daily crons — see
 * README "Automatic Frappe push".
 */
const CATCH_UP_DAYS = 3;

export async function GET(req: NextRequest) {
  const { authorized, unauthorized } = requireCronAuth(req);
  if (!authorized) return unauthorized;

  if (!(await isFrappeConfigured())) {
    return apiSuccess({ skipped: true, reason: "Frappe is not configured" });
  }

  const now = nowInIst();
  const from = now.minus({ days: CATCH_UP_DAYS - 1 }).startOf("day").toJSDate();
  const to = now.endOf("day").toJSDate();

  const summary = await syncCheckinsToFrappe(from, to);
  if (summary.status === SyncStatus.FAILED) {
    return apiError("SYNC_FAILED", summary.errorMessage ?? "Frappe checkin sync failed", 502);
  }

  return apiSuccess(summary);
}
