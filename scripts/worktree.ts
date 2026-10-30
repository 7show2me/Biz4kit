// One git worktree per branch (Workflow doc: Git and worktrees).
//
//   pnpm worktree add <branch>                  check out an existing branch in ../wt/<name>
//   pnpm worktree add <branch> --new <base>     create the branch from <base> (use origin/dev, D118)
//   pnpm worktree remove <branch>               remove it after merge (never forced)
//
// <name> is the last part of the branch, so Linear's `user/biz-123-title` becomes ../wt/biz-123-title.
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const WORKTREE_ROOT = "../wt";
const LONG_LIVED = new Set(["main", "dev"]);
const BRANCH_NAME =
  /^[A-Za-z0-9][A-Za-z0-9._-]*(?:\/[A-Za-z0-9][A-Za-z0-9._-]*)*$/u;
const USAGE =
  "Usage: pnpm worktree add <branch> [--new <base>] | pnpm worktree remove <branch>";

export interface WorktreePlan {
  git: string[];
  path: string;
}

const pathFor = (branch: string): string => {
  if (!BRANCH_NAME.test(branch) || branch.split("/").includes("..")) {
    throw new Error(`Invalid branch name: ${branch}`);
  }
  if (LONG_LIVED.has(branch)) {
    throw new Error(
      `${branch} is a long-lived branch; work on a feature branch`
    );
  }
  const name = branch.split("/").at(-1) as string;
  if (name === "." || name === "..") {
    throw new Error(`Invalid branch name: ${branch}`);
  }
  return `${WORKTREE_ROOT}/${name}`;
};

export const planWorktree = (args: string[]): WorktreePlan => {
  const [command, branch, flag, base] = args;
  if ((command !== "add" && command !== "remove") || !branch) {
    throw new Error(USAGE);
  }
  const path = pathFor(branch);
  if (command === "remove") {
    return { git: ["worktree", "remove", path], path };
  }
  if (flag === "--new") {
    if (!base) {
      throw new Error(USAGE);
    }
    return { git: ["worktree", "add", "-b", branch, path, base], path };
  }
  return { git: ["worktree", "add", path, branch], path };
};

const main = (): void => {
  try {
    const plan = planWorktree(process.argv.slice(2));
    const result = spawnSync("git", plan.git, { stdio: "inherit" });
    if (result.status === 0) {
      process.stdout.write(`Worktree: ${plan.path}\n`);
    }
    process.exit(result.status ?? 1);
  } catch (error) {
    process.stderr.write(`${(error as Error).message}\n`);
    process.exit(2);
  }
};

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main();
}
