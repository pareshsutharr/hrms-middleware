import { auth } from "@/lib/auth";
import { apiError } from "@/lib/api-response";

/**
 * Proxy (proxy.ts) protects the dashboard pages, but per Next.js's own guidance a
 * matcher change can silently drop coverage — so every API route also checks the
 * session itself rather than relying on proxy alone.
 */
export async function requireApiSession() {
  const session = await auth();
  if (!session?.user) {
    return { session: null as null, unauthorized: apiError("UNAUTHORIZED", "Authentication required.", 401) };
  }
  return { session, unauthorized: null };
}
