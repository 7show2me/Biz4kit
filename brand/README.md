# Biz4Kit brand (local only)

Nothing here is hosted on a server. The claude.ai design-system page was deleted; this folder is the design system.

| Path                        | What                                                                                                                                                 |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `theme.css`                 | shadcn/ui colour variables (light + dark), fonts, radius, shadows. Import this in the app.                                                           |
| `tailwind.css`              | Tailwind v4 names for every token (`text-body-sm`, `h-control-md`, `bg-success-soft`, `rounded-pill` ...). Load after `theme.css`. Screens use these utilities only, never raw px or hex (D52). |
| `../design/screens-v2.html` | All Phase 1 screens in one local file (the prototype; V1 is in `prep/archive/design/`). Its tokens are copied from `theme.css` and `tailwind.css` by `python design/sync_tokens.py`; run it after any token change. |
| `logo/`                     | The 4B mark and lockup as SVG (see `logo/README.md` for which file to use; the design system reads them from here).                                                    |
| `design-system/README.md`   | The brand book: voice, logo rules, colour, type, shape, white-label rules.                                                                           |
| `design-system/tokens.json` | Every token with a usage note and the contrast results.                                                                                              |
| `design-system/index.html`  | **The whole design system as one page**: cover, brand book, logos, colour (light/dark toggle), type, spacing, radius, shadows. Open it in a browser. |
| `build_design_system.py`    | Rebuilds `design-system/index.html` from the files above: `uv run --no-project --with markdown python -I brand/build_design_system.py`               |
| `preview.html`              | Open in a browser: every logo at its proper size on its ground, small sizes, contrast table, fixed controls.                                         |
| `make_logo.py`              | Regenerates `logo/*.svg` from Playfair Display (weight 900).                                                                                         |

Regenerate the logos:

```
uv run --no-project --with fonttools --with uharfbuzz python -I brand/make_logo.py <font-dir> brand/logo
```

`<font-dir>` must contain `Playfair.ttf`, the variable font `PlayfairDisplay[wght].ttf` from github.com/google/fonts (`ofl/playfairdisplay`), renamed.

`design-system.json`, the old claude.ai design-system index, is in `prep/archive/brand/`; nothing reads it.

Fonts used by the app: Fraunces (serif, headings), DM Sans (UI), DM Mono (amounts and codes); customer pages use Inter for everything (D34). All from Google Fonts (link in `theme.css`). The logo is outlined and loads no font.
