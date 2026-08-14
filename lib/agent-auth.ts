import crypto from "node:crypto";
import { apiError } from "@/lib/api-response";

export function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    // Still run a constant-time compare (against itself) so a length mismatch
    // doesn't short-circuit faster than a real comparison would.
    crypto.timingSafeEqual(bufA, bufA);
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Single shared-secret auth for /agent/cosec-agent's cloud endpoints — not a
 * dashboard session. `Authorization: Bearer <AGENT_SECRET>`, checked against
 * the AGENT_SECRET env var. This deployment has exactly one agent.
 */
export function requireAgentAuth(req: Request) {
  const secret = process.env.AGENT_SECRET;
  if (!secret) {
    return {
      authorized: false as const,
      unauthorized: apiError("AGENT_NOT_CONFIGURED", "AGENT_SECRET is not configured on the server.", 501),
    };
  }

  const header = req.headers.get("authorization");
  const provided = header?.startsWith("Bearer ") ? header.slice("Bearer ".length) : null;

  if (!provided || !safeEqual(provided, secret)) {
    return {
      authorized: false as const,
      unauthorized: apiError("UNAUTHORIZED", "Invalid or missing agent credentials.", 401),
    };
  }

  return { authorized: true as const, unauthorized: null };
}
