import nodemailer, { type Transporter } from "nodemailer";
import { logger } from "@/lib/logger";

let transporter: Transporter | null | undefined;

/** Built lazily so tests/builds without SMTP env vars set don't fail at import time. */
function getTransporter(): Transporter | null {
  if (transporter !== undefined) return transporter;

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD } = process.env;
  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASSWORD) {
    transporter = null;
    return transporter;
  }

  const port = Number(SMTP_PORT);
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port,
    secure: port === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASSWORD },
  });
  return transporter;
}

/**
 * Best-effort mail send — never throws. A notification failure must never
 * break the sync flow that triggered it (same principle as the Frappe push
 * itself being best-effort relative to the agent's own sync response).
 */
export async function sendMail(opts: { subject: string; text: string }): Promise<void> {
  const t = getTransporter();
  const to = process.env.ALERT_EMAIL_TO;
  if (!t || !to) return;

  try {
    await t.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to,
      subject: opts.subject,
      text: opts.text,
    });
  } catch (err) {
    logger.error("email.send_failed", { error: err instanceof Error ? err.message : String(err) });
  }
}
