import { apiError } from "@/lib/api-response";
import { safeEqual } from "@/lib/agent-auth";

/**
 * Vercel sends `Authorization: Bearer <CRON_SECRET>` automatically on
 * cron-triggered requests when CRON_SECRET is set as a project env var —
 * https://vercel.com/docs/cron-jobs/manage-cron-jobs#securing-cron-jobs
 */
export function requireCronAuth(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return {
      authorized: false as const,
      unauthorized: apiError("CRON_NOT_CONFIGURED", "CRON_SECRET is not configured on the server.", 501),
    };
  }

  const header = req.headers.get("authorization");
  const provided = header?.startsWith("Bearer ") ? header.slice("Bearer ".length) : null;

  if (!provided || !safeEqual(provided, secret)) {
    return {
      authorized: false as const,
      unauthorized: apiError("UNAUTHORIZED", "Invalid or missing cron credentials.", 401),
    };
  }

  return { authorized: true as const, unauthorized: null };
}
