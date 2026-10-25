"""
NowBey — 3D profile pictures with the wordmark.

Both engine-style renders in src/ are treated as cutouts: the object is
cropped on a generous square, given a long cosine feather, and composited
onto a background built from the crop's own edge colours — so the seam is
invisible and the object can be placed independently of the type.

  night : deep oceanic matte, cream + aquamarine wordmark
  light : ivory studio sweep, navy + deep-aqua wordmark

    python scripts/build_pfp_3d.py   (needs pillow)

Writes 1600px masters, transparent-corner circle crops, and 512/256/128/64
exports for every variant. All type is set on a baseline.
"""

from PIL import Image, ImageDraw, ImageFont, ImageFilter
import os
import math

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "src")
OUT = os.path.join(ROOT, "out", "png")
FONTS = os.path.join(ROOT, "fonts")
os.makedirs(OUT, exist_ok=True)

DISPLAY = os.path.join(FONTS, "Brico800.ttf")
SIZE = 1600

CREAM = (243, 241, 234, 255)
NAVY = (9, 32, 52, 255)
AQUA = (127, 236, 222, 255)
AQUA_DEEP = (11, 111, 100, 255)
MUTED_NIGHT = (198, 224, 227, 168)
MUTED_LIGHT = (22, 35, 43, 158)

# object bounds inside each 1024 render (measured, not guessed)
BBOX = {
    "night": (198, 161, 825, 819),
    "light": (211, 198, 819, 891),
}


# ------------------------------------------------------------------ helpers

def lerp(a, b, t):
    return tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(len(a)))


def radial_gradient(size, stops, cx, cy, r):
    img = Image.new("RGB", (size, size))
    px = img.load()
    for y in range(size):
        for x in range(size):
            d = min((((x - cx * size) ** 2 + (y - cy * size) ** 2) ** 0.5) / (r * size), 1.0)
            for i in range(len(stops) - 1):
                o0, c0 = stops[i]
                o1, c1 = stops[i + 1]
                if o0 <= d <= o1:
                    t = (d - o0) / (o1 - o0) if o1 > o0 else 0
                    px[x, y] = lerp(c0, c1, t * t * (3 - 2 * t))
                    break
            else:
                px[x, y] = stops[-1][1]
    return img


def feather_disc(size, inner, outer, blur=0.010):
    m = Image.new("L", (size, size), 0)
    d = ImageDraw.Draw(m)
    steps = 56
    for i in range(steps, -1, -1):
        t = i / steps
        r = inner + (outer - inner) * t
        d.ellipse(
            (size / 2 - r, size / 2 - r, size / 2 + r, size / 2 + r),
            fill=round(255 * (0.5 + 0.5 * math.cos(math.pi * t))),
        )
    return m.filter(ImageFilter.GaussianBlur(size * blur))


def bottom_scrim(canvas, start, end, colour):
    w, h = canvas.size
    grad = Image.new("L", (1, h), 0)
    for y in range(h):
        t = min(max((y / h - start) / max(end - start, 1e-6), 0.0), 1.0)
        grad.putpixel((0, y), round(255 * (t * t * (3 - 2 * t))))
    layer = Image.new("RGBA", (w, h), colour)
    layer.putalpha(grad.resize((w, h)).point(lambda v: round(v * colour[3] / 255)))
    return Image.alpha_composite(canvas, layer)


def run(draw, text, font, x, baseline, fill, tracking=0.0, centre=None):
    total = sum(
        font.getlength(ch) + (tracking * font.size if i < len(text) - 1 else 0)
        for i, ch in enumerate(text)
    )
    if centre is not None:
        x = centre - total / 2
    left = x
    for i, ch in enumerate(text):
        draw.text((x, baseline), ch, font=font, fill=fill, anchor="ls")
        x += font.getlength(ch) + (tracking * font.size if i < len(text) - 1 else 0)
    return [total, left, x]


# ------------------------------------------------------------- cutout art

def cutout(mode, *, crop_k=1.16, feather=(0.335, 0.497)):
    """
    Return (rgba_object, square_background) for one render.

    The crop is centred on the measured object bbox and scaled by `crop_k`
    relative to the bbox's larger side, so every mode produces the same
    object-to-frame relationship.
    """
    scene = Image.open(os.path.join(SRC, f"nowbey-icon-{mode}-scene.png")).convert("RGB")
    x0, y0, x1, y1 = BBOX[mode]
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    side = int(max(x1 - x0, y1 - y0) * crop_k)

    # pad by replicating edge pixels so a wide crop never runs off the plate
    pad = side
    big = Image.new("RGB", (scene.width + pad * 2, scene.height + pad * 2))
    big.paste(scene, (pad, pad))
    for box, src in (
        ((0, 0, pad, big.height), (pad, 0, pad + 1, big.height)),
        ((big.width - pad, 0, big.width, big.height), (big.width - pad - 1, 0, big.width - pad, big.height)),
    ):
        big.paste(big.crop(src).resize((box[2] - box[0], box[3] - box[1])), box)
    for box, src in (
        ((0, 0, big.width, pad), (0, pad, big.width, pad + 1)),
        ((0, big.height - pad, big.width, big.height), (0, big.height - pad - 1, big.width, big.height - pad)),
    ):
        big.paste(big.crop(src).resize((box[2] - box[0], box[3] - box[1])), box)

    cx_p, cy_p = cx + pad, cy + pad
    sq = big.crop(
        (int(cx_p - side / 2), int(cy_p - side / 2), int(cx_p + side / 2), int(cy_p + side / 2))
    ).resize((SIZE, SIZE), Image.LANCZOS)

    # background: the same crop, heavily blurred and pushed to matte. Because
    # it carries the render's own colour field, the feather has nothing to
    # mismatch against — no halo ring, no visible disc edge.
    plate = sq.filter(ImageFilter.GaussianBlur(SIZE * 0.09))
    plate = plate.resize((SIZE, SIZE), Image.LANCZOS)

    if mode == "night":
        # deepen the vignette and drop the whole plate a stop, so type reads
        vign = radial_gradient(
            SIZE,
            [(0.0, (255, 255, 255)), (0.55, (150, 150, 150)), (1.0, (44, 44, 44))],
            0.5, 0.36, 0.92,
        ).convert("L").point(lambda v: round(255 - v * 0.72))
        plate = Image.composite(
            Image.new("RGB", (SIZE, SIZE), (5, 16, 25)), plate, vign
        )
        plate = Image.blend(plate, Image.new("RGB", (SIZE, SIZE), (6, 20, 30)), 0.34)
    else:
        plate = Image.blend(plate, Image.new("RGB", (SIZE, SIZE), (247, 243, 236)), 0.55)

    bg = plate.convert("RGBA")

    obj = sq.convert("RGBA")
    obj.putalpha(feather_disc(SIZE, SIZE * feather[0], SIZE * feather[1]))
    return obj, bg


def compose(mode, *, words=("Now", "Bey"), gap_em=0.24, suffix="", tagline=True,
            obj_top=0.035, obj_height=0.655, bloom=0.0):
    obj, bg = cutout(mode)
    # the cutout is square: fit it to `obj_height` and centre it, then nudge
    w = int(SIZE * obj_height)
    obj = obj.resize((w, w), Image.LANCZOS)
    x = int(SIZE / 2 - w / 2)
    y = int(SIZE * obj_top + SIZE * obj_height / 2 - w / 2)
    canvas = bg.copy()
    canvas.alpha_composite(obj, (x, y))

    dark = mode == "night"
    ink, ink_b, muted = (CREAM, AQUA, MUTED_NIGHT) if dark else (NAVY, AQUA_DEEP, MUTED_LIGHT)
    canvas = bottom_scrim(
        canvas, 0.72, 1.0, (4, 14, 23, 165) if dark else (247, 243, 236, 210)
    )

    cap = SIZE * 0.058
    baseline = int(SIZE * 0.862)
    font = ImageFont.truetype(DISPLAY, int(round(cap / 0.72)))
    tr = -0.03
    now_w = font.getlength(words[0]) + tr * font.size * (len(words[0]) - 1)
    bey_w = font.getlength(words[1]) + tr * font.size * (len(words[1]) - 1)
    gap = gap_em * font.size
    total = now_w + gap + bey_w
    left = SIZE / 2 - total / 2

    d = ImageDraw.Draw(canvas)
    run(d, words[0], font, left, baseline, ink, tr)
    run(d, words[1], font, left + now_w + gap, baseline, ink_b, tr)

    if tagline:
        sub = ImageFont.truetype(DISPLAY, int(SIZE * 0.0190))
        run(d, "COMMUNITY MAP  ·  THE BAHAMAS", sub, SIZE / 2,
            baseline + int(SIZE * 0.042), muted, 0.20, centre=SIZE / 2)

    name = f"nowbey-pfp-3d-{mode}{suffix}-{SIZE}.png"
    path = os.path.join(OUT, name)
    canvas.convert("RGB").save(path, optimize=True)
    print("  →", os.path.relpath(path, ROOT))
    return path


def icon_only(mode):
    """Text-free 3D avatar — the only version that survives 32px cleanly."""
    obj, bg = cutout(mode)
    w = int(SIZE * 1.06)
    obj = obj.resize((w, w), Image.LANCZOS)
    canvas = bg.copy()
    canvas.alpha_composite(obj, (int(SIZE / 2 - w / 2), int(SIZE / 2 - w / 2)))
    path = os.path.join(OUT, f"nowbey-icon-3d-{mode}-{SIZE}.png")
    canvas.convert("RGB").save(path, optimize=True)
    print("  →", os.path.relpath(path, ROOT))
    return path


def exports(src_path, sizes=(512, 256, 128, 64)):
    im = Image.open(src_path).convert("RGBA")
    w, h = im.size
    s = 4
    m = Image.new("L", (w * s, h * s), 0)
    ImageDraw.Draw(m).ellipse((0, 0, w * s - 1, h * s - 1), fill=255)
    out = im.copy()
    out.putalpha(m.resize((w, h), Image.LANCZOS))
    base = src_path.replace(f"-{SIZE}.png", "")
    p = base + "-circle.png"
    out.save(p, optimize=True)
    print("  →", os.path.relpath(p, ROOT))
    for px in sizes:
        sp = f"{base}-{px}.png"
        im.resize((px, px), Image.LANCZOS).convert("RGB").save(sp, optimize=True)
        print("  →", os.path.relpath(sp, ROOT))


def main():
    print("night — Now Bey, spaced")
    exports(compose("night", gap_em=0.24, suffix=""))
    print("night — NowBey, tight")
    exports(compose("night", gap_em=0.0, suffix="-tight"))
    print("night — icon only")
    exports(icon_only("night"))
    print("light — Now Bey, spaced")
    exports(compose("light", gap_em=0.24, suffix="", obj_height=0.645, obj_top=0.04))
    print("light — icon only")
    exports(icon_only("light"))


if __name__ == "__main__":
    main()
