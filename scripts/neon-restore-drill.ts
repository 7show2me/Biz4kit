// Neon restore drill (WBS 1.1, infra/README.md section 4): proves a branch can
// go back to an earlier point in time.
//
// It makes a throwaway branch `drill/restore-<time>` from dev, writes a marker
// row, waits, restores the branch to a moment between two markers, checks the
// later marker is gone, then deletes the drill branches. It never restores dev,
// test, a PR branch or prod: Neon makes the backup branch of a self-restore the
// new parent of that branch and of its children, and the backup cannot be
// deleted while they exist.
//
// Needs `neonctl` signed in. Connection strings are read from neonctl and never
// printed.
//
//   pnpm drill:neon-restore               # checks only, changes nothing
//   pnpm drill:neon-restore -- --yes      # runs the drill
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";

import type { Client as PgClient } from "pg";

// pg lives in packages/db; the root has no copy.
type Client = PgClient;
const { Client: PgClientClass } = createRequire(
  path.resolve(import.meta.dirname, "../packages/db/package.json")
)("pg") as { Client: new (config: { connectionString: string }) => Client };

const PROJECT_ID = "fancy-leaf-05807484";
const SOURCE_BRANCH = "dev";
const ALLOWED = /^drill\/[a-z0-9-]+$/u;
const WAIT_MS = 25_000;
const RESTART_WAIT_MS = 5000;
const RESTART_TRIES = 18;

export const assertDrillBranch = (branch: string) => {
  if (!ALLOWED.test(branch)) {
    throw new Error(`drill refuses branch "${branch}": only drill/<name>`);
  }
};

export const restoreArgs = ({
  projectId,
  branch,
  at,
  backup,
}: {
  projectId: string;
  branch: string;
  at: Date;
  backup: string;
}) => [
  "branches",
  "restore",
  branch,
  `^self@${at.toISOString().replace(/\.\d{3}Z$/u, "Z")}`,
  "--project-id",
  projectId,
  "--preserve-under-name",
  backup,
];

// shell: true finds neonctl.cmd on Windows, where cmd reads a bare ^ as an
// escape. Quote the arguments that hold special characters.
const neon = (args: string[], { quiet = true } = {}) => {
  const quoted = args.map((arg) => (/[\s^&|<>]/u.test(arg) ? `"${arg}"` : arg));
  const result = spawnSync("neonctl", quoted, {
    encoding: "utf-8",
    shell: true,
  });
  if (result.status !== 0) {
    // neonctl prints no connection strings on errors.
    throw new Error(
      `neonctl ${args.slice(0, 2).join(" ")} failed: ${result.stderr.trim().slice(0, 300)}`
    );
  }
  return quiet ? result.stdout.trim() : result.stdout;
};

const connectionString = (branch: string) =>
  neon([
    "connection-string",
    branch,
    "--project-id",
    PROJECT_ID,
    "--role-name",
    "neondb_owner",
    "--database-name",
    "neondb",
  ]);

const withClient = async <T>(
  branch: string,
  fn: (client: Client) => Promise<T>
) => {
  const client = new PgClientClass({
    connectionString: connectionString(branch),
  });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
};

const markers = async (client: Client) => {
  const { rows } = await client.query<{ id: string }>(
    "select id from restore_drill order by id"
  );
  return rows.map((row) => row.id);
};

const markersOrNotReady = async (branch: string) => {
  try {
    return await withClient(branch, markers);
  } catch {
    return ["(not reachable yet)"];
  }
};

const deleteBranch = (name: string) => {
  try {
    neon(["branches", "delete", name, "--project-id", PROJECT_ID]);
  } catch {
    console.warn(`could not delete branch "${name}": delete it by hand`);
  }
};

const main = async () => {
  const stamp = Math.floor(Date.now() / 1000);
  const branch = `drill/restore-${stamp}`;
  const backup = `${branch}-backup`;
  assertDrillBranch(branch);
  if (!process.argv.includes("--yes")) {
    console.log(`Dry run: would branch "${SOURCE_BRANCH}" into "${branch}".`);
    console.log("Add --yes to run the drill.");
    return;
  }

  neon([
    "branches",
    "create",
    "--name",
    branch,
    "--parent",
    SOURCE_BRANCH,
    "--project-id",
    PROJECT_ID,
  ]);
  let ok = false;
  try {
    await withClient(branch, async (client) => {
      await client.query("create table restore_drill (id text primary key)");
      await client.query("insert into restore_drill values ('before')");
    });
    await sleep(WAIT_MS);
    // Neon's control plane checks the time against this computer's clock, but
    // rows carry the database clock, which runs ~15 s ahead. A gap of 25 s on
    // each side keeps the restore point between the two rows for either clock.
    const restorePoint = new Date();
    await sleep(WAIT_MS);
    await withClient(branch, (client) =>
      client.query("insert into restore_drill values ('after')")
    );

    neon(
      restoreArgs({ projectId: PROJECT_ID, branch, at: restorePoint, backup })
    );

    // The restore returns before the branch's compute restarts. Until it does,
    // a query can still answer from the old state, so wait for the new one.
    let found: string[] = [];
    for (let attempt = 0; attempt < RESTART_TRIES; attempt += 1) {
      // eslint-disable-next-line no-await-in-loop
      await sleep(RESTART_WAIT_MS);
      // eslint-disable-next-line no-await-in-loop
      found = await markersOrNotReady(branch);
      if (!found.includes("after")) {
        break;
      }
    }
    ok = found.length === 1 && found[0] === "before";
    console.log(`rows after restore: ${found.join(", ") || "(none)"}`);
  } finally {
    // The backup is the drill branch's parent: delete the child first.
    deleteBranch(branch);
    deleteBranch(backup);
  }

  if (!ok) {
    throw new Error("restore drill FAILED: the later row is still there");
  }
  console.log("restore drill passed");
};

if (import.meta.url === `file:///${process.argv[1]?.replaceAll("\\", "/")}`) {
  await main();
}
