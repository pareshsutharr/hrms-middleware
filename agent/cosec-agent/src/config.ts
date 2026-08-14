import "dotenv/config";

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const config = {
  cosecBaseUrl: required("COSEC_BASE_URL"),
  cosecUsername: required("COSEC_USERNAME"),
  cosecPassword: required("COSEC_PASSWORD"),
  /** Base URL up to and including /api/agent, e.g. https://your-domain.vercel.app/api/agent */
  cloudApiUrl: required("CLOUD_API_URL").replace(/\/+$/, ""),
  agentSecret: required("AGENT_SECRET"),
  syncIntervalMinutes: Number(process.env.SYNC_INTERVAL_MINUTES ?? "5"),
};
