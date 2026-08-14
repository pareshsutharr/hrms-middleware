import { db } from "@/lib/db";
import { decryptSecret, encryptSecret } from "@/lib/crypto";
import { FrappeClient } from "./client";

const SETTING_KEYS = {
  baseUrl: "frappe.baseUrl",
  apiKey: "frappe.apiKey",
  apiSecret: "frappe.apiSecret",
} as const;

type ConfigSource = "override" | "env";

export interface FrappeEffectiveConfig {
  baseUrl: string;
  apiKey: string;
  apiSecret: string;
  baseUrlSource: ConfigSource;
  apiKeySource: ConfigSource;
  apiSecretSource: ConfigSource;
}

export async function getEffectiveFrappeConfig(): Promise<FrappeEffectiveConfig> {
  const rows = await db.systemSetting.findMany({
    where: { key: { in: Object.values(SETTING_KEYS) } },
  });
  const overrides = new Map(rows.map((r) => [r.key, r.value]));

  const baseUrlOverride = overrides.get(SETTING_KEYS.baseUrl);
  const apiKeyOverride = overrides.get(SETTING_KEYS.apiKey);
  const apiSecretOverrideEncrypted = overrides.get(SETTING_KEYS.apiSecret);

  return {
    baseUrl: baseUrlOverride || process.env.FRAPPE_BASE_URL || "",
    apiKey: apiKeyOverride || process.env.FRAPPE_API_KEY || "",
    apiSecret: apiSecretOverrideEncrypted
      ? decryptSecret(apiSecretOverrideEncrypted)
      : process.env.FRAPPE_API_SECRET || "",
    baseUrlSource: baseUrlOverride ? "override" : "env",
    apiKeySource: apiKeyOverride ? "override" : "env",
    apiSecretSource: apiSecretOverrideEncrypted ? "override" : "env",
  };
}

export async function isFrappeConfigured(): Promise<boolean> {
  const config = await getEffectiveFrappeConfig();
  return Boolean(config.baseUrl && config.apiKey && config.apiSecret);
}

export interface FrappeConfigOverrideInput {
  baseUrl?: string;
  apiKey?: string;
  /** Empty/omitted means "leave the stored secret unchanged" — the UI never round-trips the real value. */
  apiSecret?: string;
}

export async function saveFrappeConfigOverride(input: FrappeConfigOverrideInput): Promise<void> {
  const ops = [];

  if (input.baseUrl !== undefined) {
    ops.push(
      db.systemSetting.upsert({
        where: { key: SETTING_KEYS.baseUrl },
        create: { key: SETTING_KEYS.baseUrl, value: input.baseUrl },
        update: { value: input.baseUrl },
      })
    );
  }

  if (input.apiKey !== undefined) {
    ops.push(
      db.systemSetting.upsert({
        where: { key: SETTING_KEYS.apiKey },
        create: { key: SETTING_KEYS.apiKey, value: input.apiKey },
        update: { value: input.apiKey },
      })
    );
  }

  if (input.apiSecret) {
    const encrypted = encryptSecret(input.apiSecret);
    ops.push(
      db.systemSetting.upsert({
        where: { key: SETTING_KEYS.apiSecret },
        create: { key: SETTING_KEYS.apiSecret, value: encrypted },
        update: { value: encrypted },
      })
    );
  }

  if (ops.length > 0) {
    await db.$transaction(ops);
  }
}

export async function getFrappeClient(): Promise<FrappeClient> {
  const config = await getEffectiveFrappeConfig();
  return new FrappeClient({ baseUrl: config.baseUrl, apiKey: config.apiKey, apiSecret: config.apiSecret });
}
