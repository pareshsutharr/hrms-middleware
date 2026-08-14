import { db } from "@/lib/db";
import { getCosecClient } from "@/lib/cosec/config";
import { getFrappeClient, isFrappeConfigured } from "@/lib/frappe/config";

export interface ComponentHealth {
  status: "connected" | "error" | "not_configured";
  message?: string;
  latencyMs?: number;
}

export interface SystemHealth {
  database: ComponentHealth;
  cosec: ComponentHealth;
  frappe: ComponentHealth;
  agent: ComponentHealth;
}

export async function getSystemHealth(): Promise<SystemHealth> {
  const [database, cosec, frappe, agent] = await Promise.all([
    checkDatabase(),
    checkCosec(),
    checkFrappe(),
    checkAgent(),
  ]);
  return { database, cosec, frappe, agent };
}

async function checkDatabase(): Promise<ComponentHealth> {
  const start = Date.now();
  try {
    await db.$queryRaw`SELECT 1`;
    return { status: "connected", latencyMs: Date.now() - start };
  } catch (err) {
    return { status: "error", message: err instanceof Error ? err.message : "Unknown database error" };
  }
}

async function checkCosec(): Promise<ComponentHealth> {
  try {
    const client = await getCosecClient();
    const result = await client.testConnection();
    return {
      status: result.success ? "connected" : "error",
      message: result.message,
      latencyMs: result.latencyMs,
    };
  } catch (err) {
    return { status: "error", message: err instanceof Error ? err.message : "Unknown COSEC error" };
  }
}

// Matches the agent's default SYNC_INTERVAL_MINUTES (5) with a 2x buffer —
// the cloud app and the agent are separate deployables with separate .env
// files, so this is a fixed threshold rather than shared config.
const AGENT_STALE_AFTER_MS = 10 * 60 * 1000;

async function checkAgent(): Promise<ComponentHealth> {
  const setting = await db.systemSetting.findUnique({ where: { key: "agent.lastHeartbeat" } });
  if (!setting) {
    return { status: "not_configured", message: "No agent has reported in yet. See /agent/cosec-agent." };
  }

  const lastHeartbeat = new Date(setting.value);
  const ageMs = Date.now() - lastHeartbeat.getTime();
  if (ageMs > AGENT_STALE_AFTER_MS) {
    return {
      status: "error",
      message: `Agent hasn't reported in since ${lastHeartbeat.toISOString()}.`,
    };
  }

  return { status: "connected", message: `Last heartbeat ${Math.round(ageMs / 1000)}s ago.` };
}

async function checkFrappe(): Promise<ComponentHealth> {
  if (!(await isFrappeConfigured())) {
    return { status: "not_configured", message: "Set FRAPPE_BASE_URL/FRAPPE_API_KEY/FRAPPE_API_SECRET or fill in Settings > Frappe HRMS." };
  }
  try {
    const client = await getFrappeClient();
    const result = await client.testConnection();
    return {
      status: result.success ? "connected" : "error",
      message: result.message,
      latencyMs: result.latencyMs,
    };
  } catch (err) {
    return { status: "error", message: err instanceof Error ? err.message : "Unknown Frappe error" };
  }
}
