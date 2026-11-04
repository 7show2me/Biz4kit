export interface SmokeConfig {
  apiUrl: string;
  bypassSecret: string;
  smokeSecret: string;
  webUrl: string;
}

type Env = Record<string, string | undefined>;

const REQUIRED = [
  "API_URL",
  "SMOKE_SECRET",
  "VERCEL_AUTOMATION_BYPASS_SECRET",
] as const;

// Values come from GitHub env `dev` (vars and secrets). Errors name the
// variable, never its value.
export const loadConfig = (env: Env): SmokeConfig => {
  const missing = REQUIRED.filter((name) => !env[name]);
  if (missing.length > 0) {
    throw new Error(`smoke test needs: ${missing.join(", ")}`);
  }
  return {
    apiUrl: (env.API_URL ?? "").replace(/\/+$/u, ""),
    webUrl: (env.WEB_URL || "https://biz4kit-dev.vercel.app").replace(
      /\/+$/u,
      ""
    ),
    smokeSecret: env.SMOKE_SECRET ?? "",
    bypassSecret: env.VERCEL_AUTOMATION_BYPASS_SECRET ?? "",
  };
};
