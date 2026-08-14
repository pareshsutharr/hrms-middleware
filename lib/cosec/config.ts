import { db } from "@/lib/db";
import { decryptSecret, encryptSecret } from "@/lib/crypto";
import { CosecClient } from "./client";

const SETTING_KEYS = {
  baseUrl: "cosec.baseUrl",
  username: "cosec.username",
  password: "cosec.password",
} as const;

type ConfigSource = "override" | "env";

export interface CosecEffectiveConfig {
  baseUrl: string;
  username: string;
  password: string;
  baseUrlSource: ConfigSource;
  usernameSource: ConfigSource;
  passwordSource: ConfigSource;
}

export async function getEffectiveCosecConfig(): Promise<CosecEffectiveConfig> {
  const rows = await db.systemSetting.findMany({
    where: { key: { in: Object.values(SETTING_KEYS) } },
  });
  const overrides = new Map(rows.map((r) => [r.key, r.value]));

  const baseUrlOverride = overrides.get(SETTING_KEYS.baseUrl);
  const usernameOverride = overrides.get(SETTING_KEYS.username);
  const passwordOverrideEncrypted = overrides.get(SETTING_KEYS.password);

  return {
    baseUrl: baseUrlOverride || process.env.COSEC_BASE_URL || "",
    username: usernameOverride || process.env.COSEC_USERNAME || "",
    password: passwordOverrideEncrypted
      ? decryptSecret(passwordOverrideEncrypted)
      : process.env.COSEC_PASSWORD || "",
    baseUrlSource: baseUrlOverride ? "override" : "env",
    usernameSource: usernameOverride ? "override" : "env",
    passwordSource: passwordOverrideEncrypted ? "override" : "env",
  };
}

export interface CosecConfigOverrideInput {
  baseUrl?: string;
  username?: string;
  /** Empty/omitted means "leave the stored password unchanged" — the UI never round-trips the real value. */
  password?: string;
}

export async function saveCosecConfigOverride(input: CosecConfigOverrideInput): Promise<void> {
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

  if (input.username !== undefined) {
    ops.push(
      db.systemSetting.upsert({
        where: { key: SETTING_KEYS.username },
        create: { key: SETTING_KEYS.username, value: input.username },
        update: { value: input.username },
      })
    );
  }

  if (input.password) {
    const encrypted = encryptSecret(input.password);
    ops.push(
      db.systemSetting.upsert({
        where: { key: SETTING_KEYS.password },
        create: { key: SETTING_KEYS.password, value: encrypted },
        update: { value: encrypted },
      })
    );
  }

  if (ops.length > 0) {
    await db.$transaction(ops);
  }
}

export async function clearCosecConfigOverride(): Promise<void> {
  await db.systemSetting.deleteMany({ where: { key: { in: Object.values(SETTING_KEYS) } } });
}

export async function getCosecClient(): Promise<CosecClient> {
  const config = await getEffectiveCosecConfig();
  return new CosecClient({
    baseUrl: config.baseUrl,
    username: config.username,
    password: config.password,
  });
}
