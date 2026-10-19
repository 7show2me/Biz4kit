"""Build the Biz4Kit logo SVGs: the 4B mark. A 4 and a B in Playfair Display Black, upright and the
same height, side by side, joined by one bold dash through their upper third. One ink per file,
no wordmark. Every letter is outlined from the real font file.

  uv run --no-project --with fonttools --with uharfbuzz python -I make_logo.py <font-dir> <out-dir>

<font-dir> needs Playfair.ttf (PlayfairDisplay[wght], variable, from github.com/google/fonts).
"""
import json
import sys
from pathlib import Path

import uharfbuzz as hb
from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.pointInsidePen import PointInsidePen
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

FD, OUT = Path(sys.argv[1]), Path(sys.argv[2])
OUT.mkdir(parents=True, exist_ok=True)

FONT = ("Playfair.ttf", {"wght": 900})
GAP = 6  # between the 4 and the B, in units of a 100-unit-tall letter
DASH_T = 6.5  # dash thickness
DASH_Y = 33  # dash centre, from the top of the letters
DASH_OUT = 6  # how far the dash runs past the outer edges

INDIGO, SNOW = "#03035e", "#fdfcfe"  # light primary, dark foreground (brand/theme.css)

_font = instantiateVariableFont(TTFont(FD / FONT[0]), FONT[1], inplace=False)
_gs = _font.getGlyphSet()


class Glyph:
    """A glyph scaled to 100 units tall, bbox at the origin, y pointing down."""

    def __init__(self, ch):
        hbf = hb.Font(hb.Face(hb.Blob.from_file_path(str(FD / FONT[0]))))
        hbf.set_variations(FONT[1])
        buf = hb.Buffer()
        buf.add_str(ch)
        buf.guess_segment_properties()
        hb.shape(hbf, buf, {"lnum": True})
        self.name = _font.getGlyphOrder()[buf.glyph_infos[0].codepoint]
        bp = BoundsPen(_gs)
        _gs[self.name].draw(bp)
        self.x0, _, self.x1, self.y1 = bp.bounds
        self.k = 100 / (bp.bounds[3] - bp.bounds[1])
        self.w = (self.x1 - self.x0) * self.k
        sp = SVGPathPen(_gs)
        _gs[self.name].draw(TransformPen(sp, (self.k, 0, 0, -self.k, -self.x0 * self.k, self.y1 * self.k)))
        self.d = sp.getCommands()

    def inside(self, x, y):
        p = PointInsidePen(_gs, (self.x0 + x / self.k, self.y1 - y / self.k))
        _gs[self.name].draw(p)
        return p.getResult()


FOUR, B = Glyph("4"), Glyph("B")
BAR_Y = DASH_Y
BX = FOUR.w + GAP
W = BX + B.w


def mark(ink, x=0.0, y=0.0, s=1.0):
    return (f'<g transform="translate({x:.2f} {y:.2f}) scale({s:.5f})" fill="{ink}">'
            f'<path d="{FOUR.d}"/><path d="{B.d}" transform="translate({BX:.2f} 0)"/>'
            f'<rect x="{-DASH_OUT}" y="{BAR_Y - DASH_T / 2:.2f}" width="{W + 2 * DASH_OUT:.2f}" height="{DASH_T}"/></g>')


def svg(x0, y0, w, h, body):
    # width/height = viewBox size in px: the file has a proper intrinsic size and shape wherever it is previewed
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{w:.0f}" height="{h:.0f}" viewBox="{x0:.1f} {y0:.1f} {w:.1f} {h:.1f}" role="img" '
            f'aria-label="Biz4Kit"><title>Biz4Kit</title>{body}</svg>\n')


def logo(ink):
    pad = 8
    return svg(-DASH_OUT - pad, -pad, W + 2 * (DASH_OUT + pad), 100 + 2 * pad, mark(ink))


def app_icon():
    side = 160
    s = (side * 0.62) / (W + 2 * DASH_OUT)
    x = (side - W * s) / 2
    y = (side - 100 * s) / 2
    return svg(0, 0, side, side, f'<rect width="{side}" height="{side}" rx="{side * 0.22:.0f}" fill="{INDIGO}"/>' + mark("#ffffff", x, y, s))


# ---------- serif name next to the mark ("Biz4Kit" in Playfair Display Black, upright) ----------
NAME_CAP = 46  # cap height of the name, on the mark's 100-unit height
NAME_GAP = 16


def name_paths():
    hbf = hb.Font(hb.Face(hb.Blob.from_file_path(str(FD / FONT[0]))))
    hbf.set_variations(FONT[1])
    buf = hb.Buffer()
    buf.add_str("Biz4Kit")
    buf.guess_segment_properties()
    hb.shape(hbf, buf, {"kern": True, "lnum": True})
    order = _font.getGlyphOrder()
    cap = _font["OS/2"].sCapHeight
    k = NAME_CAP / cap
    x, out = 0.0, []
    for info, pos in zip(buf.glyph_infos, buf.glyph_positions):
        pen = SVGPathPen(_gs)
        _gs[order[info.codepoint]].draw(TransformPen(pen, (k, 0, 0, -k, x + pos.x_offset * k, cap * k)))
        out.append(pen.getCommands())
        x += pos.x_advance * k
    return out, x


NAME, NAME_W = name_paths()
NAME_X = W + DASH_OUT + NAME_GAP
NAME_Y = 50 - NAME_CAP / 2  # vertically centred on the mark


def lockup_body(ink):
    return mark(ink) + f'<g fill="{ink}" transform="translate({NAME_X:.2f} {NAME_Y:.2f})">' + "".join(f'<path d="{d}"/>' for d in NAME) + "</g>"


def lockup_svg(ink, tile=None):
    pad = 8
    x0, w = -DASH_OUT - pad, NAME_X + NAME_W + DASH_OUT + 2 * pad
    return framed(x0, -pad, w, 100 + 2 * pad, lockup_body(ink), tile)


# The dark versions sit on their own dark rounded tile with a visible border, so they show on any page.
TILE = {"fill": "#020409", "stroke": "#4a4fb0"}


def framed(x0, y0, w, h, body, tile):
    if not tile:
        return svg(x0, y0, w, h, body)
    m = 10  # margin between the artwork and the border
    rect = (f'<rect x="{x0 - m + 0.75:.2f}" y="{y0 - m + 0.75:.2f}" width="{w + 2 * m - 1.5:.2f}" height="{h + 2 * m - 1.5:.2f}" '
            f'rx="16" fill="{tile["fill"]}" stroke="{tile["stroke"]}" stroke-width="1.5"/>')
    return svg(x0 - m, y0 - m, w + 2 * m, h + 2 * m, rect + body)


def logo_svg(ink, tile=None):
    pad = 8
    return framed(-DASH_OUT - pad, -pad, W + 2 * (DASH_OUT + pad), 100 + 2 * pad, mark(ink), tile)


files = {
    "biz4kit-logo.svg": logo(INDIGO),
    "biz4kit-logo-dark.svg": logo_svg(SNOW, TILE),
    "biz4kit-logo-white.svg": logo("#ffffff"),
    "biz4kit-lockup.svg": lockup_svg(INDIGO),
    "biz4kit-lockup-dark.svg": lockup_svg(SNOW, TILE),
    "biz4kit-lockup-white.svg": lockup_svg("#ffffff"),
    "biz4kit-app-icon.svg": app_icon(),
}
for name, text in files.items():
    (OUT / name).write_text(text, encoding="utf-8")
    print("wrote", name, len(text))
# Geometry for other artwork (the design-system cover).
(OUT.parent / "logo-geometry.json").write_text(json.dumps(
    {"four": FOUR.d, "b": B.d, "bx": BX, "w": W, "bar_y": BAR_Y, "dash_t": DASH_T, "dash_out": DASH_OUT}), encoding="utf-8")
