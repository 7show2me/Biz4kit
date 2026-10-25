import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import type { DatabaseConfig } from "./config";
import { relations } from "./relations";

// node-postgres over Neon's pooled endpoint: RLS needs a transaction per
// request to carry app.workspace_id, which the HTTP driver cannot hold.
export function createDb(env: DatabaseConfig) {
  const pool = new Pool({ connectionString: env.DATABASE_URL });
  // Neon closes idle connections. The pool drops that client and opens a new
  // one; without a listener the error would crash the process.
  pool.on("error", (error) => {
    console.warn(`db pool: idle connection closed (${error.message})`);
  });
  return drizzle({ client: pool, relations });
}

export type Database = ReturnType<typeof createDb>;
export type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

/**
 * Runs `fn` in a transaction where RLS shows only this workspace's rows.
 * Every request that touches workspace data goes through here.
 */
export function withWorkspace<T>(
  db: Database,
  workspaceId: string,
  fn: (tx: Transaction) => Promise<T>
): Promise<T> {
  if (!UUID.test(workspaceId)) {
    return Promise.reject(
      new Error("withWorkspace: workspace id must be a UUID")
    );
  }
  return db.transaction(async (tx) => {
    await tx.execute(
      sql`select set_config('app.workspace_id', ${workspaceId}, true)`
    );
    return fn(tx);
  });
}

/**
 * Runs `fn` with only the signed-in user's own memberships and workspaces
 * visible, to choose a workspace. No other workspace data is visible.
 */
export function withUser<T>(
  db: Database,
  userId: string,
  fn: (tx: Transaction) => Promise<T>
): Promise<T> {
  if (!userId) {
    return Promise.reject(new Error("withUser: user id is required"));
  }
  return db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.user_id', ${userId}, true)`);
    return fn(tx);
  });
}

/**
 * Takes the next PI- or INV- number for the current workspace and financial
 * year (D60, D71). The counter row stays locked until the transaction ends,
 * and a rollback gives the number back, so the series has no gaps.
 */
export async function takeNumber(
  tx: Transaction,
  { series, fy }: { series: "PI" | "INV"; fy: string }
): Promise<number> {
  const { rows } = await tx.execute<{ taken: number }>(sql`
    insert into numbering_counter (series, fy, next) values (${series}, ${fy}, 2)
    on conflict (workspace_id, series, fy)
      do update set next = numbering_counter.next + 1
    returning next - 1 as taken`);
  const taken = rows[0]?.taken;
  if (taken === undefined) {
    throw new Error("takeNumber: no number returned");
  }
  return Number(taken);
}
