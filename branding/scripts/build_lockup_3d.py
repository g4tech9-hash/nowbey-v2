"""
NowBey — horizontal 3D lockups (app store header, social banner, email sig).

The mark is the cutout from the engine-style render, set left; the wordmark is
set to its cap height so the pairing holds at any output width.

    python scripts/build_lockup_3d.py   (needs pillow)
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from PIL import Image, ImageDraw, ImageFont
from build_pfp_3d import cutout, radial_gradient, run, SIZE as BASE, DISPLAY
from build_pfp_3d import CREAM, NAVY, AQUA, AQUA_DEEP, BBOX, feather_disc

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "out", "png")


def lockup(mode, *, height=800, words=("Now", "Bey"), gap_em=0.24, tagline=True):
    dark = mode == "night"
    obj, bg = cutout(mode)

    # 1:1 mark square, then the wordmark block beside it
    mark_h = int(height * 0.92)
    mark = obj.resize((mark_h, mark_h), Image.LANCZOS)

    cap = height * 0.235
    font = ImageFont.truetype(DISPLAY, int(round(cap / 0.72)))
    tr = -0.03
    now_w = font.getlength(words[0]) + tr * font.size * (len(words[0]) - 1)
    bey_w = font.getlength(words[1]) + tr * font.size * (len(words[1]) - 1)
    gap = gap_em * font.size
    text_w = now_w + gap + bey_w

    pad_x = height * 0.10
    gap_mark = height * 0.075
    width = int(pad_x * 2 + mark_h + gap_mark + text_w)

    if dark:
        ground = Image.new("RGBA", (width, height), (7, 22, 33, 255))
        ground = radial_gradient(
            max(width, height),
            [(0.0, (17, 48, 66)), (0.6, (8, 26, 39)), (1.0, (5, 16, 25))],
            0.42, 0.5, 0.95,
        ).convert("RGBA").crop((0, 0, width, height))
        ink, ink_b = CREAM, AQUA
        sub_col = (198, 224, 227, 170)
    else:
        ground = radial_gradient(
            max(width, height),
            [(0.0, (255, 255, 255)), (0.55, (247, 243, 236)), (1.0, (238, 229, 214))],
            0.42, 0.5, 0.95,
        ).convert("RGBA").crop((0, 0, width, height))
        ink, ink_b = NAVY, AQUA_DEEP
        sub_col = (22, 35, 43, 160)

    canvas = ground.copy()
    canvas.alpha_composite(mark, (int(pad_x), int(height / 2 - mark_h / 2)))

    d = ImageDraw.Draw(canvas)
    tx = pad_x + mark_h + gap_mark
    if tagline:
        # wordmark optically centred, tagline beneath it
        cap_mid = height * 0.455
        baseline = int(cap_mid + cap / 2)
    else:
        baseline = int(height / 2 + cap / 2)

    run(d, words[0], font, tx, baseline, ink, tr)
    run(d, words[1], font, tx + now_w + gap, baseline, ink_b, tr)

    if tagline:
        sub = ImageFont.truetype(DISPLAY, int(height * 0.062))
        run(d, "STAY SAFE, BAHAMAS", sub, tx,
            baseline + int(height * 0.115), sub_col, 0.20)

    name = f"nowbey-lockup-3d-{mode}-{width}x{height}.png"
    path = os.path.join(OUT, name)
    canvas.convert("RGB").save(path, optimize=True)
    print("  →", os.path.relpath(path, ROOT))
    return path


for mode in ("night", "light"):
    lockup(mode, height=800)
    lockup(mode, height=800, gap_em=0.0, tagline=False)
