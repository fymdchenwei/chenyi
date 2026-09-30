"""Render the Chenyi home-screen icon.

The subject is an open English picture-book (letter A, color dots, pencil, star)
on a full-bleed sky. Standard icons keep that subject at about 80% of the frame.
Maskable icons use the same art inside the smaller adaptive-icon safe zone.
"""

from __future__ import annotations

import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "icons"
FONT_PATH = Path("/tmp/fredoka-700.ttf")
SKY_TOP = (94, 186, 248)
SKY_BOTTOM = (198, 232, 255)
ORANGE = (255, 138, 61)
ORANGE_DARK = (214, 96, 36)
CREAM = (255, 248, 236)
CREAM_SHADOW = (236, 214, 186)
INK = (74, 52, 36)
GOLD = (255, 210, 74)
GOLD_DARK = (232, 156, 28)
BLUE = (59, 122, 232)


def gradient(size: int) -> Image.Image:
    img = Image.new("RGBA", (size, size))
    px = img.load()
    for y in range(size):
        t = y / (size - 1)
        col = tuple(int(SKY_TOP[i] + (SKY_BOTTOM[i] - SKY_TOP[i]) * t) for i in range(3)) + (255,)
        for x in range(size):
            px[x, y] = col
    glow = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    g = ImageDraw.Draw(glow)
    g.ellipse((size * 0.18, size * -0.08, size * 0.82, size * 0.56), fill=(255, 255, 255, 70))
    glow = glow.filter(ImageFilter.GaussianBlur(radius=size * 0.06))
    return Image.alpha_composite(img, glow)


def star_points(cx: float, cy: float, r_out: float, r_in: float) -> list[tuple[float, float]]:
    pts = []
    for i in range(10):
        ang = -math.pi / 2 + i * math.pi / 5
        r = r_out if i % 2 == 0 else r_in
        pts.append((cx + r * math.cos(ang), cy + r * math.sin(ang)))
    return pts


def draw_star(layer: Image.Image, cx: float, cy: float, r: float) -> None:
    shadow = Image.new("RGBA", layer.size, (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow)
    sd.polygon(star_points(cx, cy + r * 0.08, r, r * 0.42), fill=(196, 120, 20, 90))
    shadow = shadow.filter(ImageFilter.GaussianBlur(radius=r * 0.08))
    layer.alpha_composite(shadow)
    draw = ImageDraw.Draw(layer)
    draw.polygon(star_points(cx, cy, r, r * 0.42), fill=GOLD)
    draw.polygon(star_points(cx, cy - r * 0.06, r * 0.72, r * 0.30), fill=(255, 236, 150, 255))


def draw_pencil(layer: Image.Image, x: float, y: float, length: float, thick: float) -> None:
    """A short pencil lying flat under the color dots, tip to the left."""
    d = ImageDraw.Draw(layer)
    d.rounded_rectangle((x, y + thick * 0.12, x + length, y + thick * 1.12), radius=thick * 0.28, fill=(210, 150, 40, 255))
    d.rounded_rectangle((x, y, x + length, y + thick), radius=thick * 0.28, fill=(255, 204, 72, 255))
    d.rectangle((x + length * 0.78, y, x + length * 0.88, y + thick), fill=(236, 236, 240, 255))
    d.rounded_rectangle((x + length * 0.86, y, x + length, y + thick), radius=thick * 0.2, fill=(255, 122, 138, 255))
    d.polygon(
        [
            (x + thick * 0.15, y + thick * 0.5),
            (x - thick * 0.55, y + thick * 0.08),
            (x - thick * 0.55, y + thick * 0.92),
        ],
        fill=(255, 214, 170, 255),
    )
    d.polygon(
        [
            (x - thick * 0.55, y + thick * 0.08),
            (x - thick * 0.95, y + thick * 0.5),
            (x - thick * 0.55, y + thick * 0.92),
        ],
        fill=INK,
    )


def subject(size: int) -> Image.Image:
    layer = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    s = size
    draw = ImageDraw.Draw(layer)

    # Orange cover, with a darker lower lip so it reads as a thick 3D card.
    # The cover plus the star above it are drawn to fill about 80% of the frame.
    cover = (s * 0.105, s * 0.30, s * 0.895, s * 0.90)
    draw.rounded_rectangle(cover, radius=s * 0.055, fill=ORANGE_DARK)
    draw.rounded_rectangle(
        (cover[0], cover[1], cover[2], cover[3] - s * 0.028),
        radius=s * 0.055,
        fill=ORANGE,
    )

    page_top = s * 0.255
    page_bot = s * 0.80
    left = (s * 0.15, page_top, s * 0.485, page_bot)
    right = (s * 0.515, page_top, s * 0.85, page_bot)
    draw.rounded_rectangle((left[0], left[1] + s * 0.012, left[2], left[3] + s * 0.01), radius=s * 0.028, fill=CREAM_SHADOW)
    draw.rounded_rectangle((right[0], right[1] + s * 0.012, right[2], right[3] + s * 0.01), radius=s * 0.028, fill=CREAM_SHADOW)
    draw.rounded_rectangle(left, radius=s * 0.028, fill=CREAM)
    draw.rounded_rectangle(right, radius=s * 0.028, fill=CREAM)
    draw.rectangle((s * 0.478, page_top + s * 0.03, s * 0.522, page_bot - s * 0.02), fill=(214, 186, 156, 255))

    # Color dots: the colors unit, big enough to read at 60px.
    dots = [
        (s * 0.255, s * 0.39, (255, 92, 98)),
        (s * 0.385, s * 0.39, (255, 200, 60)),
        (s * 0.255, s * 0.53, (72, 196, 120)),
        (s * 0.385, s * 0.53, (59, 140, 240)),
    ]
    dot_r = s * 0.052
    for cx, cy, col in dots:
        draw.ellipse((cx - dot_r, cy - dot_r + s * 0.008, cx + dot_r, cy + dot_r + s * 0.008), fill=(180, 140, 110, 255))
        draw.ellipse((cx - dot_r, cy - dot_r, cx + dot_r, cy + dot_r), fill=col + (255,))
        draw.ellipse((cx - dot_r * 0.42, cy - dot_r * 0.5, cx - dot_r * 0.05, cy - dot_r * 0.12), fill=(255, 255, 255, 160))

    draw_pencil(layer, s * 0.205, s * 0.685, s * 0.23, s * 0.048)

    # One letter only: A, the start of the alphabet. Sized to the right page.
    font = ImageFont.truetype("/tmp/fredoka-700.ttf", int(s * 0.46))
    letter = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    ld = ImageDraw.Draw(letter)
    text = "A"
    bbox = ld.textbbox((0, 0), text, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    tx = (right[0] + right[2]) / 2 - tw / 2 - bbox[0]
    ty = (right[1] + right[3]) / 2 - th / 2 - bbox[1] - s * 0.015
    ld.text((tx + s * 0.008, ty + s * 0.012), text, font=font, fill=(196, 110, 40, 255))
    ld.text((tx, ty), text, font=font, fill=(255, 122, 48, 255))
    layer.alpha_composite(letter)

    draw_star(layer, s * 0.50, s * 0.205, s * 0.100)
    return layer


def opaque_bbox(art: Image.Image, threshold: int = 32) -> tuple[int, int, int, int]:
    alpha = art.getchannel("A")
    px = alpha.load()
    w, h = art.size
    minx, miny, maxx, maxy = w, h, 0, 0
    for y in range(h):
        for x in range(w):
            if px[x, y] >= threshold:
                if x < minx:
                    minx = x
                if y < miny:
                    miny = y
                if x > maxx:
                    maxx = x
                if y > maxy:
                    maxy = y
    if maxx < minx:
        raise SystemExit("subject is empty")
    return minx, miny, maxx + 1, maxy + 1


def fit_subject(art: Image.Image, occupancy: float) -> Image.Image:
    """Scale the visible subject so its longer side is `occupancy` of the frame."""
    left, top, right, bottom = opaque_bbox(art)
    bw, bh = right - left, bottom - top
    size = art.size[0]
    target = size * occupancy
    scale = min(target / bw, target / bh)
    fitted = art.resize((round(size * scale), round(size * scale)), Image.Resampling.LANCZOS)
    nl, nt, nr, nbb = opaque_bbox(fitted)
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    canvas.paste(fitted, (round(size / 2 - (nl + nr) / 2), round(size / 2 - (nt + nbb) / 2)), fitted)
    return canvas


def compose(size: int, occupancy: float) -> Image.Image:
    master = 1024
    art = fit_subject(subject(master), occupancy)
    bg = gradient(master)
    icon = Image.alpha_composite(bg, art)
    if size != master:
        icon = icon.resize((size, size), Image.Resampling.LANCZOS)
    return icon


def ensure_font() -> None:
    if FONT_PATH.exists():
        return
    from fontTools.ttLib import TTFont

    font = TTFont(ROOT / "src/fonts/fredoka-700.woff2")
    font.flavor = None
    font.save(FONT_PATH)


def main() -> None:
    ensure_font()
    OUT.mkdir(parents=True, exist_ok=True)
    # Home-screen icons keep the book at about 80% of the frame. Maskable uses
    # the same motif inside Android's adaptive safe zone so circle masks keep it.
    standard = {
        "apple-touch-icon-v2.png": 180,
        "icon-v2-192.png": 192,
        "icon-v2-512.png": 512,
    }
    for name, size in standard.items():
        compose(size, 0.80).save(OUT / name, optimize=True)
    # Maskable safe zone is the center ~66% (Android's 66dp keyline inside 108dp).
    compose(512, 0.66).save(OUT / "icon-v2-maskable-512.png", optimize=True)
    compose(192, 0.66).save(OUT / "icon-v2-maskable-192.png", optimize=True)
    print("wrote", ", ".join(standard), "icon-v2-maskable-512.png", "icon-v2-maskable-192.png")


if __name__ == "__main__":
    main()
