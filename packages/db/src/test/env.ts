import { existsSync } from "node:fs";
import path from "node:path";

const ENV_FILE = path.resolve(import.meta.dirname, "../../.env.local");

export interface TestEnv {
  TEST_DATABASE_URL: string;
  TEST_DATABASE_MIGRATION_URL: string;
}

// From the environment (CI) or packages/db/.env.local (`pnpm env:pull`).
// Without both URLs the database tests are skipped, and say so.
export function testEnv(): TestEnv | null {
  if (!process.env.TEST_DATABASE_URL && existsSync(ENV_FILE)) {
    process.loadEnvFile(ENV_FILE);
  }
  const { TEST_DATABASE_URL, TEST_DATABASE_MIGRATION_URL } = process.env;
  if (!(TEST_DATABASE_URL && TEST_DATABASE_MIGRATION_URL)) {
    return null;
  }
  return { TEST_DATABASE_URL, TEST_DATABASE_MIGRATION_URL };
}
