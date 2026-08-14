import type { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/api-response";
import { requireApiSession } from "@/lib/require-api-session";
import { getEffectiveCosecConfig, saveCosecConfigOverride } from "@/lib/cosec/config";
import { cosecConfigBodySchema } from "@/lib/validation";

export async function GET() {
  const { session, unauthorized } = await requireApiSession();
  if (!session) return unauthorized;

  const config = await getEffectiveCosecConfig();
  // Password value never leaves the server — only whether one is set and where it comes from.
  return apiSuccess({
    baseUrl: config.baseUrl,
    baseUrlSource: config.baseUrlSource,
    username: config.username,
    usernameSource: config.usernameSource,
    passwordSet: Boolean(config.password),
    passwordSource: config.passwordSource,
  });
}

export async function POST(req: NextRequest) {
  const { session, unauthorized } = await requireApiSession();
  if (!session) return unauthorized;

  const body = await req.json().catch(() => null);
  const parsed = cosecConfigBodySchema.safeParse(body);
  if (!parsed.success) {
    return apiError("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Invalid request body", 400);
  }

  await saveCosecConfigOverride(parsed.data);
  return apiSuccess({ saved: true });
}
