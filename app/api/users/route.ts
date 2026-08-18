import type { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { apiSuccess, apiError } from "@/lib/api-response";
import { requireApiSession } from "@/lib/require-api-session";
import { db } from "@/lib/db";
import { createUserBodySchema } from "@/lib/validation";

/** Any signed-in user can add another login — this dashboard has no role hierarchy beyond "has an account". */
export async function GET() {
  const { session, unauthorized } = await requireApiSession();
  if (!session) return unauthorized;

  const users = await db.user.findMany({
    select: { id: true, email: true, name: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });
  return apiSuccess({ users });
}

export async function POST(req: NextRequest) {
  const { session, unauthorized } = await requireApiSession();
  if (!session) return unauthorized;

  const body = await req.json().catch(() => null);
  const parsed = createUserBodySchema.safeParse(body);
  if (!parsed.success) {
    return apiError("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Invalid request body", 400);
  }
  const { email, password, name } = parsed.data;

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    return apiError("ALREADY_EXISTS", `A user with email ${email} already exists.`, 409);
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await db.user.create({
    data: { email, passwordHash, name: name ?? null },
    select: { id: true, email: true, name: true, createdAt: true },
  });

  return apiSuccess({ user }, undefined, 201);
}
