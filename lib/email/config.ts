import { db } from "@/lib/db";

export const EMAIL_ALERT_FREQUENCIES = ["every", "changes_and_failures", "failures_only", "off"] as const;
export type EmailAlertFrequency = (typeof EMAIL_ALERT_FREQUENCIES)[number];

const SETTING_KEYS = {
  recipientEmail: "email.recipientEmail",
  frequency: "email.frequency",
} as const;

type ConfigSource = "override" | "env";
type FrequencySource = "override" | "default";

export interface EmailEffectiveConfig {
  recipientEmail: string;
  recipientEmailSource: ConfigSource;
  frequency: EmailAlertFrequency;
  frequencySource: FrequencySource;
}

function isValidFrequency(value: string): value is EmailAlertFrequency {
  return (EMAIL_ALERT_FREQUENCIES as readonly string[]).includes(value);
}

export async function getEffectiveEmailConfig(): Promise<EmailEffectiveConfig> {
  const rows = await db.systemSetting.findMany({
    where: { key: { in: Object.values(SETTING_KEYS) } },
  });
  const overrides = new Map(rows.map((r) => [r.key, r.value]));

  const recipientOverride = overrides.get(SETTING_KEYS.recipientEmail);
  const frequencyOverride = overrides.get(SETTING_KEYS.frequency);

  return {
    recipientEmail: recipientOverride ?? process.env.ALERT_EMAIL_TO ?? "",
    recipientEmailSource: recipientOverride !== undefined ? "override" : "env",
    frequency: frequencyOverride && isValidFrequency(frequencyOverride) ? frequencyOverride : "every",
    frequencySource: frequencyOverride ? "override" : "default",
  };
}

export interface EmailConfigOverrideInput {
  /** Empty string is a valid, meaningful value here — it means "no recipient, alerts effectively off". */
  recipientEmail?: string;
  frequency?: EmailAlertFrequency;
}

export async function saveEmailConfigOverride(input: EmailConfigOverrideInput): Promise<void> {
  const ops = [];

  if (input.recipientEmail !== undefined) {
    ops.push(
      db.systemSetting.upsert({
        where: { key: SETTING_KEYS.recipientEmail },
        create: { key: SETTING_KEYS.recipientEmail, value: input.recipientEmail },
        update: { value: input.recipientEmail },
      })
    );
  }

  if (input.frequency !== undefined) {
    ops.push(
      db.systemSetting.upsert({
        where: { key: SETTING_KEYS.frequency },
        create: { key: SETTING_KEYS.frequency, value: input.frequency },
        update: { value: input.frequency },
      })
    );
  }

  if (ops.length > 0) {
    await db.$transaction(ops);
  }
}
