import { requireAgentAuth } from "@/lib/agent-auth";
import { apiSuccess } from "@/lib/api-response";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  const { authorized, unauthorized } = requireAgentAuth(req);
  if (!authorized) return unauthorized;

  const now = new Date().toISOString();
  await db.systemSetting.upsert({
    where: { key: "agent.lastHeartbeat" },
    create: { key: "agent.lastHeartbeat", value: now },
    update: { value: now },
  });

  return apiSuccess({ acknowledged: true, serverTime: now });
}
