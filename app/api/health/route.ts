import { apiSuccess } from "@/lib/api-response";
import { getSystemHealth } from "@/lib/health";

// Intentionally public (no session check) — health/uptime checks are commonly
// probed by infrastructure that isn't logged in, and nothing sensitive is returned.
export async function GET() {
  const health = await getSystemHealth();
  return apiSuccess(health);
}
