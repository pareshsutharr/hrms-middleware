import { apiSuccess } from "@/lib/api-response";
import { requireApiSession } from "@/lib/require-api-session";
import { getCosecClient } from "@/lib/cosec/config";

export async function GET() {
  const { session, unauthorized } = await requireApiSession();
  if (!session) return unauthorized;

  const client = await getCosecClient();
  const result = await client.testConnection();
  return apiSuccess(result);
}
