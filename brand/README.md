# Biz4Kit brand (local only)

Nothing here is hosted on a server. The claude.ai design-system page was deleted; this folder is the design system.

| Path | What |
| --- | --- |
| `theme.css` | shadcn/ui colour variables (light + dark), fonts, radius, shadows. Import this in the app. |
| `logo/` | The 4B mark and lockup as SVG (see `design-system/assets/Logos/README.md` for which file to use). |
| `design-system/README.md` | The brand book: voice, logo rules, colour, type, shape, white-label rules. |
| `design-system/tokens.json` | Every token with a usage note and the contrast results. |
| `design-system/index.html` | **The whole design system as one page**: cover, brand book, logos, colour (light/dark toggle), type, spacing, radius, shadows. Open it in a browser. |
| `build_design_system.py` | Rebuilds `design-system/index.html` from the files above: `uv run --no-project --with markdown python -I brand/build_design_system.py` |
| `preview.html` | Open in a browser: every logo at its proper size on its ground, small sizes, contrast table, fixed controls. |
| `make_logo.py` | Regenerates `logo/*.svg` from Playfair Display (weight 900). |

Regenerate the logos:

```
uv run --no-project --with fonttools --with uharfbuzz python -I brand/make_logo.py <font-dir> brand/logo
```

`<font-dir>` must contain `Playfair.ttf`, the variable font `PlayfairDisplay[wght].ttf` from github.com/google/fonts (`ofl/playfairdisplay`), renamed. Then copy `brand/logo/*.svg` to `brand/design-system/assets/Logos/`.

`design-system/design-system.json` is the index the claude.ai design-system page used (with upload ids that no longer resolve). Nothing reads it now.

Fonts used by the app: Fraunces (serif, headings), DM Sans (UI), DM Mono (amounts and codes); all from Google Fonts (link in `theme.css`). The logo is outlined and loads no font.
