"""Build brand/design-system/index.html: the whole Biz4Kit design system as one docs-style page you open locally.

Reads design-system/README.md, tokens.json and components/Cover/preview.html, and uses ../theme.css and
assets/Logos/*.svg. Nothing is fetched from a server except the Google Fonts stylesheet.

  uv run --no-project --with markdown python -I brand/build_design_system.py
"""
import html
import json
import re
from pathlib import Path

import markdown

DS = Path(__file__).resolve().parent / "design-system"
tokens = json.loads((DS / "tokens.json").read_text(encoding="utf-8"))
md = lambda s: markdown.markdown(s, extensions=["extra", "sane_lists"])
book = md((DS / "README.md").read_text(encoding="utf-8"))
logo_readme = md((DS / "assets/Logos/README.md").read_text(encoding="utf-8"))
cover_src = (DS / "components/Cover/preview.html").read_text(encoding="utf-8")
cover_css = re.sub(r"html, body \{[^}]*\}", "", re.search(r"<style>(.*?)</style>", cover_src, re.S).group(1))
cover_html = re.sub(r"<!--.*?-->", "", re.search(r'(<div class="cover">.*?</div>\s*)<script>', cover_src, re.S).group(1), flags=re.S)
cover_html = cover_html.replace("../../assets/", "assets/")
cover_css = cover_css.replace('[data-theme="dark"]', ".dark")  # the page toggles a .dark class
# the brand book is long: split it at its h2s so it can be a few short docs sections
book_parts = re.split(r"(?=<h2>)", book)
book_intro, book_secs = book_parts[0], book_parts[1:]

LOGOS = [
    ("biz4kit-lockup.svg", "Lockup", "light", "Mark and name. Light grounds, transparent."),
    ("biz4kit-lockup-dark.svg", "Lockup, dark", "dark", "Own dark tile with a border; shows on any page."),
    ("biz4kit-lockup-white.svg", "Lockup, white", "indigo", "Photos and the primary fill, transparent."),
    ("biz4kit-logo.svg", "Mark", "light", "Sidebar and small spaces on light."),
    ("biz4kit-logo-dark.svg", "Mark, dark", "dark", "Own dark tile with a border."),
    ("biz4kit-logo-white.svg", "Mark, white", "photo", "On photos, transparent."),
    ("biz4kit-app-icon.svg", "App icon", "light", "Favicon, PWA, Expo, avatar."),
]
def size(name):
    m = re.search(r'width="(\d+)" height="(\d+)"', (DS / "assets/Logos" / name).read_text(encoding="utf-8"))
    return int(m[1]), int(m[2])
def logo_cards_for(rows):
    return "".join(
        f'<figure class="card"><div class="stage {g}"><img src="assets/Logos/{f}" width="{size(f)[0]}" height="{size(f)[1]}" alt="Biz4Kit {t}"></div>'
        f'<figcaption><b>{f}</b><span>{size(f)[0]} × {size(f)[1]}. {n}</span></figcaption></figure>' for f, t, g, n in rows)
# 3 lockups in one complete row, then the 4 marks and the icon in another
logo_cards = (f'<h3>Lockups</h3><div class="grid c3">{logo_cards_for(LOGOS[:3])}</div>'
              f'<h3>Mark and app icon</h3><div class="grid c4">{logo_cards_for(LOGOS[3:])}</div>')

GROUPS = [
    ("Surfaces", ["background", "foreground", "card", "card-foreground", "popover", "popover-foreground"]),
    ("Brand", ["primary", "primary-foreground", "secondary", "secondary-foreground", "accent", "accent-foreground", "brand-ink", "brand-blue"]),
    ("Neutrals and focus", ["muted", "muted-foreground", "border", "input", "ring"]),
    ("Status", ["destructive", "destructive-foreground"]),
    ("Charts", ["chart-1", "chart-2", "chart-3", "chart-4", "chart-5"]),
    ("Sidebar", ["sidebar", "sidebar-foreground", "sidebar-primary", "sidebar-primary-foreground", "sidebar-accent", "sidebar-accent-foreground", "sidebar-border", "sidebar-ring"]),
]
PAIRS = [("background", "foreground"), ("card", "card-foreground"), ("primary", "primary-foreground"), ("secondary", "secondary-foreground"),
         ("accent", "accent-foreground"), ("muted", "muted-foreground"), ("destructive", "destructive-foreground"), ("sidebar", "sidebar-foreground"),
         ("sidebar-accent", "sidebar-accent-foreground")]
by_name = {t["name"]: t for t in tokens["color"]["tokens"]}
assert all(n in by_name for _, names in GROUPS for n in names), "token missing from tokens.json"
pairs = "".join(f'<div class="pair" style="background:var(--{b}); color:var(--{f})"><b>Aa</b><span>{f}<br>on {b}</span></div>' for b, f in PAIRS)
def value(name, theme):
    v = by_name[name]["value"]
    v = v if isinstance(v, str) else v.get(theme, v["light"])
    return value(v[1:-1], theme) if v.startswith("{") else v  # resolve aliases like {primary}
def row(n):
    lt, dk = value(n, "light"), value(n, "dark")
    return (f'<tr><td class="sw"><i style="background:{lt}"></i></td><td class="sw"><i style="background:{dk}"></i></td>'
            f'<td><button type="button" class="tokname" data-name="{n}" title="Copy var(--{n})">{n}</button></td>'
            f'<td class="vals"><code><b>L</b>{lt}</code><code><b>D</b>{dk}</code></td><td class="use">{html.escape(by_name[n]["usage"])}</td></tr>')
colour = "".join(
    f'<h3>{title}</h3><div class="tablebox"><table class="ctable"><colgroup><col class="c-sw"><col class="c-sw"><col class="c-tok"><col class="c-val"><col></colgroup>'
    f'<thead><tr><th>Light</th><th>Dark</th><th>Token</th><th>Values</th><th>Usage</th></tr></thead>'
    f'<tbody>{"".join(row(n) for n in names)}</tbody></table></div>' for title, names in GROUPS)

FAM_NOTE = {"serif": ("Fraunces", "Headings and display, 24px and up. Warm, soft serif."),
            "sans": ("DM Sans", "The working UI: body, buttons, inputs, navigation."),
            "mono": ("DM Mono", "Every amount and identifier. Digits share one width.")}
famcards = "".join(
    f'<div class="card fam"><div class="role">{k}</div><div class="aa" style="font-family:var(--font-{k})">Aa</div><b>{FAM_NOTE[k][0]}</b><p>{FAM_NOTE[k][1]}</p>'
    f'<div class="alpha" style="font-family:var(--font-{k})">ABCDEFGHIJKLMNOPQRSTUVWXYZ<br>abcdefghijklmnopqrstuvwxyz<br>0123456789 ₹ &amp; @ #</div><code>{html.escape(v)}</code></div>'
    for k, v in tokens["type"]["families"].items())
styles = ""
for g in tokens["type"]["groups"]:
    rows = ""
    for s in g["styles"]:
        fam = s.get("family", g["family"])
        css = (f'font-family:var(--font-{fam}); font-size:{s["fontSize"]}; line-height:{s["lineHeight"]}; font-weight:{s["fontWeight"]};'
               + (f'letter-spacing:{s["letterSpacing"]};' if s.get("letterSpacing") else "")
               + ("text-transform:uppercase;" if s["name"] == "label" else "")
               + ("font-variant-numeric:tabular-nums;" if fam == "mono" else ""))
        rows += (f'<div class="trow"><div class="meta"><b>{s["name"]}</b><code>{fam} · {s["fontSize"]} / {s["lineHeight"]} · {s["fontWeight"]}</code>'
                 f'<p>{html.escape(s.get("usage", ""))}</p></div><div class="sample" style="{css}">{html.escape(s.get("sample", s["name"]))}</div></div>')
    styles += f'<h3>{g["name"]}</h3><div class="card trows">{rows}</div>'
amounts = "".join(f'<tr><td>{n}</td><td class="amt">{a}</td></tr>' for n, a in [("Bridal package, Premium", "₹48,500.00"), ("Hair colour, global", "₹3,200.00"), ("Advance received", "−₹10,000.00"), ("Balance due", "₹41,700.00")])
spacing = "".join(f'<div class="srow"><code>{t["name"]}</code><span class="bar" style="width:{t["value"]}"></span><code>{t["value"]}</code><p>{html.escape(t["usage"])}</p></div>' for t in tokens["spacing"]["tokens"])
radius = (f'<div class="tablebox"><table class="ctable rtable"><colgroup><col class="c-pre"><col class="c-tok"><col class="c-rv"><col></colgroup>'
          f'<thead><tr><th>Preview</th><th>Token</th><th>Value</th><th>Usage</th></tr></thead><tbody>'
          + "".join(f'<tr><td class="sw"><i class="rprev" style="border-radius:{t["value"]}"></i></td><td><b class="rname">{t["name"]}</b></td><td><code>{t["value"]}</code></td><td class="use">{html.escape(t["usage"])}</td></tr>' for t in tokens["radius"]["tokens"])
          + '</tbody></table></div>')
shadow = "".join(f'<div class="shd"><span style="box-shadow:{t["value"]}"></span><b>{t["name"]}</b><p>{html.escape(t["usage"])}</p></div>' for t in tokens["shadow"]["tokens"])

TEMPLATE = r'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Biz4Kit Design System</title>
<link rel="icon" type="image/svg+xml" href="assets/Logos/biz4kit-app-icon.svg">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=DM+Sans:opsz,wght@9..40,400..700&family=Fraunces:opsz,wght@9..144,500..800&display=swap">
<link rel="stylesheet" href="../theme.css">
<style>
  :root { --card-r: 10px; }
  * { box-sizing: border-box; }
  html { scroll-behavior: smooth; scroll-padding-top: 28px; }
  body { margin: 0; background: var(--background); color: var(--foreground); font: 400 15px/24px var(--font-sans); -webkit-font-smoothing: antialiased; }
  a { color: inherit; }
  .shell { display: grid; grid-template-columns: 252px minmax(0, 1fr) 208px; min-height: 100vh; }
  /* sidebar */
  nav.side { position: sticky; top: 0; height: 100vh; overflow-y: auto; padding: 24px 14px 32px; background: var(--sidebar); color: var(--sidebar-foreground); border-right: 1px solid var(--border); }
  nav.side .brand { display: block; margin: 0 8px 22px; } nav.side .brand img { display: block; height: 38px; width: auto; }
  nav.side h4 { margin: 20px 12px 6px; font: 500 11px/16px var(--font-mono); letter-spacing: .08em; text-transform: uppercase; opacity: .7; }
  nav.side a { display: block; padding: 7px 12px; border-radius: var(--radius-control, 8px); text-decoration: none; font-weight: 500; font-size: 14px; line-height: 20px; }
  nav.side a:hover { background: var(--accent); color: var(--accent-foreground); }
  nav.side a.on { background: var(--sidebar-accent); color: var(--sidebar-accent-foreground); }
  a:focus-visible, button:focus-visible, input:focus-visible { outline: 2px solid var(--ring); outline-offset: 2px; }
  #theme { margin: 22px 12px 0; font: 500 13px/18px var(--font-sans); padding: 8px 14px; border-radius: var(--radius-control, 8px); border: 1px solid var(--border); background: var(--card); color: var(--foreground); cursor: pointer; }
  /* main */
  main { min-width: 0; padding: 0 clamp(20px, 4vw, 56px) 120px; }
  .hero { margin: 0 calc(-1 * clamp(20px, 4vw, 56px)) 56px; padding: 56px clamp(20px, 4vw, 56px) 0; }
  .eyebrow { font: 500 12px/16px var(--font-mono); letter-spacing: .08em; text-transform: uppercase; color: var(--muted-foreground); margin: 0 0 14px; }
  h1 { font: 700 clamp(36px, 5vw, 56px)/1.04 var(--font-serif); letter-spacing: -.01em; margin: 0 0 16px; text-wrap: balance; max-width: 22ch; }
  h2 { font: 700 32px/38px var(--font-serif); letter-spacing: -.005em; margin: 0 0 10px; text-wrap: balance; }
  h3 { font: 600 17px/24px var(--font-sans); margin: 36px 0 12px; }
  p.lead { color: var(--muted-foreground); font-size: 17px; line-height: 27px; margin: 0 0 28px; max-width: 60ch; }
  section { margin: 0 0 88px; }
  section > .head { padding-top: 8px; margin-bottom: 28px; border-top: 1px solid var(--border); padding-top: 28px; }
  code { font: 500 12px/18px var(--font-mono); color: var(--muted-foreground); overflow-wrap: anywhere; }
  .card { display: flex; flex-direction: column; min-width: 0; border: 1px solid var(--border); border-radius: var(--card-r); background: var(--card); box-shadow: var(--shadow-sm); overflow: hidden; margin: 0; }
  .cover-box { border-radius: var(--card-r); overflow: hidden; border: 1px solid var(--border); box-shadow: var(--shadow-md); }
  .cover-fit { width: 100%; }
  @@COVER_CSS@@
  .cover { transform-origin: 0 0; }
  .book { max-width: 68ch; } .book p, .book li { margin: 0 0 10px; } .book ul { padding-left: 22px; margin: 0 0 18px; }
  .book h2 { font: 600 20px/28px var(--font-sans); margin: 0 0 10px; }
  .book code { background: var(--muted); padding: 1px 6px; border-radius: 8px; color: var(--foreground); }
  .book .sub { padding: 24px 0; border-top: 1px solid var(--border); } .book .sub:first-child { border-top: 0; padding-top: 0; }
  .tablebox { overflow-x: auto; border: 1px solid var(--border); border-radius: var(--card-r); background: var(--card); }
  .tablebox table, .book table { border-collapse: collapse; width: 100%; font-size: 14px; }
  .tablebox th, .tablebox td, .book th, .book td { text-align: left; padding: 10px 16px; border-bottom: 1px solid var(--border); }
  .tablebox tr:last-child td { border-bottom: 0; }
  .tablebox th { background: var(--muted); font: 500 12px/16px var(--font-mono); letter-spacing: .06em; text-transform: uppercase; color: var(--muted-foreground); }
  .tablebox td.amt, td.amt { font: 500 14px/20px var(--font-mono); text-align: right; font-variant-numeric: tabular-nums; }
  .tablebox th.r { text-align: right; }
  .grid { display: grid; gap: 16px; grid-auto-rows: 1fr; }
  .grid.c3 { grid-template-columns: repeat(3, minmax(0, 1fr)); } .grid.c4 { grid-template-columns: repeat(4, minmax(0, 1fr)); }
  .stage { flex: 1; display: flex; align-items: center; justify-content: center; height: 188px; padding: 24px; }
  .stage img { display: block; max-width: 100%; height: auto; }
  .stage.light { background: var(--background); } .stage.dark { background: #0a0e1e; } .stage.indigo { background: #03035e; }
  .stage.photo { background: linear-gradient(135deg, #5f78f7, #d946ef 55%, #f59e0b); }
  figcaption { padding: 12px 16px; border-top: 1px solid var(--border); min-height: 74px; }
  figcaption b { display: block; font: 500 13px/18px var(--font-mono); } figcaption span { color: var(--muted-foreground); font-size: 13px; line-height: 18px; }
  .pairs { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; grid-auto-rows: 76px; }
  .pair { display: flex; align-items: center; gap: 14px; padding: 0 18px; border: 1px solid var(--border); border-radius: var(--card-r); }
  .pair b { font: 700 30px/34px var(--font-serif); } .pair span { font: 500 12px/16px var(--font-mono); }
  .toks { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 300px), 1fr)); gap: 12px; }
  .ctable { table-layout: fixed; min-width: 760px; }
  .ctable col.c-sw { width: 58px; } .ctable col.c-tok { width: 196px; } .ctable col.c-val { width: 252px; }
  .ctable td { vertical-align: middle; height: 76px; padding: 0 12px; } .ctable th { padding: 10px 12px; } .ctable td.sw { padding-right: 0; }
  .ctable td.sw i { display: block; width: 40px; height: 40px; border-radius: 8px; border: 1px solid var(--border); }
  .rtable { min-width: 560px; } .rtable col.c-pre { width: 96px; } .rtable col.c-tok { width: 190px; } .rtable col.c-rv { width: 110px; }
  .rtable td.sw { padding-right: 0; } .rtable i.rprev { display: block; width: 52px; height: 52px; background: var(--secondary); border: 1px solid var(--border); }
  .rname { font: 600 14px/20px var(--font-sans); }
  .ctable td.use { color: var(--muted-foreground); font-size: 13px; line-height: 18px; }
  .ctable td.vals code { display: flex; gap: 8px; white-space: nowrap; font-size: 11px; }
  .ctable td.vals code b { flex: none; width: 10px; color: var(--foreground); }
  .tokname { font: 600 14px/20px var(--font-sans); color: var(--foreground); background: none; border: 0; padding: 0; text-align: left; cursor: pointer; border-bottom: 1px dashed var(--muted-foreground); }
  .tokname.done { border-bottom-style: solid; color: var(--chart-1); }
  .tok { position: relative; display: flex; gap: 14px; min-width: 0; padding: 12px; text-align: left; font: inherit; color: inherit; border: 1px solid var(--border); border-radius: 18px; background: var(--card); cursor: pointer; }
  .tok:hover { border-color: var(--ring); }
  .tok i { flex: none; width: 56px; height: 56px; border-radius: 14px; border: 1px solid var(--border); }
  .tok span { display: block; min-width: 0; padding-right: 40px; } .tok b { display: block; font: 600 14px/20px var(--font-sans); }
  .tok em { display: block; margin-top: 4px; font-style: normal; color: var(--muted-foreground); font-size: 13px; line-height: 18px; } .tok .val { display: block; }
  .tok u { position: absolute; top: 12px; right: 12px; text-decoration: none; font: 500 11px/16px var(--font-mono); color: var(--muted-foreground); }
  .tok.done u { color: var(--foreground); }
  .fams { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; grid-auto-rows: 1fr; margin-bottom: 8px; }
  .fam { padding: 20px; } .fam .role { font: 500 11px/16px var(--font-mono); letter-spacing: .08em; text-transform: uppercase; color: var(--muted-foreground); }
  .fam .aa { font-size: 88px; line-height: 96px; font-weight: 600; margin: 6px 0; } .fam b { font: 600 15px/22px var(--font-sans); display: block; }
  .fam p { margin: 2px 0 14px; color: var(--muted-foreground); font-size: 13px; line-height: 18px; }
  .fam .alpha { font-size: 15px; line-height: 24px; overflow-wrap: anywhere; margin-bottom: 14px; }
  .trows { padding: 0 24px; } .trow { display: grid; grid-template-columns: minmax(130px, 230px) minmax(0, 1fr); gap: 24px; align-items: center; padding: 18px 0; border-bottom: 1px solid var(--border); }
  .trow:last-child { border-bottom: 0; } .trow .meta b { display: block; font: 600 14px/20px var(--font-sans); }
  .trow .meta p { margin: 4px 0 0; color: var(--muted-foreground); font-size: 13px; line-height: 18px; } .sample { min-width: 0; overflow-wrap: anywhere; }
  .srow { display: grid; grid-template-columns: 90px minmax(0, 1fr) 56px; gap: 12px; align-items: center; padding: 8px 0; }
  .srow p { grid-column: 2 / 4; margin: 0; color: var(--muted-foreground); font-size: 13px; line-height: 18px; }
  .bar { height: 16px; border-radius: 6px; background: var(--primary); max-width: 100%; }
  .rads, .shds { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 16px; grid-auto-rows: 1fr; }
  .rad, .shd { display: flex; flex-direction: column; }
  .rad span { display: block; height: 96px; background: var(--secondary); border: 1px solid var(--border); margin-bottom: 8px; }
  .shd span { display: block; height: 96px; border-radius: var(--card-r); background: var(--card); margin-bottom: 12px; }
  .rad b, .shd b { display: block; font: 600 14px/20px var(--font-sans); } .rad p, .shd p { margin: 4px 0 0; color: var(--muted-foreground); font-size: 13px; line-height: 18px; }
  .shds { padding: 24px; background: var(--muted); border-radius: var(--card-r); }
  /* components: built only from tokens */
  .demo { padding: 28px; display: flex; flex-wrap: wrap; gap: 12px; align-items: center; background: var(--background); border: 1px solid var(--border); border-radius: var(--card-r); }
  .demo + .note { margin: 10px 2px 0; color: var(--muted-foreground); font-size: 13px; line-height: 18px; }
  .btn { font: 500 14px/20px var(--font-sans); padding: 10px 18px; border-radius: var(--radius-control, 8px); border: 1px solid transparent; cursor: pointer; }
  .btn.primary { background: var(--primary); color: var(--primary-foreground); }
  .btn.secondary { background: var(--secondary); color: var(--secondary-foreground); }
  .btn.ghost { background: transparent; color: var(--foreground); } .btn.ghost:hover { background: var(--accent); color: var(--accent-foreground); }
  .btn.danger { background: var(--destructive); color: var(--destructive-foreground); }
  .btn.disabled { background: var(--muted); color: var(--muted-foreground); cursor: not-allowed; }
  .btn.focus { outline: 2px solid var(--ring); outline-offset: 2px; }
  .field { display: grid; gap: 6px; min-width: 220px; flex: 1; } .field label { font: 500 13px/18px var(--font-sans); }
  .field input { font: 400 15px/22px var(--font-sans); padding: 10px 14px; border-radius: var(--radius-sm, 16px); border: 1px solid var(--input); background: var(--card); color: var(--foreground); width: 100%; }
  .field input::placeholder { color: var(--muted-foreground); } .field small { color: var(--muted-foreground); font-size: 13px; line-height: 18px; }
  .field input.mono { font: 500 14px/20px var(--font-mono); }
  .pill { display: inline-flex; align-items: center; gap: 6px; padding: 3px 12px; border-radius: 999px; font: 500 12px/16px var(--font-sans); letter-spacing: .04em; text-transform: uppercase; }
  .pill.paid { background: var(--secondary); color: var(--secondary-foreground); } .pill.due { background: var(--muted); color: var(--muted-foreground); }
  .pill.over { background: var(--destructive); color: var(--destructive-foreground); } .pill.draft { border: 1px solid var(--border); color: var(--foreground); }
  .inv { padding: 20px 24px; min-width: min(100%, 320px); flex: 1; }
  .inv .top { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; } .inv h4 { font: 600 22px/28px var(--font-serif); margin: 0; }
  .inv p { margin: 4px 0 16px; color: var(--muted-foreground); font-size: 13px; line-height: 18px; }
  .inv .big { font: 500 28px/34px var(--font-mono); font-variant-numeric: tabular-nums; margin-bottom: 14px; }
  @media (max-width: 1500px) { .grid.c4, .rads, .shds { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
  @media (max-width: 1320px) { .grid.c3, .fams { grid-template-columns: repeat(1, minmax(0, 1fr)); } .grid.c3 .stage { height: 168px; } }
  @media (max-width: 1360px) { .shell { grid-template-columns: 240px minmax(0, 1fr); } aside.toc { display: none; } }
  aside.toc { position: sticky; top: 0; height: 100vh; overflow-y: auto; padding: 56px 20px 24px 8px; font-size: 13px; line-height: 18px; }
  aside.toc h4 { margin: 0 0 10px; font: 500 11px/16px var(--font-mono); letter-spacing: .08em; text-transform: uppercase; color: var(--muted-foreground); }
  aside.toc a { display: block; padding: 5px 0 5px 12px; border-left: 2px solid var(--border); color: var(--muted-foreground); text-decoration: none; }
  aside.toc a:hover, aside.toc a.on { color: var(--foreground); border-left-color: var(--primary); }
  @media (max-width: 560px) { .pairs { grid-template-columns: repeat(1, minmax(0, 1fr)); } }
  @media (max-width: 820px) {
    .shell { grid-template-columns: minmax(0, 1fr); }
    nav.side { position: static; height: auto; display: flex; flex-wrap: wrap; align-items: center; gap: 4px; padding: 14px 16px; border-right: 0; border-bottom: 1px solid var(--border); }
    nav.side .brand { margin: 0 12px 0 0; } nav.side .brand img { height: 30px; } nav.side h4 { display: none; } #theme { margin: 0 0 0 auto; }
    .grid.c4, .rads, .shds { grid-template-columns: repeat(1, minmax(0, 1fr)); }
    .hero { padding-top: 32px; } .trow { grid-template-columns: minmax(0, 1fr); gap: 8px; } .trows { padding: 0 16px; }
  }
</style>
</head>
<body>
<div class="shell">
  <nav class="side" id="side">
    <a class="brand" href="#overview" aria-label="Biz4Kit"><img src="assets/Logos/biz4kit-lockup.svg" alt="Biz4Kit" id="navlogo"></a>
    <h4>Start</h4><a href="#overview">Overview</a><a href="#book">Brand book</a><a href="#logos">Logos</a>
    <h4>Foundations</h4><a href="#colour">Colour</a><a href="#type">Typography</a><a href="#shape">Spacing and radius</a><a href="#depth">Shadows</a>
    <h4>Components</h4><a href="#buttons">Buttons</a><a href="#inputs">Inputs</a><a href="#pills">Status pills</a><a href="#cards">Cards and tables</a>
    <button id="theme" type="button" aria-pressed="false">Dark theme</button>
  </nav>
  <main>
    <div class="hero" id="overview">
      <p class="eyebrow">Version 1 · Local files</p>
      <h1>Design system</h1>
      <p class="lead">Biz4Kit's own brand, as owners and staff see it in the workspace chrome. A business's customers see the business's brand instead. Everything here is built from the files in this folder.</p>
      <div class="cover-box"><div class="cover-fit" id="coverfit">@@COVER_HTML@@</div></div>
    </div>

    <section id="book"><div class="head"><h2>Brand book</h2></div><div class="book">@@BOOK@@</div></section>

    <section id="logos"><div class="head"><h2>Logos</h2><p class="lead">Each file at its own size, on the ground it is made for.</p></div>
      @@LOGOS@@<div class="book" style="margin-top:28px">@@LOGO_README@@</div></section>

    <section id="colour"><div class="head"><h2>Colour</h2><p class="lead">Indigo and electric blue on violet-tinted neutrals, in light and dark. Both themes are shown side by side. Click a token name to copy its CSS variable.</p></div>
      <h3>Text on surface pairs</h3><div class="pairs">@@PAIRS@@</div>@@COLOUR@@</section>

    <section id="type"><div class="head"><h2>Typography</h2><p class="lead">A serif for the voice, a sans for the work, a mono for the numbers. Needs a connection the first time to load Google Fonts.</p></div>
      <div class="fams">@@FAMS@@</div>
      <h3>Amounts in DM Mono</h3>
      <div class="tablebox"><table><thead><tr><th>Item</th><th class="r">Amount</th></tr></thead><tbody>@@AMOUNTS@@</tbody></table></div>
      @@STYLES@@</section>

    <section id="shape"><div class="head"><h2>Spacing and radius</h2></div><h3>Spacing</h3><div class="card" style="padding:8px 24px">@@SPACING@@</div><h3>Radius</h3>@@RADIUS@@</section>
    <section id="depth"><div class="head"><h2>Shadows</h2></div><div class="shds">@@SHADOW@@</div></section>

    <section id="buttons"><div class="head"><h2>Buttons</h2><p class="lead">One primary action per view. Everything else is secondary or ghost. Labels are DM Sans 500, 14px.</p></div>
      <div class="demo"><button class="btn primary">Send invoice</button><button class="btn secondary">Save draft</button><button class="btn ghost">Cancel</button><button class="btn danger">Void invoice</button><button class="btn disabled" disabled>Sent</button><button class="btn primary focus">Focused</button></div>
      <p class="note">Primary uses <code>primary</code> and <code>primary-foreground</code>; destructive uses <code>destructive-foreground</code> on its fill. Focus is a 2px <code>ring</code>.</p></section>

    <section id="inputs"><div class="head"><h2>Inputs</h2><p class="lead">Every field has a visible label and a fill. The border is faint (decorative), so never rely on it alone.</p></div>
      <div class="demo"><div class="field"><label for="d1">Customer name</label><input id="d1" placeholder="Priya Deshmukh"><small>Shown on the quote and invoice.</small></div>
      <div class="field"><label for="d2">GST number</label><input id="d2" class="mono" value="27ABCDE1234F1Z5"><small>Identifiers use DM Mono.</small></div></div></section>

    <section id="pills" ><div class="head"><h2>Status pills</h2><p class="lead">Every status carries a word as well as a colour. They use theme tokens only.</p></div>
      <div class="demo"><span class="pill draft">Draft</span><span class="pill paid">✓ Paid</span><span class="pill due">● Due in 3 days</span><span class="pill over">! Overdue 7 days</span></div>
      <p class="note">The supplied theme has no green or amber, so Paid, Due and Overdue use secondary, muted and destructive. A green/amber set is an open question (Linear).</p></section>

    <section id="cards"><div class="head"><h2>Cards and tables</h2><p class="lead">Headings in Fraunces, amounts in DM Mono, labels in DM Sans.</p></div>
      <div class="demo" style="align-items:stretch"><div class="card inv"><div class="top"><h4>Invoice INV-2026-014</h4><span class="pill due">● Due in 3 days</span></div><p>Priya Deshmukh · issued 19 Oct 2026</p><div class="big">₹41,700.00</div><button class="btn primary">Request payment</button></div>
      <div class="card inv"><div class="top"><h4>Quote QT-2026-021</h4><span class="pill paid">✓ Accepted</span></div><p>Aarav Interiors · valid until 24 Nov 2026</p><div class="big">₹1,24,800.00</div><button class="btn secondary">Create invoice</button></div></div></section>
  </main>
  <aside class="toc" id="toc"><h4>On this page</h4><div id="toclinks"></div></aside>
</div>
<script id="tokens" type="application/json">@@TOKENS@@</script>
<script>
  const T = JSON.parse(document.getElementById("tokens").textContent).color;
  const root = document.documentElement, btn = document.getElementById("theme"), logo = document.getElementById("navlogo");
  function paint() {
    const dark = root.classList.contains("dark"), theme = dark ? "dark" : "light";
    btn.textContent = dark ? "Light theme" : "Dark theme"; btn.setAttribute("aria-pressed", dark);
    logo.src = dark ? "assets/Logos/biz4kit-lockup-dark.svg" : "assets/Logos/biz4kit-lockup.svg";
  }
  let saved = null; try { saved = localStorage.getItem("b4k-theme"); } catch (e) {}
  if (saved ? saved === "dark" : matchMedia("(prefers-color-scheme: dark)").matches) root.classList.add("dark");
  btn.addEventListener("click", () => { root.classList.toggle("dark"); try { localStorage.setItem("b4k-theme", root.classList.contains("dark") ? "dark" : "light"); } catch (e) {} paint(); });
  paint();
  // click a token name to copy its CSS variable
  document.querySelectorAll(".tokname").forEach(el => el.addEventListener("click", async () => {
    const text = "var(--" + el.dataset.name + ")", old = el.dataset.name;
    try { await navigator.clipboard.writeText(text); } catch (e) { const r = document.createRange(); r.selectNodeContents(el); getSelection().removeAllRanges(); getSelection().addRange(r); }
    el.classList.add("done"); el.textContent = "Copied"; setTimeout(() => { el.classList.remove("done"); el.textContent = old; }, 1200);
  }));
  // the cover is drawn 960px wide: scale it to the page
  const fit = document.getElementById("coverfit"), cover = fit.querySelector(".cover");
  function scale() { const k = Math.min(1, fit.clientWidth / 960); cover.style.transform = "scale(" + k + ")"; fit.style.height = (288 * k) + "px"; }
  addEventListener("resize", scale); scale();
  // brand-book sections get ids; sidebar and right-hand list follow the scroll
  document.querySelectorAll("#book .sub h2").forEach(h => { h.id = "book-" + h.textContent.toLowerCase().replace(/[^a-z0-9]+/g, "-"); });
  const sections = [...document.querySelectorAll("main > section")];
  const side = [...document.querySelectorAll("nav.side a:not(.brand)")], tocBox = document.getElementById("toclinks");
  function buildToc(sec) {
    const hs = [...sec.querySelectorAll(sec.id === "book" ? ".sub h2" : "h3")];
    tocBox.innerHTML = hs.map((h, i) => { if (!h.id) h.id = sec.id + "-" + i; return '<a href="#' + h.id + '">' + h.textContent + "</a>"; }).join("") || '<a href="#' + sec.id + '">Top</a>';
  }
  const io = new IntersectionObserver(es => { es.forEach(e => { if (e.isIntersecting) {
    side.forEach(a => a.classList.toggle("on", a.getAttribute("href") === "#" + e.target.id)); buildToc(e.target); } }); }, { rootMargin: "-20% 0px -70% 0px" });
  sections.forEach(s => io.observe(s)); buildToc(sections[0]);
</script>
</body>
</html>
'''
# wrap each brand-book h2 block so it reads as its own docs section
book_html = book_intro + "".join(f'<div class="sub">{p}</div>' for p in book_secs)
page = (TEMPLATE.replace("@@COVER_CSS@@", cover_css).replace("@@COVER_HTML@@", cover_html).replace("@@BOOK@@", book_html)
        .replace("@@LOGOS@@", logo_cards).replace("@@LOGO_README@@", logo_readme).replace("@@PAIRS@@", pairs).replace("@@COLOUR@@", colour)
        .replace("@@FAMS@@", famcards).replace("@@AMOUNTS@@", amounts).replace("@@STYLES@@", styles).replace("@@SPACING@@", spacing)
        .replace("@@RADIUS@@", radius).replace("@@SHADOW@@", shadow)
        .replace("@@TOKENS@@", json.dumps({"color": by_name}).replace("</", "<\\/")))
out = DS / "index.html"
out.write_text(page, encoding="utf-8")
print("wrote", out, len(page))
