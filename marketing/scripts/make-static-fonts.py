#!/usr/bin/env python3
"""
Instances the product's variable fonts into the static weights the SVG
renderer needs.

resvg cannot vary a variable font's weight axis, so the marketing kit uses
per-weight static instances named Brico400/600/700/800, Inter400..800 and
JBMono400/700. The source files are copied straight out of the site
(src/app/fonts/*.woff2), so the kit is typographically identical to the app.

Requires: fonttools, brotli   ->   pip install fonttools brotli
"""
import os
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "..", "..", "src", "app", "fonts")
OUT = os.path.join(HERE, "..", "fonts")

SPECS = [
    ("bricolage-latin.woff2", "Brico", [400, 600, 700, 800]),
    ("inter-latin.woff2", "Inter", [400, 500, 600, 700, 800]),
    ("jetbrains-mono-latin.woff2", "JBMono", [400, 700]),
]

os.makedirs(os.path.join(OUT, "static"), exist_ok=True)
for src, family, weights in SPECS:
    for w in weights:
        f = TTFont(os.path.join(SRC, src))
        inst = instantiateVariableFont(f, {"wght": w}, updateFontNames=False)
        name = f"{family}{w}"
        # A unique family name per weight: SVG font-family then selects the
        # weight deterministically, which resvg cannot do via font-weight.
        for rec in inst["name"].names:
            if rec.nameID in (1, 4, 16):
                rec.string = name
            elif rec.nameID == 6:
                rec.string = name
        inst.flavor = None
        inst.save(os.path.join(OUT, "static", f"{name}.ttf"))
        print("wrote", name, w)
