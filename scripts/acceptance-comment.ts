// Prints the PR comment listing WBS acceptance items not yet ticked (Workflow
// doc: Automation). Reads the PR body from the GitHub event file.
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const HEADING = /^##\s+Acceptance checklist\s*$/mu;
const UNTICKED = /^\s*[-*] \[ \] (?<item>.+?)\s*$/gmu;

export const untickedItems = (body: string | null): string[] | null => {
  const start = body?.match(HEADING);
  if (!body || start?.index === undefined) {
    return null;
  }
  const rest = body.slice(start.index + start[0].length);
  const section = rest.split(/^##\s/mu)[0] ?? "";
  return [...section.matchAll(UNTICKED)].map(
    (match) => match.groups?.item ?? ""
  );
};

export const formatComment = (items: string[] | null): string => {
  if (items === null) {
    return "This PR has no `## Acceptance checklist` section.\n";
  }
  if (items.length === 0) {
    return "All WBS acceptance items are ticked.\n";
  }
  const list = items.map((item) => `- ${item}`).join("\n");
  return `**WBS acceptance items not yet checked (${items.length})**\n\n${list}\n`;
};

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const event = JSON.parse(
    readFileSync(process.env.GITHUB_EVENT_PATH ?? "", "utf-8")
  );
  process.stdout.write(formatComment(untickedItems(event.pull_request.body)));
}
