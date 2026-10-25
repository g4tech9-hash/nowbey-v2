"""
NowBey — final brand sheet.

Every asset is shown as its own card: the file is cover-filled into the card
box and masked, so there is never a panel colour fighting the asset's own
background. Labels sit beneath, and the size ladder uses the real exports at
1:1.

    python scripts/build_sheet.py   (needs pillow)
"""

import os
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PNG = os.path.join(ROOT, "out", "png")
FONTS = os.path.join(ROOT, "fonts")
DISPLAY = os.path.join(FONTS, "Brico800.ttf")

BG = (9, 24, 35)
INK = (232, 244, 242)
DIM = (138, 166, 172)
AQUA = (63, 214, 192)

M = 90          # outer margin
GUT = 40        # gutter
CARD = 700      # square card
LABEL_H = 74    # space under a card for its caption


def font(size):
    return ImageFont.truetype(DISPLAY, size)


def label(d, xy, text, size=18, fill=DIM, tracking=3.0):
    x, y = xy
    f = font(size)
    for ch in text:
        d.text((x, y), ch, font=f, fill=fill, anchor="ls")
        x += f.getlength(ch) + tracking


def cover(name, w, h):
    im = Image.open(os.path.join(PNG, name)).convert("RGBA")
    k = max(w / im.width, h / im.height)
    im = im.resize((int(im.width * k + 0.5), int(im.height * k + 0.5)), Image.LANCZOS)
    left = (im.width - w) // 2
    top = (im.height - h) // 2
    return im.crop((left, top, left + w, top + h))


def contain(name, w, h, pad=0):
    """Fit the whole file inside the box, on its own corner colour."""
    im = Image.open(os.path.join(PNG, name)).convert("RGBA")
    k = min((w - pad * 2) / im.width, (h - pad * 2) / im.height)
    sw, sh = int(im.width * k), int(im.height * k)
    im = im.resize((sw, sh), Image.LANCZOS)
    corners = [im.getpixel((2, 2)), im.getpixel((sw - 3, 2)),
               im.getpixel((2, sh - 3)), im.getpixel((sw - 3, sh - 3))]
    bg = tuple(round(sum(c[i] for c in corners) / 4) for i in range(3)) + (255,)
    canvas = Image.new("RGBA", (w, h), bg)
    canvas.alpha_composite(im, ((w - sw) // 2, (h - sh) // 2))
    return canvas


def mask_round(im, r):
    m = Image.new("L", im.size, 0)
    ImageDraw.Draw(m).rounded_rectangle((0, 0, im.width - 1, im.height - 1), radius=r, fill=255)
    out = im.copy()
    out.putalpha(m)
    return out


def mask_circle(im):
    s = 4
    m = Image.new("L", (im.width * s, im.height * s), 0)
    ImageDraw.Draw(m).ellipse((0, 0, im.width * s - 1, im.height * s - 1), fill=255)
    out = im.copy()
    out.putalpha(m.resize(im.size, Image.LANCZOS))
    return out


def card(canvas, name, box, *, radius=28, circle=False, caption=None, cap_fill=DIM,
         bg=None, fit="cover", pad=0):
    x, y, w, h = box
    if bg is not None:
        ImageDraw.Draw(canvas).rounded_rectangle((x, y, x + w, y + h), radius=radius, fill=bg)
    im = cover(name, w, h) if fit == "cover" else contain(name, w, h, pad)
    im = mask_circle(im) if circle else mask_round(im, radius)
    canvas.paste(im, (x, y), im)
    if caption:
        label(canvas_draw(canvas), (x + 4, y + h + 46), caption, 18, cap_fill)
    return y + h + LABEL_H


def canvas_draw(c):
    return ImageDraw.Draw(c)


# ------------------------------------------------------------------ layout
COLS = 3
CW = (2400 - M * 2 - GUT * (COLS - 1)) // COLS       # 700
row1 = M + 190
row2 = row1 + CARD + LABEL_H + GUT + 26
lock_w = (2400 - M * 2 - GUT) // 2
lock_h = int(lock_w * 800 / 2074)          # keep each lockup's own aspect
row3 = row2 + CARD + LABEL_H + GUT + 26
H = row3 + lock_h + LABEL_H + M

canvas = Image.new("RGB", (2400, H), BG)
d = ImageDraw.Draw(canvas)

# ---------------------------------------------------------------- masthead
f1, f2 = font(56), font(30)
d.text((M, M + 44), "NowBey", font=f1, fill=INK, anchor="ls")
now_w = f1.getlength("NowBey")
d.text((M + now_w + 26, M + 44), "3D icon  ·  wordmark", font=f2, fill=AQUA, anchor="ls")
label(d, (M, M + 100), "PROFILE PICTURE   ·   APP ICON   ·   LOCKUPS   ·   FLAT VECTOR", 17, DIM)

# ---------------------------------------------------------------- row 1
x = M
card(canvas, "nowbey-pfp-3d-night-1600.png", (x, row1, CW, CARD), circle=True,
     caption="PRIMARY  ·  NIGHT  ·  “NOW BEY”")
x += CW + GUT
card(canvas, "nowbey-pfp-3d-light-1600.png", (x, row1, CW, CARD), circle=True,
     caption="DAYLIGHT VARIANT", cap_fill=(96, 116, 122))
x += CW + GUT
card(canvas, "nowbey-pfp-3d-night-tight-1600.png", (x, row1, CW, CARD), circle=True,
     caption="TIGHT WORDMARK  ·  “NOWBEY”")

# ---------------------------------------------------------------- row 2
x = M
card(canvas, "nowbey-pfp-flat-night-1080.png", (x, row2, CW, CARD), radius=28,
     fit="cover", caption="FLAT VECTOR  ·  NIGHT")
x += CW + GUT
card(canvas, "nowbey-pfp-flat-light-1080.png", (x, row2, CW, CARD), radius=28,
     fit="cover", caption="FLAT VECTOR  ·  LIGHT", cap_fill=(96, 116, 122))

# size ladder — the real exports, 1:1 on the night ground
x += CW + GUT
d.rounded_rectangle((x, row2, x + CW, row2 + CARD), radius=28, fill=(13, 33, 46))
sx, sy = x + 40, row2 + 150
for s in (256, 128, 64):
    im = Image.open(os.path.join(PNG, f"nowbey-icon-3d-night-{s}.png")).convert("RGBA")
    im = mask_circle(im)
    canvas.paste(im, (sx, sy + (256 - s) // 2), im)
    d.text((sx, sy + 300), f"{s}", font=font(20), fill=DIM, anchor="ls")
    sx += s + 32
label(d, (x + 4, row2 + CARD + 46), "CIRCLE CROP AT REAL SIZE", 18, DIM)

# ---------------------------------------------------------------- row 3
card(canvas, "nowbey-lockup-3d-night-2074x800.png", (M, row3, lock_w, lock_h),
     radius=28, fit="contain", caption="LOCKUP  ·  NIGHT")
card(canvas, "nowbey-lockup-3d-light-2074x800.png", (M + lock_w + GUT, row3, lock_w, lock_h),
     radius=28, fit="contain", caption="LOCKUP  ·  DAYLIGHT", cap_fill=(96, 116, 122))

out = os.path.join(ROOT, "out", "nowbey-brand-sheet.png")
canvas.save(out, optimize=True)
print("  →", os.path.relpath(out, ROOT), canvas.size)
