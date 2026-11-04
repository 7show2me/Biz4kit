import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { assertDrillBranch, restoreArgs } from "./neon-restore-drill.js";

describe("assertDrillBranch", () => {
  it("allows only throwaway drill branches", () => {
    assert.doesNotThrow(() => assertDrillBranch("drill/restore-1730707200"));
  });

  it("refuses prod, dev, test and pull request branches", () => {
    // Restoring a branch to itself makes a backup branch its new parent, which
    // would re-parent dev's children (test, PR branches). So only drill/* is used.
    for (const name of ["prod", "main", "dev", "test", "preview/pr-12", ""]) {
      assert.throws(() => assertDrillBranch(name), /refuses/u);
    }
  });
});

describe("restoreArgs", () => {
  it("restores the branch to its own history and keeps a backup branch", () => {
    assert.deepEqual(
      restoreArgs({
        projectId: "p1",
        branch: "drill/restore-1",
        at: new Date("2026-11-04T08:00:00.000Z"),
        backup: "drill/restore-1-backup",
      }),
      [
        "branches",
        "restore",
        "drill/restore-1",
        "^self@2026-11-04T08:00:00Z",
        "--project-id",
        "p1",
        "--preserve-under-name",
        "drill/restore-1-backup",
      ]
    );
  });
});
