// Creates (or rotates the password of) the request-serving role `biz4kit_app`
// on the Neon dev and test branches, then stores the URLs in Vercel Development:
//   DATABASE_URL / TEST_DATABASE_URL                     app role (RLS applies)
//   DATABASE_MIGRATION_URL / TEST_DATABASE_MIGRATION_URL owner (runs migrations)
// The role is created in SQL by the owner, so it is not in neon_superuser and
// has no BYPASSRLS. Values never reach the terminal. Run `pnpm env:pull` after.
// Usage: pnpm --filter @Biz4kit/db db:app-role
import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { parseEnv } from "node:util";

import { Client } from "pg";

const APP_ROLE = "biz4kit_app";
const ROOT = path.resolve(import.meta.dirname, "../../..");
const env = parseEnv(
  readFileSync(path.resolve(import.meta.dirname, "../.env.local"), "utf-8")
);

const TARGETS = [
  { app: "DATABASE_URL", owner: "DATABASE_MIGRATION_URL" },
  { app: "TEST_DATABASE_URL", owner: "TEST_DATABASE_MIGRATION_URL" },
] as const;

const currentUser = async (url: string) => {
  const client = new Client({ connectionString: url });
  await client.connect();
  try {
    const { rows } = await client.query<{ u: string }>(
      "select current_user as u"
    );
    return rows[0]?.u;
  } finally {
    await client.end();
  }
};

const setVercel = (name: string, value: string) => {
  // Value goes through stdin, never the command line.
  const result = spawnSync(`vercel env add ${name} development --force --yes`, {
    cwd: ROOT,
    input: value,
    stdio: ["pipe", "ignore", "inherit"],
    shell: true,
  });
  if (result.status !== 0) {
    throw new Error(`vercel env add ${name} failed`);
  }
};

const setUp = async (target: (typeof TARGETS)[number]) => {
  const ownerUrl = env[target.owner] || env[target.app];
  if (!ownerUrl) {
    throw new Error(
      `${target.owner} (or ${target.app}) missing; run pnpm env:pull`
    );
  }
  const owner = await currentUser(ownerUrl);
  if (owner === APP_ROLE) {
    throw new Error(`${target.owner} must be the owner role, not ${APP_ROLE}`);
  }

  const password = randomBytes(32).toString("base64url");
  const client = new Client({ connectionString: ownerUrl });
  await client.connect();
  try {
    const { rowCount } = await client.query(
      "select 1 from pg_roles where rolname = $1",
      [APP_ROLE]
    );
    // DDL takes no parameters; the password is base64url only. ALTER sets only
    // login and password: changing SUPERUSER, even to off, needs a superuser.
    await client.query(
      rowCount
        ? `alter role ${APP_ROLE} with login password '${password}'`
        : `create role ${APP_ROLE} with login password '${password}' nosuperuser nobypassrls nocreatedb nocreaterole noinherit`
    );
  } finally {
    await client.end();
  }

  const appUrl = new URL(ownerUrl);
  appUrl.username = APP_ROLE;
  appUrl.password = password;
  if ((await currentUser(appUrl.toString())) !== APP_ROLE) {
    throw new Error(`could not sign in as ${APP_ROLE} (${target.app})`);
  }

  setVercel(target.owner, ownerUrl);
  setVercel(target.app, appUrl.toString());
  console.log(`${target.app}: ${APP_ROLE}; ${target.owner}: ${owner}`);
};

// The two branches are independent.
await Promise.all(TARGETS.map(setUp));
