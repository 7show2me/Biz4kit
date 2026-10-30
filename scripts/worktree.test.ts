import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { planWorktree } from "./worktree.js";

describe("planWorktree add", () => {
  it("puts the worktree in ../wt, named after the Linear branch", () => {
    const plan = planWorktree(["add", "7show2me/biz-1-build-workflow-finish"]);
    assert.deepEqual(plan.git, [
      "worktree",
      "add",
      "../wt/biz-1-build-workflow-finish",
      "7show2me/biz-1-build-workflow-finish",
    ]);
    assert.equal(plan.path, "../wt/biz-1-build-workflow-finish");
  });

  it("starts a new branch from the given base when --new is used", () => {
    const plan = planWorktree([
      "add",
      "biz-123-quote-page",
      "--new",
      "origin/dev",
    ]);
    assert.deepEqual(plan.git, [
      "worktree",
      "add",
      "-b",
      "biz-123-quote-page",
      "../wt/biz-123-quote-page",
      "origin/dev",
    ]);
  });

  it("refuses to work on a long-lived branch", () => {
    assert.throws(() => planWorktree(["add", "main"]), /long-lived/u);
    assert.throws(() => planWorktree(["add", "dev"]), /long-lived/u);
  });

  it("refuses names that could leave ../wt", () => {
    assert.throws(() => planWorktree(["add", "../evil"]), /branch name/u);
    assert.throws(() => planWorktree(["add", "biz-1/.."]), /branch name/u);
    assert.throws(() => planWorktree(["add", "biz 1"]), /branch name/u);
  });

  it("needs a branch", () => {
    assert.throws(() => planWorktree(["add"]), /usage/iu);
  });
});

describe("planWorktree remove", () => {
  it("removes the worktree after merge", () => {
    const plan = planWorktree([
      "remove",
      "7show2me/biz-1-build-workflow-finish",
    ]);
    assert.deepEqual(plan.git, [
      "worktree",
      "remove",
      "../wt/biz-1-build-workflow-finish",
    ]);
  });

  it("never forces removal, so unsaved work is not lost", () => {
    const plan = planWorktree(["remove", "biz-9-x"]);
    assert.ok(!plan.git.includes("--force"));
  });
});

describe("planWorktree usage", () => {
  it("rejects an unknown command", () => {
    assert.throws(() => planWorktree(["nuke", "biz-1"]), /usage/iu);
  });
});
