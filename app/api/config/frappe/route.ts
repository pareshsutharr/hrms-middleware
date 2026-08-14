import type { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/api-response";
import { requireApiSession } from "@/lib/require-api-session";
import { getEffectiveFrappeConfig, saveFrappeConfigOverride } from "@/lib/frappe/config";
import { frappeConfigBodySchema } from "@/lib/validation";

export async function GET() {
  const { session, unauthorized } = await requireApiSession();
  if (!session) return unauthorized;

  const config = await getEffectiveFrappeConfig();
  // API secret value never leaves the server — only whether one is set and where it comes from.
  return apiSuccess({
    baseUrl: config.baseUrl,
    baseUrlSource: config.baseUrlSource,
    apiKey: config.apiKey,
    apiKeySource: config.apiKeySource,
    apiSecretSet: Boolean(config.apiSecret),
    apiSecretSource: config.apiSecretSource,
  });
}

export async function POST(req: NextRequest) {
  const { session, unauthorized } = await requireApiSession();
  if (!session) return unauthorized;

  const body = await req.json().catch(() => null);
  const parsed = frappeConfigBodySchema.safeParse(body);
  if (!parsed.success) {
    return apiError("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Invalid request body", 400);
  }

  await saveFrappeConfigOverride(parsed.data);
  return apiSuccess({ saved: true });
}
