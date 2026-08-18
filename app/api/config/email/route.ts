import type { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/api-response";
import { requireApiSession } from "@/lib/require-api-session";
import { getEffectiveEmailConfig, saveEmailConfigOverride } from "@/lib/email/config";
import { emailConfigBodySchema } from "@/lib/validation";

export async function GET() {
  const { session, unauthorized } = await requireApiSession();
  if (!session) return unauthorized;

  const config = await getEffectiveEmailConfig();
  return apiSuccess(config);
}

export async function POST(req: NextRequest) {
  const { session, unauthorized } = await requireApiSession();
  if (!session) return unauthorized;

  const body = await req.json().catch(() => null);
  const parsed = emailConfigBodySchema.safeParse(body);
  if (!parsed.success) {
    return apiError("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Invalid request body", 400);
  }

  await saveEmailConfigOverride(parsed.data);
  return apiSuccess({ saved: true });
}
