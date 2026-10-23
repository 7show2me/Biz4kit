"""Biz4Kit progress report: Linear + git + decisions, local files only."""
import argparse, datetime as dt, html, json, re, subprocess, sys, webbrowser
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
STATES = ["triage", "backlog", "unstarted", "started", "completed", "canceled"]


def run(cmd):
    r = subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True, encoding="utf-8", shell=False)
    return r.stdout if r.returncode == 0 else ""


def linear(*extra):
    out = run(["linear", "issue", "query", "--team", "BIZ", "--limit", "all", "--no-pager", "--json", *extra])
    try:
        d = json.loads(out)
    except json.JSONDecodeError:
        return []
    return d if isinstance(d, list) else d.get("nodes", [])


def decisions():
    rows = []
    for line in (ROOT / "docs" / "decisions.md").read_text(encoding="utf-8").splitlines():
        m = re.match(r"\|\s*(D\d+)\s*\|\s*(\d{4}-\d{2}-\d{2})\s*\|\s*([^|]*)\|\s*([^|]*)\|\s*([^|]*)\|", line)
        if m:
            rows.append(dict(id=m[1], date=m[2], linear=m[3].strip(), question=m[4].strip(), decision=m[5].strip()))
    return rows


def build_day(rows, today):
    for r in rows:
        if "build day 1" in r["question"].lower():
            m = re.search(r"\d{4}-\d{2}-\d{2}", r["decision"])
            if m:
                start, n, d = dt.date.fromisoformat(m[0]), 0, dt.date.fromisoformat(m[0])
                while d <= today:
                    n += d.weekday() < 5
                    d += dt.timedelta(days=1)
                return start, n
    return None, None


def wbs_today(day):
    if not day:
        return []
    out = []
    for line in (ROOT / "prep" / "WBS.md").read_text(encoding="utf-8").splitlines():
        c = [x.strip() for x in line.split("|")]
        if len(c) > 6 and re.match(r"^[A-Z]?\d+\.\d+", c[1]):
            m = re.match(r"(\d+)(?:\s*[–-]\s*(\d+))?", c[4])
            if m and int(m[1]) <= day <= int(m[2] or m[1]):
                out.append(f"{c[1]} {c[2]}")
    return out


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    ap = argparse.ArgumentParser()
    ap.add_argument("--days", type=int, default=3)
    ap.add_argument("--open", action="store_true")
    a = ap.parse_args()
    today = dt.date.today()
    since = today - dt.timedelta(days=a.days)
    rows = decisions()
    start, day = build_day(rows, today)

    changed = linear("--updated-after", since.isoformat(), *[x for s in STATES for x in ("-s", s)])
    allopen = linear(*[x for s in ("triage", "backlog", "unstarted", "started") for x in ("-s", s)])
    key = lambda i: i["identifier"]
    fmt = lambda i: f"{i['identifier']} {i['title']} [{i['state']['name']}]"
    done = [i for i in changed if i["state"]["type"] in ("completed",)]
    answered = [i for i in changed if i["state"]["name"] == "Answered"]
    waiting = [i for i in allopen if i["state"]["name"] == "Needs answer"]
    started = [i for i in allopen if i["state"]["type"] == "started" and i["state"]["name"] != "Answered"]
    due = sorted((i for i in allopen if i.get("dueDate")), key=lambda i: i["dueDate"])
    commits = run(["git", "log", f"--since={since.isoformat()}", "--pretty=%h %s (%an, %ad)", "--date=short"]).splitlines()
    newdec = [r for r in rows if r["date"] >= since.isoformat()]

    sec = [
        (f"Window: {since} to {today}" + (f" | Build day {day} (day 1 = {start})" if day else ""), []),
        ("Done / answered in window", [fmt(i) for i in done + answered] or ["Nothing."]),
        ("Decisions recorded", [f"{r['id']} {r['question']}: {r['decision'][:140]}" for r in newdec] or ["None."]),
        ("Commits", commits or ["No commits."]),
        ("In progress", [fmt(i) for i in started] or ["Nothing started."]),
        ("Waiting on a person (Needs answer)", [fmt(i) for i in waiting] or ["None."]),
        ("Planned for today (WBS)", wbs_today(day) or ["No WBS items for today, or build day 1 is not set."]),
        ("Due", [f"{i['dueDate']} {fmt(i)}" for i in due] or ["No issue has a due date in Linear."]),
        (f"Open overall", [f"{len(allopen)} open issues"]),
    ]
    md = f"# Biz4Kit progress report, {today}\n\n"
    body = f"<h1>Biz4Kit progress report, {today}</h1>"
    for title, items in sec:
        md += f"## {title}\n" + "".join(f"- {x}\n" for x in items) + "\n"
        body += f"<h2>{html.escape(title)}</h2><ul>" + "".join(f"<li>{html.escape(x)}</li>" for x in items) + "</ul>"
    page = ("<!doctype html><meta charset=utf-8><title>Biz4Kit progress</title><style>"
            "body{font:15px/1.5 system-ui,sans-serif;max-width:760px;margin:2rem auto;padding:0 1rem;color:#1a1a2e}"
            "h2{margin-top:1.6rem;font-size:1.05rem}li{margin:.2rem 0}</style>" + body)
    out = ROOT / "reports"
    out.mkdir(exist_ok=True)
    (out / f"progress-{today}.md").write_text(md, encoding="utf-8")
    h = out / f"progress-{today}.html"
    h.write_text(page, encoding="utf-8")
    print(md)
    print(f"Local files: {h}")
    if a.open:
        webbrowser.open(h.as_uri())


if __name__ == "__main__":
    sys.exit(main())
