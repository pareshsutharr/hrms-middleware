import type { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/api-response";
import { requireApiSession } from "@/lib/require-api-session";
import { sendMail } from "@/lib/email/mailer";
import { emailTestBodySchema } from "@/lib/validation";

export async function POST(req: NextRequest) {
  const { session, unauthorized } = await requireApiSession();
  if (!session) return unauthorized;

  const body = await req.json().catch(() => null);
  const parsed = emailTestBodySchema.safeParse(body);
  if (!parsed.success) {
    return apiError("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Invalid request body", 400);
  }

  if (!process.env.SMTP_HOST || !process.env.SMTP_PORT || !process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
    return apiError("NOT_CONFIGURED", "SMTP is not configured (SMTP_HOST/PORT/USER/PASSWORD env vars).", 400);
  }

  await sendMail({
    to: parsed.data.recipientEmail,
    subject: "[COSEC to Frappe] Test email",
    text: "This is a test email from the COSEC Attendance Dashboard's Email Alerts settings. If you received this, delivery is working.",
  });

  return apiSuccess({ sent: true });
}
