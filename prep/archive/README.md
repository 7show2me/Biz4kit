# Archive

Files moved out of `docs/`, `brand/`, `design/` and `reports/` because a newer file or a decision replaced them. Kept for history; nothing reads them. Older text (rows in `docs/decisions.md`, comments in the frozen `design/screens-v2.html`) still names the old path; the **Was** column says where to find it.

| File | Was | Replaced by |
| ---- | --- | ----------- |
| `design/screens-v1.html` | `design/screens.html`, the first Phase 1 screens | `design/screens-v2.html` (the prototype) |
| `docs/plan-lead-first.html` | `docs/plan-lead-first.html`, the 20 Oct lead-first plan | Done: recorded as D59–D67 in `docs/decisions.md` and built into the prototype |
| `brand/design-system.json` | `brand/design-system/design-system.json`, the claude.ai design-system index | `brand/design-system/index.html` (local, D19); its upload ids no longer resolve |
| `design/dashboard_design_part1.jpeg`, `design/dashboard_design_part2.jpeg` | Same paths (moved 2026-10-23) | Nothing references them; the dashboard is built in `design/screens-v2.html` and `design/app/` |
| `docs/status-flow.html` | `docs/status-flow.html` (moved 2026-10-23), named in D68 and D70 | `docs/flow.html`; status words and colours are in D68–D70 and `design/app/js/ui/kit.js` |
| `reports/benchmark-2026-10-20.html`, `reports/benchmark-v2-2026-10-20.html` | `reports/` (moved 2026-10-23), named in D70 | Answered in D70; the prototype is `design/app/` |
| `reports/progress-2026-10-19.html`, `.md` | `reports/` (moved 2026-10-23) | A new report from the `biz-progress-report` skill |
| `reports/prototype-vs-prep-2026-10-22.html` | `reports/` (moved 2026-10-23) | Point-in-time comparison; superseded by later decisions |
| `reports/sidebar-names-2026-10-22.html` | `reports/` (moved 2026-10-23), named in D80 | Answered in D80 |
| `reports/sidebar-options-2026-10-21.html` | `reports/` (moved 2026-10-23), named in D82 | Answered in D82 and D83 |

`brand/design-system/assets/Logos/*.svg` were byte-for-byte copies of `brand/logo/*.svg` and were removed on 2026-10-23 rather than archived; the design system now reads `brand/logo/` and its README moved to `brand/logo/README.md`.

## 2026-10-24: the prep documents

`prep/archive/2026-10-24/` holds every prep document as it was before the 24 Oct rewrite: the eight `.md` files (last edited 22 Oct, with strike-through patches) and their `.docx` / `.pdf` copies (18 Oct). The `.md` files in `prep/` were rewritten under the same names to match `docs/decisions.md` (D1–D102) and the locked prototype `design/app/` (D94). There are no `.docx` / `.pdf` copies of the new versions yet (no converter on this machine). Line numbers quoted in older decision rows refer to these archived versions.
