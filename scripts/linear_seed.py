#!/usr/bin/env python3
"""Upload prep/WBS.md to Linear: team BIZ, workflow states, projects, labels,
one issue per WBS row with blocks relations, and the first open business questions.

Safe to re-run: existing states, projects, labels, issues (matched by the WBS id at
the start of the title) and relations are left alone.

  python scripts/linear_seed.py            # create / top up
  python scripts/linear_seed.py --dry-run  # parse and print, touch nothing
"""
import argparse
import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
WBS = ROOT / "prep" / "WBS.md"
ASK = ROOT / ".claude" / "skills" / "biz-linear-question" / "ask.py"

TEAM = {"name": "Biz4Kit", "key": "BIZ", "description": "Biz4Kit build: Dev, Business and Sales & success (prep/WBS.md)"}

# Added on top of Linear's defaults (Backlog, Todo, In Progress, Done, Canceled, Duplicate).
# Statuses follow prep/Workflow & final verification.md, plus two for biz-linear-question.
STATES = [
    ("In Review", "started", "#0F783C"),
    ("Ready to verify", "started", "#4EA7FC"),
    ("Verifying", "started", "#BB87FC"),
    ("Blocked", "started", "#EB5757"),
    ("Needs answer", "unstarted", "#F2C94C"),
    ("Answered", "started", "#26B5CE"),
    ("Cut", "canceled", "#95A2B3"),
]

PROJECTS = {
    "phase1": ("Phase 1 · Standalone", "Days 1–10. Whole product standalone; Google OAuth + Resend only."),
    "phase2": ("Phase 2 · Connect", "Days 11–20. Connectors behind adapters, plan billing, AI ingest."),
    "phase3": ("Phase 3 · Scale", "Weeks 5–12, scoped after the pilot readout."),
    "business": ("Business ops", "Company, CA and lawyer, legal drafts, cost sheet, hiring (B rows)."),
    "sales": ("Sales & success", "Founding 20 recruitment, set-up visits, check-ins, G-reviews (S rows)."),
    "questions": ("Business Questions", "Questions AI agents must not answer themselves (biz-linear-question skill)."),
}

AREAS = ["auth", "catalog", "invoice", "payments", "messages", "portal", "admin", "infra"]
Q_AREAS = ["product", "pricing", "gst", "legal", "sales", "vendor", "people"]

AREA_OF = {
    "0.1": "infra", "1.1": "infra", "1.2": "infra", "1.3": "auth", "1.4": "admin", "1.5": "portal",
    "1.6": "messages", "1.7": "infra", "2.1": "catalog", "2.2": "catalog", "2.3": "invoice", "2.4": "invoice",  # D60: no Quote; a reply is a proforma invoice
    "2.5": "invoice", "2.6": "payments", "2.7": "messages", "2.8": "infra", "2.9": "messages",
    "3.1": "portal", "3.2": "portal", "3.3": "portal", "3.4": "portal", "3.5": "auth", "3.6": "admin",
    "3.7": "admin", "3.8": "admin", "3.9": "portal", "3.11": "portal", "4.1": "infra", "4.2": "catalog",
    "4.3": "infra", "4.6": "infra", "4.4": "infra", "5.1": "infra", "5.2": "payments", "5.3": "payments",
    "5.4": "payments", "5.5": "payments", "5.6": "messages", "5.7": "auth", "5.8": "messages",
    "6.1": "catalog", "6.2": "catalog", "6.3": "invoice", "6.4": "invoice", "6.5": "admin",
    "7.1": "portal", "7.2": "admin", "7.3": "infra", "7.4": "invoice", "7.5": "infra", "7.6": "admin",
}
PII = {"1.2", "1.3", "2.4", "2.5", "2.6", "3.1", "3.4", "3.7", "4.1", "5.2", "5.3", "5.4", "5.6", "5.7", "6.2", "7.4"}
RISK_HIGH = {"2.3", "2.6"}  # Workflow doc: label risk:high
URGENT = {"B0.2", "B0.3"}  # D6, D7: no company, CA or lawyer yet

# Decisions in docs/decisions.md that change WBS text. Each entry replaces a field.
AMEND = {
    "1.1": {
        "done": "Monorepo (pnpm + Turborepo, D37: web, native, server); backend (API + BullMQ workers) as Docker images in ECR, "
                "docker compose for local dev; deployed to ECS Fargate in Mumbai (ap-south-1) behind API Gateway HTTP API -> "
                "VPC Link -> Cloud Map, no load balancer (D28, D38, D42); Terraform state in S3 with locking (D39); web app on "
                "Vercel (D22); Upstash Redis for BullMQ (D33); Neon Postgres in AWS Mumbai with prod + staging branches and a "
                "Neon branch per PR preview; point-in-time restore (D4); preview deploys; error tracking",
        "verify": "Deploy a hello-world API to ECS Fargate behind API Gateway and the web app to Vercel; restore a Neon branch "
                  "to an earlier point in time",
        "note": "D3, D4, D22, D28, D33, D37, D38, D39, D42",
    },
    "B0.2": {"note": "D7: neither a CA nor a lawyer is engaged yet. Day-1 priority"},
    "B0.3": {"note": "D6: entity, PAN, GST and bank account are all still to be filed. Day-1 priority"},
    "B0.4": {
        "done": "Trademark search for Biz4Kit; application filed; decision recorded (name locked, no three-name test)",
        "verify": "Attorney search report; application receipt",
        "note": "D5",
    },
    "S1.1": {
        "done": "Twenty named businesses in the two pilot verticals (salons and design / IT agencies) with a yes, logged in "
                "the Business plan tracker with channel tag and buddy",
        "note": "D1",
    },
    "S1.3": {
        "done": "The founder's phone is the pilot support line; hours, response-time promise, escalation path, five FAQ "
                "videos recorded; playbook in the Business plan tab",
        "note": "D8",
    },
}

# Cross-team aliases. prep/WBS.md row 4.4 says "Sales 2.3", but its "Cross-team dependencies"
# note says "Dev 4.4 needs Sales S1.1 (the Founding 20)"; the note is the stated intent.
DEP_ALIAS = {"S2.3@4.4": "S1.1"}

SEED_QUESTIONS = [
    dict(title="Production Redis for BullMQ", area="vendor", blocks=["1.1"],
         question="Which managed Redis should the BullMQ workers use in production?",
         context="D3 puts the backend in Docker on Fly.io Mumbai; BullMQ (prep/Outline.md:106) needs Redis. Local dev uses Redis in docker compose.",
         options=["Upstash Redis through Fly (fly redis create): billed on the Fly invoice, close to the app",
                  "Upstash direct: own account and dashboard, same engine",
                  "Self-run Redis on a Fly machine: cheapest, we own persistence and upgrades"],
         recommend="Upstash through Fly, for one bill and no servers to run"),
    dict(title="Web frontend host: Vercel or Fly", area="vendor", blocks=["1.1"],
         question="Should the Next.js web app (catalog, portal, workspace) deploy to Vercel, or to Fly alongside the backend?",
         context="prep/Outline.md:106 says Vercel / Fly.io. D3 places the backend on Fly Mumbai. Both CLIs are logged in.",
         options=["Vercel: best Next.js support and per-PR previews; edge CDN; data still in Neon Mumbai",
                  "Fly: one platform and one bill, app next to the API in Mumbai; previews need our own setup"],
         recommend="Vercel for the web app, Fly for API + workers"),
    dict(title="CA and lawyer: names and emails", area="people", blocks=["B0.2"],
         question="Once engaged, who are the CA and the lawyer (name, email), so their reviews can be assigned in Linear?",
         context="D7: neither is engaged yet. The CA reviews invoices on days 5 and 18; the lawyer approves legal text by day 8 (blocks launch).",
         options=["Reply with names + emails when engaged", "Founder handles them outside Linear; skip invites"],
         recommend="Invite both to Linear so B0.5 / B1.1 reviews are tracked"),
    dict(title="Engineers, designer and verifiers to invite", area="people", blocks=["0.1"],
         question="Who are the two engineer-reviewers and the designer, so they can be invited to Linear as assignees and verifiers?",
         context="prep/WBS.md Dev team: two engineers as reviewers of record and one designer. Workflow doc: the assignee and the verifier must be different people.",
         options=["Reply with names + emails", "Saurabh verifies everything for now (breaks the two-person rule)"],
         recommend="Invite at least one more engineer before day 1 so every PR has a second person"),
    dict(title="Build day 1 date", area="product", blocks=["0.1"],
         question="Which calendar date is day 1 of the 10-day Phase 1 build?",
         context="prep/WBS.md plans in day numbers. Linear cycles (one per day) and due dates need a real start date.",
         options=["A specific date (reply with it)", "Start as soon as the CA / lawyer are engaged"],
         recommend="Pick a Monday so the day-10 go / no-go lands on a weekday"),
]

LABEL_COLORS = {"phase": "#5E6AD2", "area": "#4EA7FC", "team": "#26B5CE", "q": "#F2C94C", "wbs": "#95A2B3"}


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


# ---------- parse ----------

def parse_wbs():
    section = None
    rows = []
    for line in WBS.read_text(encoding="utf-8").splitlines():
        if line.startswith("### Phase 1"):
            section = "phase1"
        elif line.startswith("### Phase 2"):
            section = "phase2"
        elif line.startswith("### Phase 3"):
            section = "phase3"
        elif line.startswith("## Business team"):
            section = "business"
        elif line.startswith("## Sales"):
            section = "sales"
        elif line.startswith("## Schedule summary"):
            section = None
        if not section or not line.startswith("| "):
            continue
        # Linear shows the current wording only: drop D41 "~~old~~" struck text, keep the (Dxx) note.
        cells = [re.sub(r"~~.*?~~\s*", "", c).strip() for c in line.strip().strip("|").split(" | ")]
        if len(cells) < 7 or cells[0] in ("WBS",) or cells[0].startswith("---") or cells[0].startswith("**"):
            continue
        wbs_id, amended = cells[0].replace("†", "").strip(), "†" in cells[0]
        rows.append({
            "id": wbs_id, "amended": amended, "section": section,
            "name": cells[1], "done": cells[2], "window": cells[3], "depends": cells[4],
            "verify": cells[5],
        })
    return rows


def expand_deps(row):
    """'2.2, 2.3' / 'Business 0.5' / 'Dev 2.5' / '2.4–2.6' / 'B0.2' -> list of WBS ids."""
    out = []
    for part in re.split(r",\s*", row["depends"]):
        part = re.sub(r"\(.*?\)", "", part).strip()
        if part in ("—", "-", "", "all", "pilot", "Phase 1"):
            continue
        prefix = ""
        m = re.match(r"^(Dev|Business|Sales)\s+(.*)$", part)
        if m:
            prefix = {"Dev": "", "Business": "B", "Sales": "S"}[m.group(1)]
            part = m.group(2)
        rng = re.match(r"^([BS]?)(\d+)\.(\d+)[–-](\d+)\.(\d+)$", part)
        if rng:
            p, major, lo, _, hi = rng.groups()
            out += [f"{prefix or p}{major}.{n}" for n in range(int(lo), int(hi) + 1)]
            continue
        if not re.match(r"^[BS]", part):
            part = prefix + part
        out.append(DEP_ALIAS.get(f"{part}@{row['id']}", part))
    return out


def estimate(window):
    m = re.match(r"^(\d+)(?:[–-](\d+))?$", window.strip())
    if not m:
        return None
    lo, hi = int(m.group(1)), int(m.group(2) or m.group(1))
    days = hi - lo + 1
    return days if days <= 5 else None


def labels_for(row):
    sec = row["section"]
    team = {"business": "business", "sales": "sales"}.get(sec, "dev")
    names = [f"team:{team}", f"wbs:{row['id']}"]
    if sec.startswith("phase"):
        names.append(f"phase:{sec[-1]}")
    if row["id"] in AREA_OF:
        names.append(f"area:{AREA_OF[row['id']]}")
    if row["id"] in PII:
        names.append("pii")
    if row["id"] in RISK_HIGH:
        names.append("risk:high")
    return names


def description(row, deps):
    amend = AMEND.get(row["id"], {})
    done = amend.get("done", row["done"])
    verify = amend.get("verify", row["verify"])
    unit = "Weeks" if row["section"] == "phase3" else "Days"
    verifier = "Verified by" if row["section"] in ("business", "sales") else "Human verifies"
    lines = [
        f"**WBS {row['id']}** · {PROJECTS[row['section']][0]} · {unit} {row['window']}",
        "",
        "**Done when**",
        done,
        "",
        f"**{verifier}**",
        verify,
        "",
        "**Acceptance checklist**",
    ]
    lines += [f"- [ ] {item.strip()}" for item in verify.split(";") if item.strip()]
    lines += ["", f"**Depends on:** {', '.join(deps) or '—'} (original: {row['depends']})"]
    if row["amended"]:
        lines.append("_Row marked † in the WBS: amended after the Workflow, Architecture and Market fit reviews._")
    if amend.get("note"):
        lines.append(f"_Changed by decision {amend['note']} in `docs/decisions.md`._")
    lines += ["", "Source: `prep/WBS.md`. Business facts not stated in Prep or docs/decisions.md must be asked (biz-linear-question), not assumed."]
    return "\n".join(lines)


# ---------- Linear ----------

def ensure_team():
    data = gql("query($key: String!) { teams(filter: {key: {eq: $key}}) { nodes { id } } }", {"key": TEAM["key"]})
    if data["teams"]["nodes"]:
        return data["teams"]["nodes"][0]["id"], False
    t = gql(
        """mutation($input: TeamCreateInput!) { teamCreate(input: $input) { team { id } } }""",
        {"input": {**TEAM, "cyclesEnabled": False, "issueEstimationType": "linear"}},
    )["teamCreate"]["team"]
    return t["id"], True


def team_state(team_id):
    t = gql(
        """query($id: String!) { team(id: $id) {
          states { nodes { id name type position } }
          labels(first: 250) { nodes { id name } }
          projects(first: 100) { nodes { id name } }
        } }""",
        {"id": team_id},
    )["team"]
    return t


def ensure_states(team_id, existing):
    names = {s["name"]: s for s in existing}
    started = names.get("In Progress")
    base = started["position"] if started else 100
    created = 0
    for i, (name, typ, color) in enumerate(STATES, 1):
        if name in names:
            continue
        gql(
            """mutation($input: WorkflowStateCreateInput!) { workflowStateCreate(input: $input) { success } }""",
            {"input": {"teamId": team_id, "name": name, "type": typ, "color": color, "position": base + i * 0.1}},
        )
        created += 1
    return created


# Workflow doc "Automation": PR opened -> In Review, checks green -> Ready to verify; only the
# human moves to Done, so a merge into dev or main takes no action (a no-action rule needs a
# target branch). The rules act once Linear's GitHub integration is installed.
GIT_RULES = [("start", "In Progress"), ("draft", "In Progress"), ("review", "In Review"), ("mergeable", "Ready to verify")]
GIT_TARGET = r"^(dev|main)$"


def ensure_git_automation(team_id, states):
    t = gql(
        """query($id: String!) { team(id: $id) {
          gitAutomationStates { nodes { event targetBranch { id branchPattern } } }
        } }""",
        {"id": team_id},
    )["team"]
    have = {(r["event"], (r["targetBranch"] or {}).get("branchPattern")) for r in t["gitAutomationStates"]["nodes"]}
    target = next((r["targetBranch"]["id"] for r in t["gitAutomationStates"]["nodes"]
                   if r["targetBranch"] and r["targetBranch"]["branchPattern"] == GIT_TARGET), None)
    if target is None:
        target = gql(
            """mutation($input: GitAutomationTargetBranchCreateInput!) {
              gitAutomationTargetBranchCreate(input: $input) { targetBranch { id } } }""",
            {"input": {"teamId": team_id, "branchPattern": GIT_TARGET, "isRegex": True}},
        )["gitAutomationTargetBranchCreate"]["targetBranch"]["id"]
    wanted = [(e, s, None) for e, s in GIT_RULES]
    wanted += [(e, s, target) for e, s in GIT_RULES if e != "start"] + [("merge", None, target)]
    created = 0
    for event, state, branch in wanted:
        if (event, GIT_TARGET if branch else None) in have:
            continue
        rule = {"teamId": team_id, "event": event, "stateId": states[state] if state else None}
        if branch:
            rule["targetBranchId"] = branch
        gql(
            """mutation($input: GitAutomationStateCreateInput!) { gitAutomationStateCreate(input: $input) { success } }""",
            {"input": rule},
        )
        created += 1
    return created


def ensure_labels(team_id, existing, wanted):
    have = {l["name"]: l["id"] for l in existing}
    created = 0
    for name in wanted:
        if name in have:
            continue
        group = name.split(":")[0] if ":" in name else name
        color = LABEL_COLORS.get(group, {"pii": "#EB5757", "question": "#F2994A"}.get(name, "#95A2B3"))
        if name == "risk:high":
            color = "#EB5757"
        lab = gql(
            """mutation($input: IssueLabelCreateInput!) { issueLabelCreate(input: $input) { issueLabel { id } } }""",
            {"input": {"teamId": team_id, "name": name, "color": color}},
        )["issueLabelCreate"]["issueLabel"]
        have[name] = lab["id"]
        created += 1
    return have, created


def ensure_projects(team_id, existing):
    have = {p["name"]: p["id"] for p in existing}
    created = 0
    for key, (name, desc) in PROJECTS.items():
        if name in have:
            continue
        p = gql(
            """mutation($input: ProjectCreateInput!) { projectCreate(input: $input) { project { id } } }""",
            {"input": {"teamIds": [team_id], "name": name, "description": desc}},
        )["projectCreate"]["project"]
        have[name] = p["id"]
        created += 1
    return have, created


def existing_issues(team_id):
    by_wbs, after = {}, None
    while True:  # paged: Linear caps query complexity at 10,000
        data = gql(
            """query($id: String!, $after: String) { team(id: $id) { issues(first: 50, after: $after) {
              nodes { id identifier title relations(first: 20) { nodes { type relatedIssue { id } } } }
              pageInfo { hasNextPage endCursor }
            } } }""",
            {"id": team_id, "after": after},
        )
        page = data["team"]["issues"]
        for issue in page["nodes"]:
            head = issue["title"].split(" ", 1)[0]
            if re.match(r"^[BS]?\d+\.\d+$", head):
                by_wbs[head] = issue
        if not page["pageInfo"]["hasNextPage"]:
            return by_wbs
        after = page["pageInfo"]["endCursor"]


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--skip-questions", action="store_true")
    args = ap.parse_args()

    rows = parse_wbs()
    deps = {r["id"]: expand_deps(r) for r in rows}
    ids = {r["id"] for r in rows}
    missing = sorted({d for ds in deps.values() for d in ds if d not in ids})
    counts = {s: sum(r["section"] == s for r in rows) for s in PROJECTS if s != "questions"}
    print(f"Parsed {len(rows)} WBS rows: {counts}")
    if missing:
        sys.exit(f"Unresolved dependencies: {missing}")
    if args.dry_run:
        for r in rows:
            print(f"  {r['id']:6} {r['name'][:40]:40} deps={deps[r['id']]} labels={labels_for(r)} est={estimate(r['window'])}")
        return

    team_id, new_team = ensure_team()
    print(f"Team BIZ: {'created' if new_team else 'exists'}")
    t = team_state(team_id)
    print(f"States created: {ensure_states(team_id, t['states']['nodes'])}")
    t = team_state(team_id)
    states = {s["name"]: s["id"] for s in t["states"]["nodes"]}
    print(f"Git automation rules created: {ensure_git_automation(team_id, states)}")

    wanted = (["phase:1", "phase:2", "phase:3", "team:dev", "team:business", "team:sales", "risk:high", "pii", "question"]
              + [f"area:{a}" for a in AREAS] + [f"q:{q}" for q in Q_AREAS] + [f"wbs:{r['id']}" for r in rows])
    labels, n = ensure_labels(team_id, t["labels"]["nodes"], wanted)
    print(f"Labels created: {n}")
    projects, n = ensure_projects(team_id, t["projects"]["nodes"])
    print(f"Projects created: {n}")

    issues = existing_issues(team_id)
    created = 0
    for r in rows:
        if r["id"] in issues:
            continue
        inp = {
            "teamId": team_id,
            "title": f"{r['id']} {r['name']}",
            "description": description(r, deps[r["id"]]),
            "projectId": projects[PROJECTS[r["section"]][0]],
            "stateId": states["Backlog" if r["section"] in ("phase2", "phase3") else "Todo"],
            "labelIds": [labels[n] for n in labels_for(r)],
        }
        est = estimate(r["window"]) if r["section"] != "phase3" else None
        if est:
            inp["estimate"] = est
        if r["id"] in URGENT:
            inp["priority"] = 1
        elif r["id"] in RISK_HIGH:
            inp["priority"] = 2
        issue = gql(
            """mutation($input: IssueCreateInput!) { issueCreate(input: $input) { issue { id identifier title } } }""",
            {"input": inp},
        )["issueCreate"]["issue"]
        issue["relations"] = {"nodes": []}
        issues[r["id"]] = issue
        created += 1
        print(f"  + {issue['identifier']} {issue['title']}")
    print(f"Issues created: {created} (total WBS issues: {len(issues)})")

    rel_created = 0
    for r in rows:
        target = issues[r["id"]]
        for dep in deps[r["id"]]:
            src = issues[dep]
            already = any(n["type"] == "blocks" and n["relatedIssue"]["id"] == target["id"] for n in src["relations"]["nodes"])
            if already:
                continue
            gql(
                """mutation($input: IssueRelationCreateInput!) { issueRelationCreate(input: $input) { success } }""",
                {"input": {"issueId": src["id"], "relatedIssueId": target["id"], "type": "blocks"}},
            )
            src["relations"]["nodes"].append({"type": "blocks", "relatedIssue": {"id": target["id"]}})
            rel_created += 1
    print(f"Blocks relations created: {rel_created}")

    if args.skip_questions:
        return
    for q in SEED_QUESTIONS:
        cmd = [sys.executable, str(ASK), "ask", "--title", q["title"], "--area", q["area"],
               "--question", q["question"], "--context", q["context"], "--recommend", q["recommend"]]
        for o in q["options"]:
            cmd += ["--option", o]
        for b in q["blocks"]:
            cmd += ["--blocks", b]
        r = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8")
        print(f"  ? {q['title']}: {(r.stdout or r.stderr).strip()}")


if __name__ == "__main__":
    main()
