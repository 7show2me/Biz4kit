import path from "node:path";

import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";

import { testEnv } from "./env";

export default async function setup() {
  const env = testEnv();
  if (!env) {
    return;
  }
  const db = drizzle({ connection: env.TEST_DATABASE_MIGRATION_URL });
  try {
    await migrate(db, {
      migrationsFolder: path.resolve(import.meta.dirname, "../migrations"),
    });
  } finally {
    await db.$client.end();
  }
}
