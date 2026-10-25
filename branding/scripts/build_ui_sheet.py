"""
NowBey — the UI avatar sheet.

Puts the product-drawn avatars on one page, at the sizes they actually appear:
the 1080 master, the mid-size cut, and the 64px app-icon rung, plus the
tile variant and the daylight pair.

    .venv/bin/python scripts/build_ui_sheet.py
"""

import os
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UI = os.path.join(ROOT, "out", "ui")
FONTS = os.path.join(ROOT, "fonts")
DISPLAY = os.path.join(FONTS, "Brico800.ttf")

BG = (8, 21, 30)
INK = (232, 244, 242)
DIM = (138, 166, 172)
AQUA = (63, 214, 192)

W, H = 2400, 1660
M = 90
GUT = 40


def font(size):
    return ImageFont.truetype(DISPLAY, size)


def label(d, xy, text, size=18, fill=DIM, tracking=3.0):
    x, y = xy
    f = font(size)
    for ch in text:
        d.text((x, y), ch, font=f, fill=fill, anchor="ls")
        x += f.getlength(ch) + tracking


def circle(im):
    s = 4
    m = Image.new("L", (im.width * s, im.height * s), 0)
    ImageDraw.Draw(m).ellipse((0, 0, im.width * s - 1, im.height * s - 1), fill=255)
    out = im.convert("RGBA")
    out.putalpha(m.resize(im.size, Image.LANCZOS))
    return out


def paste_circle(canvas, name, box):
    im = Image.open(os.path.join(UI, name)).convert("RGBA")
    x, y, w, h = box
    im = im.resize((w, h), Image.LANCZOS)
    im = circle(im)
    canvas.paste(im, (x, y), im)


def paste_square(canvas, name, box, radius=26):
    im = Image.open(os.path.join(UI, name)).convert("RGBA")
    x, y, w, h = box
    im = im.resize((w, h), Image.LANCZOS)
    m = Image.new("L", (w, h), 0)
    ImageDraw.Draw(m).rounded_rectangle((0, 0, w - 1, h - 1), radius=radius, fill=255)
    im.putalpha(m)
    canvas.paste(im, (x, y), im)


canvas = Image.new("RGB", (W, H), BG)
d = ImageDraw.Draw(canvas)

f1, f2 = font(56), font(30)
d.text((M, M + 44), "NowBey", font=f1, fill=INK, anchor="ls")
d.text((M + f1.getlength("NowBey") + 26, M + 44), "avatar from the UI", font=f2, fill=AQUA, anchor="ls")
label(d, (M, M + 100), "DRAWN BY THE APP'S OWN CODE  ·  bg() + emblemDisc() + mark()  ·  BRICOLAGE + INTER + JETBRAINS MONO", 17, DIM)

# ---------------------------------------------------------------- row 1
row1 = M + 180
big = 700
paste_circle(canvas, "nowbey-pfp-ui-night-1080.png", (M, row1, big, big))
label(d, (M, row1 + big + 44), "PRIMARY  ·  NIGHT  ·  1080", 18)

paste_square(canvas, "nowbey-pfp-ui-day-1080.png", (M + big + GUT, row1, big, big))
label(d, (M + big + GUT, row1 + big + 44), "DAYLIGHT  ·  1080", 18)

x = M + (big + GUT) * 2
side = (W - M - x - GUT) // 2
paste_square(canvas, "nowbey-pfp-ui-tile-night-1080.png", (x, row1, side, side))
label(d, (x, row1 + side + 44), "TILE  ·  NIGHT", 18)
paste_square(canvas, "nowbey-pfp-ui-tile-day-1080.png", (x + side + GUT, row1, side, side))
label(d, (x + side + GUT, row1 + side + 44), "TILE  ·  DAY", 18)

# ---------------------------------------------------------------- row 2
row2 = row1 + big + 140
label(d, (M, row2), "REAL SIZE  ·  THE AVATAR ADAPTS TO ITS SLOT", 18, DIM)
y = row2 + 48
d.rounded_rectangle((M, y, W - M, y + 430), radius=26, fill=(13, 33, 46))

SLOT = 240          # vertical slot every rung respects
BASE = y + 70       # top of the tallest mark
x = M + 70
for name, px, cap in (
    ("nowbey-pfp-ui-night-256.png", 256, "256  ·  MARK + WORDMARK"),
    ("nowbey-pfp-ui-night-128.png", 128, "128  ·  MARK ONLY"),
    ("nowbey-pfp-ui-night-64.png", 64, "64  ·  MARK ONLY"),
):
    # all rungs sit on a shared optical baseline, not a shared top edge
    paste_circle(canvas, name, (x, BASE + SLOT - px, px, px))
    label(d, (x, y + 350), cap, 16, DIM, 2.4)
    x += max(px, 180) + 110

x += 70
for name, px, cap in (
    ("nowbey-pfp-ui-tile-night-128.png", 128, "128  ·  TILE"),
    ("nowbey-pfp-ui-tile-night-64.png", 64, "64  ·  TILE"),
):
    paste_square(canvas, name, (x, BASE + SLOT - px, px, px), radius=16)
    label(d, (x, y + 350), cap, 16, DIM, 2.4)
    x += max(px, 160) + 90

out = os.path.join(ROOT, "out", "nowbey-ui-avatar-sheet.png")
canvas.save(out, optimize=True)
print("  →", os.path.relpath(out, ROOT), canvas.size)
