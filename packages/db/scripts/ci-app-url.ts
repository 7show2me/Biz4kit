// CI only (.github/workflows/database.yml): gives biz4kit_app a fresh random
// password on this PR's Neon branch and exports the test URLs to later steps,
// masked in the log. The branch is a copy of dev, so the role already exists;
// the migration app_role creates it when it does not.
import { randomBytes } from "node:crypto";
import { appendFileSync } from "node:fs";

import { Client } from "pg";

const APP_ROLE = "biz4kit_app";
const ownerUrl = process.env.DATABASE_MIGRATION_URL;
const githubEnv = process.env.GITHUB_ENV;
if (!(ownerUrl && githubEnv)) {
  throw new Error("DATABASE_MIGRATION_URL and GITHUB_ENV are required");
}

const password = randomBytes(32).toString("base64url");
const client = new Client({ connectionString: ownerUrl });
await client.connect();
try {
  // Only login and password: changing SUPERUSER, even to off, needs a superuser.
  // DDL takes no parameters; the password is base64url only.
  await client.query(
    `alter role ${APP_ROLE} with login password '${password}'`
  );
} finally {
  await client.end();
}

const appUrl = new URL(ownerUrl);
appUrl.username = APP_ROLE;
appUrl.password = password;

console.log(`::add-mask::${password}`);
console.log(`::add-mask::${appUrl.toString()}`);
appendFileSync(
  githubEnv,
  `TEST_DATABASE_URL=${appUrl.toString()}\nTEST_DATABASE_MIGRATION_URL=${ownerUrl}\n`
);
console.log(`TEST_DATABASE_URL: ${APP_ROLE} on this PR's branch`);
