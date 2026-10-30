import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { formatComment, untickedItems } from "./acceptance-comment.js";

const body = [
  "## Acceptance checklist",
  "",
  "- [x] Deploy the API",
  "- [ ] Restore a Neon branch",
  "* [ ] Terraform state in S3",
  "",
  "## Checklist",
  "",
  "- [ ] Tests added",
].join("\n");

describe("untickedItems", () => {
  it("lists only the unticked items in the acceptance section", () => {
    assert.deepEqual(untickedItems(body), [
      "Restore a Neon branch",
      "Terraform state in S3",
    ]);
  });

  it("handles Windows line endings", () => {
    assert.deepEqual(untickedItems(body.replaceAll("\n", "\r\n")), [
      "Restore a Neon branch",
      "Terraform state in S3",
    ]);
  });

  it("returns null when the section is missing", () => {
    assert.equal(untickedItems("## Checklist\n- [ ] Tests added"), null);
    assert.equal(untickedItems(null), null);
  });
});

describe("formatComment", () => {
  it("lists the unticked items", () => {
    assert.equal(
      formatComment(["Restore a Neon branch"]),
      "**WBS acceptance items not yet checked (1)**\n\n- Restore a Neon branch\n"
    );
  });

  it("says when every item is ticked", () => {
    assert.equal(formatComment([]), "All WBS acceptance items are ticked.\n");
  });

  it("says when the section is missing", () => {
    assert.equal(
      formatComment(null),
      "This PR has no `## Acceptance checklist` section.\n"
    );
  });
});
