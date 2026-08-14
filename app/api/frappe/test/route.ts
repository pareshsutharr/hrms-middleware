import { apiSuccess } from "@/lib/api-response";
import { requireApiSession } from "@/lib/require-api-session";
import { getFrappeClient, isFrappeConfigured } from "@/lib/frappe/config";

export async function GET() {
  const { session, unauthorized } = await requireApiSession();
  if (!session) return unauthorized;

  if (!(await isFrappeConfigured())) {
    return apiSuccess({
      success: false,
      message: "Frappe HRMS is not configured yet. Set FRAPPE_BASE_URL/FRAPPE_API_KEY/FRAPPE_API_SECRET or fill in Settings > Frappe HRMS.",
      latencyMs: 0,
    });
  }

  const client = await getFrappeClient();
  const result = await client.testConnection();
  return apiSuccess(result);
}
