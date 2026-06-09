"""Generate multi-resolution icon.ico — Genshin teleport waypoint design."""
import os
from PIL import Image, ImageDraw

OUTPUT = os.path.join("apps", "desktop", "src-tauri", "icons", "icon.ico")
GOLD = (211, 157, 67, 255)
GOLD_FILL = (211, 157, 67, 230)
BLUE = (142, 197, 255, 255)
BLUE_HILITE = (255, 255, 255, 80)


def render_icon(size: int) -> Image.Image:
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    c = size // 2
    r = int(size * 0.44)   # ring radius — fills most of icon
    rw = int(max(2, size * 0.06))
    t = int(size * 0.33)   # portal tip distance from center
    co = int(size * 0.11)  # control point offset for concave edges
    cr = max(2, int(size * 0.055))

    d.ellipse([c - r, c - r, c + r, c + r], outline=GOLD, width=rw)

    # 4-pointed cruciform with concave edges (polygon approximation)
    import math
    pts = []
    segments = [
        ((c, c - t), (c + co, c - co), (c + t, c)),   # top→right
        ((c + t, c), (c + co, c + co), (c, c + t)),   # right→bottom
        ((c, c + t), (c - co, c + co), (c - t, c)),   # bottom→left
        ((c - t, c), (c - co, c - co), (c, c - t)),   # left→top
    ]
    for p0, p1, p2 in segments:
        for i in range(16):
            t_ = i / 15
            x = (1-t_)**2 * p0[0] + 2*(1-t_)*t_ * p1[0] + t_**2 * p2[0]
            y = (1-t_)**2 * p0[1] + 2*(1-t_)*t_ * p1[1] + t_**2 * p2[1]
            pts.append((int(x), int(y)))
    d.polygon(pts, fill=GOLD_FILL)

    d.ellipse([c - cr, c - cr, c + cr, c + cr], fill=BLUE)

    hr = max(1, int(cr * 0.35))
    ho = max(1, int(cr * 0.28))
    d.ellipse([c - ho - hr, c - ho - hr, c - ho + hr, c - ho + hr], fill=BLUE_HILITE)

    return img


if __name__ == "__main__":
    os.makedirs(os.path.dirname(OUTPUT), exist_ok=True)
    render_icon(256).save(OUTPUT, format="ICO")

    import struct
    with open(OUTPUT, "rb") as f:
        _, _, count = struct.unpack("<HHH", f.read(6))
        print(f"Generated {OUTPUT} ({os.path.getsize(OUTPUT)} bytes), {count} images")
