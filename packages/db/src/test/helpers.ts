import { randomUUID } from "node:crypto";

import { afterAll } from "vitest";

import { createDb, withWorkspace } from "../index";
import type { Database } from "../index";
import { workspace } from "../schema";
import { testEnv } from "./env";

const env = testEnv();
export const hasDb = env !== null;
if (!hasDb) {
  console.warn(
    "Database tests skipped: TEST_DATABASE_URL and TEST_DATABASE_MIGRATION_URL are not set (run pnpm env:pull)."
  );
}

// One app-role connection pool per test file.
export function appDb(): Database {
  if (!env) {
    throw new Error("no test database");
  }
  const db = createDb({ DATABASE_URL: env.TEST_DATABASE_URL });
  afterAll(() => db.$client.end());
  return db;
}

export async function makeWorkspace(db: Database, name = "Test studio") {
  const id = randomUUID();
  await withWorkspace(db, id, (tx) =>
    tx.insert(workspace).values({ id, name, slug: `t-${id.slice(0, 13)}` })
  );
  return id;
}

// The Postgres error code behind a Drizzle error, or "ok" when nothing threw.
export async function pgCode(run: () => Promise<unknown>): Promise<string> {
  try {
    await run();
    return "ok";
  } catch (error) {
    const err = error as { code?: string; cause?: { code?: string } };
    return err.cause?.code ?? err.code ?? String(error);
  }
}

export const PG = {
  insufficientPrivilege: "42501",
  uniqueViolation: "23505",
  checkViolation: "23514",
  invalidEnum: "22P02",
  raised: "P0001",
} as const;
