import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiSuccess, apiError } from "@/lib/api-response";
import { requireApiSession } from "@/lib/require-api-session";
import { isoDateSchema } from "@/lib/validation";
import { parseIsoDateAsIstStartOfDay, parseIsoDateAsIstEndOfDay } from "@/lib/cosec/dates";
import { syncCheckinsToFrappe } from "@/lib/frappe/checkin";
import { SyncStatus } from "@/lib/generated/prisma/client";

const bodySchema = z.object({ from: isoDateSchema, to: isoDateSchema });

export async function POST(req: NextRequest) {
  const { session, unauthorized } = await requireApiSession();
  if (!session) return unauthorized;

  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return apiError("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Invalid request body", 400);
  }

  const from = parseIsoDateAsIstStartOfDay(parsed.data.from);
  const to = parseIsoDateAsIstEndOfDay(parsed.data.to);
  if (!from || !to) {
    return apiError("VALIDATION_ERROR", "Invalid date range", 400);
  }

  const summary = await syncCheckinsToFrappe(from, to);
  if (summary.status === SyncStatus.FAILED) {
    return apiError("SYNC_FAILED", summary.errorMessage ?? "Frappe checkin sync failed", 502);
  }

  return apiSuccess(summary);
}
