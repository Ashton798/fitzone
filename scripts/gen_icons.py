#!/usr/bin/env python3
"""Generate FitZone PWA icons (deep navy rounded square + white Z + lemon dot)."""
from PIL import Image, ImageDraw, ImageFont
import os

OUT = os.path.join(os.path.dirname(__file__), "..", "public", "icons")
os.makedirs(OUT, exist_ok=True)

NAVY_TOP = (31, 84, 255)      # primary-500 #2F6BFF
NAVY_MID = (29, 68, 213)      # primary-600
NAVY_BOT = (16, 48, 111)      # primary-800 #10306F
YELLOW = (255, 201, 60)       # accent-400
FONT_BOLD = "C:/Windows/Fonts/arialbd.ttf"


def lerp(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


def vertical_gradient(size, top, bottom):
    img = Image.new("RGB", (size, size))
    px = img.load()
    for y in range(size):
        c = lerp(top, bottom, y / (size - 1))
        for x in range(size):
            px[x, y] = c
    return img


def rounded_mask(size, radius_ratio):
    """White rounded-rect mask sized size x size, corner radius ratio in [0,0.5]."""
    mask = Image.new("L", (size, size), 0)
    d = ImageDraw.Draw(mask)
    r = int(size * radius_ratio)
    d.rounded_rectangle([0, 0, size - 1, size - 1], radius=r, fill=255)
    return mask


def make_icon(size, corner_ratio=0.22, supersample=4):
    S = size * supersample
    # full-bleed background (safe zone for maskable icons)
    img = vertical_gradient(S, NAVY_TOP, NAVY_BOT)

    # subtle top-left glow
    glow = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    dg = ImageDraw.Draw(glow)
    dg.ellipse([-S * 0.12, -S * 0.12, S * 0.42, S * 0.42], fill=(255, 255, 255, 46))
    img = Image.alpha_composite(img.convert("RGBA"), glow)

    draw = ImageDraw.Draw(img)

    # ---- bold white rounded "Z" ----
    # coordinates as fraction of S
    f = S / 100.0
    bar = 11.0 * f          # stroke thickness
    top_y, bot_y = 22.0 * f, 74.0 * f
    lx, rx = 24.0 * f, 76.0 * f
    w = bar * 0.52

    def seg(a, b, width):
        draw.line([a, b], fill=(255, 255, 255, 255), width=int(width))

    # top bar
    seg((lx, top_y + w), (rx, top_y + w), bar)
    # diagonal (with round caps it merges nicely)
    seg((rx - w, top_y), (lx + w, bot_y), bar)
    # bottom bar
    seg((lx, bot_y - w), (rx, bot_y - w), bar)

    # yellow energy dot (brand accent), top-right of the Z
    cx, cy, r = 88.5 * f, 14.5 * f, 6.2 * f
    draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=YELLOW)

    # soft yellow glow behind dot
    dg.ellipse([cx - r * 2.4, cy - r * 2.4, cx + r * 2.4, cy + r * 2.4],
               fill=(255, 201, 60, 70))

    img = img.resize((size, size), Image.LANCZOS)

    # rounded corners with anti-alias
    mask = rounded_mask(size, corner_ratio).resize((size, size), Image.LANCZOS)
    out = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    out.paste(img, (0, 0), mask)
    return out.convert("RGB")


if __name__ == "__main__":
    for s in (512, 192):
        make_icon(s).save(os.path.join(OUT, f"icon-{s}.png"), optimize=True)
    make_icon(180, corner_ratio=0.20).save(os.path.join(OUT, "apple-touch-icon.png"), optimize=True)
    print("generated:", os.listdir(OUT))
