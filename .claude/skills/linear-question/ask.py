#!/usr/bin/env python3
"""Open and track business questions in Linear (team BIZ), with a Slack ping.

Used by the linear-question skill and by scripts/linear_seed.py.

  python ask.py ask --title "..." --area pricing --question "..." --context "..." \
      --option "A: ..." --option "B: ..." --recommend "..." --blocks 1.1 --needed-by 2026-10-25
  python ask.py list                 # open + answered questions, with latest comments
  python ask.py list --state Answered
"""
import argparse
import json
import subprocess
import sys

TEAM_KEY = "BIZ"
PROJECT = "Business Questions"
STATE_OPEN = "Needs answer"
STATE_BLOCKED = "Blocked"
SLACK_CHANNEL = "#business-questions"
AREAS = ["product", "pricing", "gst", "legal", "sales", "vendor", "people"]
# Area -> assignee email. Decision D2: Saurabh triages everything until others join Linear.
ROUTING = {area: "7show2me@gmail.com" for area in AREAS}


def gql(doc, variables=None):
    args = ["linear", "api", doc]
    if variables:
        args += ["--variables-json", json.dumps(variables)]
    r = subprocess.run(args, capture_output=True, text=True, encoding="utf-8")
    if r.returncode != 0:
        sys.exit(f"linear api failed: {(r.stderr or r.stdout).strip()}")
    out = json.loads(r.stdout)
    if out.get("errors"):
        sys.exit(f"linear api error: {json.dumps(out['errors'])}")
    return out["data"]


def team_context():
    # Separate small queries: Linear caps query complexity at 10,000.
    teams = gql(
        "query($key: String!) { teams(filter: {key: {eq: $key}}) { nodes { id } } }", {"key": TEAM_KEY}
    )["teams"]["nodes"]
    if not teams:
        sys.exit(f"Linear team {TEAM_KEY} not found; run scripts/linear_seed.py first")
    team_id = teams[0]["id"]
    t = gql(
        """query($id: String!) { team(id: $id) {
          states { nodes { id name } }
          projects(first: 50) { nodes { id name } }
        } }""",
        {"id": team_id},
    )["team"]
    labels = gql(
        """query($id: String!, $names: [String!]) { team(id: $id) {
          labels(first: 20, filter: {name: {in: $names}}) { nodes { id name } }
        } }""",
        {"id": team_id, "names": ["question"] + [f"q:{a}" for a in AREAS]},
    )["team"]["labels"]["nodes"]
    users = gql("query { users(first: 100) { nodes { id email } } }")["users"]["nodes"]
    return {
        "team_id": team_id,
        "states": {s["name"]: s["id"] for s in t["states"]["nodes"]},
        "labels": {l["name"]: l["id"] for l in labels},
        "projects": {p["name"]: p["id"] for p in t["projects"]["nodes"]},
        "users": {u["email"].lower(): u["id"] for u in users},
    }


def find_issue(ref):
    """Resolve a WBS id like '1.1' / 'B0.2' or an issue key like 'BIZ-12'."""
    if "-" in ref and ref.split("-")[-1].isdigit():
        data = gql("query($id: String!) { issue(id: $id) { id identifier title } }", {"id": ref})
        return data["issue"]
    data = gql(
        """query($key: String!, $prefix: String!) {
          issues(first: 10, filter: {team: {key: {eq: $key}}, title: {startsWith: $prefix}}) {
            nodes { id identifier title }
          }
        }""",
        {"key": TEAM_KEY, "prefix": ref + " "},
    )
    for issue in data["issues"]["nodes"]:
        if issue["title"].split(" ", 1)[0] == ref:
            return issue
    sys.exit(f"No BIZ issue found for WBS id {ref}")


def find_open_duplicate(title):
    data = gql(
        """query($key: String!, $project: String!, $title: String!) {
          issues(first: 5, filter: {
            team: {key: {eq: $key}}, project: {name: {eq: $project}},
            title: {eqIgnoreCase: $title}, state: {type: {nin: ["completed", "canceled"]}}
          }) { nodes { identifier url } }
        }""",
        {"key": TEAM_KEY, "project": PROJECT, "title": title},
    )
    nodes = data["issues"]["nodes"]
    return nodes[0] if nodes else None


def build_description(a, blocked):
    lines = ["**Question**", a.question, "", "**Context**", a.context or "—", ""]
    if a.option:
        lines.append("**Options**")
        lines += [f"{i}. {opt}" for i, opt in enumerate(a.option, 1)]
        lines.append("")
    if a.recommend:
        lines += [f"**Agent's suggestion (not a decision):** {a.recommend}", ""]
    blocks = ", ".join(f"{ref} ({i['identifier']})" for ref, i in blocked) or "—"
    lines += [
        f"**Blocks:** {blocks}",
        f"**Needed by:** {a.needed_by or 'not set'}",
        "",
        "---",
        "To answer: write the decision as a comment, then move this issue to **Answered**. "
        "The agent records it in `docs/decisions.md` and continues.",
        "",
        "_Opened by an AI agent via the linear-question skill. Agents must not assume this answer._",
    ]
    return "\n".join(lines)


def slack_ping(text):
    r = subprocess.run(
        ["slackcli", "messages", "send", f"--recipient-id={SLACK_CHANNEL}", "--message", text],
        capture_output=True, text=True, encoding="utf-8",
    )
    if r.returncode != 0:
        return "failed: " + (r.stderr or r.stdout).strip().splitlines()[-1][:200]
    return "sent"


def cmd_ask(a):
    title = a.title if a.title.startswith("Q: ") else "Q: " + a.title
    dup = find_open_duplicate(title)
    if dup:
        print(json.dumps({"duplicate": True, "identifier": dup["identifier"], "url": dup["url"]}))
        return

    ctx = team_context()
    assignee_email = (a.assignee or ROUTING[a.area]).lower()
    assignee_id = ctx["users"].get(assignee_email)
    if not assignee_id:
        print(f"warning: {assignee_email} is not a Linear member; leaving unassigned", file=sys.stderr)
    blocked = [(ref, find_issue(ref)) for ref in a.blocks]
    label_ids = [ctx["labels"][n] for n in ("question", f"q:{a.area}") if n in ctx["labels"]]

    issue_input = {
        "teamId": ctx["team_id"],
        "title": title,
        "description": build_description(a, blocked),
        "projectId": ctx["projects"][PROJECT],
        "stateId": ctx["states"][STATE_OPEN],
        "labelIds": label_ids,
        "priority": 2,
    }
    if assignee_id:
        issue_input["assigneeId"] = assignee_id
    if a.needed_by:
        issue_input["dueDate"] = a.needed_by
    issue = gql(
        """mutation($input: IssueCreateInput!) {
          issueCreate(input: $input) { issue { id identifier url } }
        }""",
        {"input": issue_input},
    )["issueCreate"]["issue"]

    for _, target in blocked:
        gql(
            """mutation($input: IssueRelationCreateInput!) {
              issueRelationCreate(input: $input) { success }
            }""",
            {"input": {"issueId": issue["id"], "relatedIssueId": target["id"], "type": "blocks"}},
        )
        if a.mark_blocked:
            gql(
                """mutation($id: String!, $input: IssueUpdateInput!) {
                  issueUpdate(id: $id, input: $input) { success }
                }""",
                {"id": target["id"], "input": {"stateId": ctx["states"][STATE_BLOCKED]}},
            )

    slack = "skipped"
    if not a.no_slack:
        blocks = ", ".join(ref for ref, _ in blocked) or "nothing yet"
        slack = slack_ping(
            f":question: *{issue['identifier']}* {title}\n"
            f"{a.question}\n"
            f"Assigned: {assignee_email} · Blocks: {blocks} · Needed by: {a.needed_by or 'not set'}\n"
            f"{issue['url']}"
        )
    print(json.dumps({"duplicate": False, "identifier": issue["identifier"], "url": issue["url"], "slack": slack}))


def cmd_list(a):
    states = a.state or [STATE_OPEN, "Answered"]
    data = gql(
        """query($key: String!, $project: String!, $states: [String!]) {
          issues(first: 100, filter: {
            team: {key: {eq: $key}}, project: {name: {eq: $project}}, state: {name: {in: $states}}
          }) { nodes {
            identifier title url dueDate
            state { name }
            assignee { email }
            comments(last: 3) { nodes { body createdAt user { name } } }
          } }
        }""",
        {"key": TEAM_KEY, "project": PROJECT, "states": states},
    )
    print(json.dumps(data["issues"]["nodes"], indent=2, ensure_ascii=False))


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = p.add_subparsers(dest="cmd", required=True)

    ask = sub.add_parser("ask", help="open a business question")
    ask.add_argument("--title", required=True)
    ask.add_argument("--area", required=True, choices=AREAS)
    ask.add_argument("--question", required=True, help="the question in one sentence")
    ask.add_argument("--context", default="", help="why it is needed: WBS id, file path, what is blocked")
    ask.add_argument("--option", action="append", default=[], help="an option with its trade-off; repeat")
    ask.add_argument("--recommend", default="", help="agent's suggestion, shown as not-a-decision")
    ask.add_argument("--blocks", action="append", default=[], help="WBS id (1.1, B0.2) or issue key; repeat")
    ask.add_argument("--needed-by", default="", help="YYYY-MM-DD")
    ask.add_argument("--assignee", default="", help="email; default from the routing table")
    ask.add_argument("--mark-blocked", action="store_true", help="move blocked issues to Blocked")
    ask.add_argument("--no-slack", action="store_true")
    ask.set_defaults(func=cmd_ask)

    ls = sub.add_parser("list", help="list open and answered questions")
    ls.add_argument("--state", action="append", help="state name; repeat (default: Needs answer, Answered)")
    ls.set_defaults(func=cmd_list)

    a = p.parse_args()
    a.func(a)


if __name__ == "__main__":
    main()
