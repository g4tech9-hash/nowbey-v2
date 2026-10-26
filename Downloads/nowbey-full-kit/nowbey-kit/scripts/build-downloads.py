#!/usr/bin/env python3
"""
Rebuild the downloads/ zips behind the gallery's download buttons.

    python3 scripts/build-downloads.py

downloads/ is gitignored on purpose — the zips are build output, like out/.
A fresh clone has none of them, and every gallery button 404s (the browser
then saves the 9-byte "Not found" body as a broken "zip"). Run this once
after any rebuild of out/ and the buttons work again.

Contents, matching the button labels in index.html:

  nowbey-full-kit.zip          everything needed to run and post the kit
  nowbey-social-kit.zip        images only: posts, batch-2 photos, stories, brand
  nowbey-01-posts.zip          out/posts + out/alt (the batch-2 photographic set)
  nowbey-02-stories.zip        out/stories
  nowbey-03-reels.zip          out/video (reels + their cover posters)
  nowbey-04-docs-captions.zip  the docs, every caption file, the plan, env templates
  nowbey-05-brand.zip          out/brand
"""

import os
import zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DL = os.path.join(ROOT, "downloads")
os.makedirs(DL, exist_ok=True)

SKIP_DIRS = {".git", "node_modules", "downloads", "tmp", ".arena", ".cache", "__pycache__"}
SKIP_FILES = {".env", ".env.local", ".env.bak", ".publish-state.json"}


def add(zf, rel):
    zf.write(os.path.join(ROOT, rel), rel, zipfile.ZIP_DEFLATED)


def add_glob(zf, pattern, prefix):
    base = os.path.join(ROOT, pattern)
    import glob

    for path in sorted(glob.glob(base)):
        if os.path.isfile(path):
            zf.write(path, prefix + os.path.basename(path), zipfile.ZIP_DEFLATED)


def build(name, fn):
    path = os.path.join(DL, name)
    with zipfile.ZipFile(path, "w") as z:
        fn(z)
    mb = os.path.getsize(path) / 1e6
    print(f"  → downloads/{name}  {mb:.1f} MB" if mb >= 1 else f"  → downloads/{name}  {os.path.getsize(path)//1024} KB")


def posts(z):
    add_glob(z, "out/posts/*.png", "posts/")
    add_glob(z, "out/alt/*.png", "alt/")


def stories(z):
    add_glob(z, "out/stories/*.png", "stories/")


def reels(z):
    add_glob(z, "out/video/*.mp4", "video/")
    add_glob(z, "out/video/*-poster.png", "video/")


def brand(z):
    add_glob(z, "out/brand/*.png", "brand/")


def docs(z):
    add_glob(z, "*.md", "")
    add_glob(z, "KIT-VERSION.txt", "")
    add_glob(z, ".env.example", "")
    add_glob(z, "env-prefilled.txt", "")
    for dirpath, _dirnames, filenames in os.walk(os.path.join(ROOT, "captions")):
        for f in sorted(filenames):
            rel = os.path.relpath(os.path.join(dirpath, f), ROOT)
            add(z, rel)


def social(z):
    posts(z)
    stories(z)
    brand(z)


def full(z):
    for dirpath, dirnames, filenames in os.walk(ROOT):
        dirnames[:] = sorted(d for d in dirnames if d not in SKIP_DIRS)
        for f in sorted(filenames):
            if f in SKIP_FILES:
                continue
            rel = os.path.relpath(os.path.join(dirpath, f), ROOT)
            add(z, rel)


print("Download zips")
build("nowbey-01-posts.zip", posts)
build("nowbey-02-stories.zip", stories)
build("nowbey-03-reels.zip", reels)
build("nowbey-04-docs-captions.zip", docs)
build("nowbey-05-brand.zip", brand)
build("nowbey-social-kit.zip", social)
build("nowbey-full-kit.zip", full)
print("Update the size labels in index.html if they drifted.")
