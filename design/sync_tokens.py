"""Copy brand/theme.css and brand/tailwind.css into design/screens-v2.html and design/app/index.html
between their BEGIN / END markers.

The screens files stay single offline HTML files, but their tokens always come from brand/ (D52).
Run after any token change:  python design/sync_tokens.py
"""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
for page in (ROOT / "design" / "screens-v2.html", ROOT / "design" / "app" / "index.html"):
    html = page.read_text(encoding="utf-8")
    for src in ("brand/theme.css", "brand/tailwind.css"):
        body = (ROOT / src).read_text(encoding="utf-8").strip()
        pattern = re.compile(rf"(/\* BEGIN {re.escape(src)} \*/).*?(/\* END {re.escape(src)} \*/)", re.S)
        html, n = pattern.subn(lambda m: m.group(1) + "\n" + body + "\n" + m.group(2), html)
        assert n == 1, f"markers for {src} not found once in {page}"
    page.write_text(html, encoding="utf-8")
    print("synced", page)
