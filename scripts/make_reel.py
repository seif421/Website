#!/usr/bin/env python3
"""Makes one Instagram Reel from a Rivvo product's photos and publishes it.

Run by .github/workflows/rivvo-reel-publisher.yml. No filming, no paid tools:
product photos -> animated vertical video with Arabic text (Pillow + ffmpeg).

  python scripts/make_reel.py                 # pick a product, make the reel, publish it
  python scripts/make_reel.py --sample out.mp4  # make a sample video only (no network, nothing posted)
"""
import io, os, re, subprocess, sys, tempfile
from PIL import Image, ImageDraw, ImageFilter, ImageFont

W, H = 1080, 1920
SCENE, FADE = 3.5, 0.5
BRAND = (255, 255, 255)
FN_URL = os.environ.get("REEL_FN_URL", "https://tkuokvgljrvzthjnjfew.supabase.co/functions/v1/rivvo-reel-publisher")


def find_font():
    cands = [
        "/usr/share/fonts/truetype/noto/NotoSansArabic-Bold.ttf",
        "/usr/share/fonts/truetype/noto/NotoNaskhArabic-Bold.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    ]
    try:
        out = subprocess.run(["fc-match", "-f", "%{file}", "Noto Sans Arabic:bold"], capture_output=True, text=True).stdout
        if out and "Arabic" in out:
            cands.insert(0, out)
    except Exception:
        pass
    for c in cands:
        if os.path.exists(c):
            return c
    raise SystemExit("No font with Arabic letters was found")


FONT = find_font()
font = lambda size: ImageFont.truetype(FONT, size)
has_ar = lambda s: bool(re.search(r"[؀-ۿ]", s))


def text_w(d, s, f, rtl):
    return d.textlength(s, font=f, direction="rtl" if rtl else "ltr", language="ar" if rtl else "en")


def wrap(d, s, f, maxw, rtl):
    words, lines, cur = s.split(), [], ""
    for w in words:
        t = f"{cur} {w}".strip()
        if text_w(d, t, f, rtl) <= maxw or not cur:
            cur = t
        else:
            lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines


def draw_centered(d, y, s, size, fill=(255, 255, 255), maxw=900, maxlines=2, shadow=True):
    f = font(size)
    rtl = has_ar(s)
    lines = wrap(d, s, f, maxw, rtl)[:maxlines]
    for ln in lines:
        w = text_w(d, ln, f, rtl)
        x = (W - w) / 2
        kw = dict(font=f, direction="rtl" if rtl else "ltr", language="ar" if rtl else "en")
        if shadow:
            d.text((x + 3, y + 3), ln, fill=(0, 0, 0, 160), **kw)
        d.text((x, y), ln, fill=fill, **kw)
        y += int(size * 1.35)
    return y


def cover(img, w, h):
    r = max(w / img.width, h / img.height)
    img = img.resize((int(img.width * r) + 1, int(img.height * r) + 1), Image.LANCZOS)
    l, t = (img.width - w) // 2, (img.height - h) // 2
    return img.crop((l, t, l + w, t + h))


def scene(photo, line1, line2=None, small=None):
    bg = cover(photo, W, H).filter(ImageFilter.GaussianBlur(45))
    bg = Image.blend(bg, Image.new("RGB", (W, H), (20, 20, 30)), 0.45).convert("RGBA")
    card = Image.new("RGBA", (960, 960), (255, 255, 255, 255))
    p = photo.copy()
    p.thumbnail((900, 900), Image.LANCZOS)
    card.paste(p, ((960 - p.width) // 2, (960 - p.height) // 2))
    mask = Image.new("L", card.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, 959, 959), 48, fill=255)
    bg.paste(card, (60, 330), mask)
    ov = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(ov)
    d.rounded_rectangle((60, 110, 330, 210), 50, fill=(255, 255, 255, 235))
    d.text((195, 160), "Rivvo", font=font(54), fill=(20, 20, 30), anchor="mm")
    y = 1360
    y = draw_centered(d, y, line1, 76)
    if line2:
        y = draw_centered(d, y + 10, line2, 54, fill=(255, 255, 255))
    if small:
        draw_centered(d, 1700, small, 40, fill=(235, 235, 235), maxlines=1)
    return Image.alpha_composite(bg, ov).convert("RGB")


def end_card(photo):
    bg = cover(photo, W, H).filter(ImageFilter.GaussianBlur(60))
    bg = Image.blend(bg, Image.new("RGB", (W, H), (20, 20, 30)), 0.7).convert("RGBA")
    ov = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(ov)
    d.text((W / 2, 640), "Rivvo", font=font(190), fill=BRAND, anchor="mm")
    y = draw_centered(d, 820, "اطلب دلوقتي من موقعنا", 66)
    y = draw_centered(d, y + 20, "الدفع عند الاستلام", 62)
    y = draw_centered(d, y + 10, "توصيل لكل محافظات مصر", 62)
    d.text((W / 2, y + 120), "rivvo-shop.vercel.app", font=font(54), fill=(255, 255, 255, 230), anchor="mm")
    return Image.alpha_composite(bg, ov).convert("RGB")


def build_scenes(name, photos):
    name = name.strip()
    name = (name[:46] + "…") if len(name) > 48 else name
    p = photos
    s = [scene(p[0], "منتج جديد من Rivvo", name)]
    extra = ["شوف التفاصيل على الموقع", "اطلبه دلوقتي", "الدفع عند الاستلام"]
    for i in range(1, max(len(p), 2)):
        s.append(scene(p[i % len(p)], extra[(i - 1) % len(extra)], name if i == 1 else None))
    s.append(end_card(p[0]))
    return s


def render(scenes, out):
    tmp = tempfile.mkdtemp()
    paths = []
    for i, im in enumerate(scenes):
        pth = os.path.join(tmp, f"s{i}.png")
        im.save(pth)
        paths.append(pth)
    n = len(paths)
    frames = int(SCENE * 30)
    cmd = ["ffmpeg", "-y", "-loglevel", "error"]
    for pth in paths:
        cmd += ["-i", pth]
    cmd += ["-f", "lavfi", "-i", "anullsrc=r=44100:cl=stereo"]
    fc = []
    for i in range(n):
        fc.append(f"[{i}:v]scale=2160:3840,zoompan=z='min(1+0.0006*on,1.07)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d={frames}:s={W}x{H}:fps=30,format=yuv420p,setsar=1[v{i}]")
    last = "v0"
    for i in range(1, n):
        off = round(i * (SCENE - FADE), 2)
        fc.append(f"[{last}][v{i}]xfade=transition=fade:duration={FADE}:offset={off}[x{i}]")
        last = f"x{i}"
    cmd += ["-filter_complex", ";".join(fc), "-map", f"[{last}]", "-map", f"{n}:a",
            "-c:v", "libx264", "-preset", "veryfast", "-crf", "23", "-pix_fmt", "yuv420p", "-r", "30",
            "-c:a", "aac", "-b:a", "96k", "-shortest", "-movflags", "+faststart", out]
    subprocess.run(cmd, check=True)


def main():
    if len(sys.argv) > 2 and sys.argv[1] == "--sample":
        import colorsys
        photos = []
        for i in range(3):
            im = Image.new("RGB", (900, 900), (255, 255, 255))
            d = ImageDraw.Draw(im)
            c = tuple(int(x * 255) for x in colorsys.hsv_to_rgb(i / 3, 0.6, 0.9))
            d.ellipse((150, 150, 750, 750), fill=c)
            d.rectangle((350, 350, 550, 550), fill=(255, 255, 255))
            photos.append(im)
        render(build_scenes("Wireless Bluetooth Speaker", photos), sys.argv[2])
        return
    import requests
    secret = os.environ["RIVVO_SOCIAL_CRON_SECRET"]
    hdr = {"x-rivvo-cron-secret": secret}
    r = requests.post(f"{FN_URL}?action=next", headers=hdr, timeout=60)
    data = r.json()
    if not r.ok:
        raise SystemExit(f"next failed: {data}")
    if "reel_id" not in data:
        print(data.get("skip") or data)
        return
    photos = []
    for u in data["images"]:
        try:
            resp = requests.get(u, timeout=30)
            photos.append(Image.open(io.BytesIO(resp.content)).convert("RGB"))
        except Exception as e:
            print("skipping image", u, e)
    if not photos:
        raise SystemExit("No product image could be downloaded")
    out = os.path.join(tempfile.mkdtemp(), "reel.mp4")
    render(build_scenes(data["name"], photos), out)
    with open(out, "rb") as f:
        pr = requests.post(f"{FN_URL}?action=publish&reel_id={data['reel_id']}", headers={**hdr, "Content-Type": "video/mp4"}, data=f.read(), timeout=170)
    print(pr.status_code, pr.text[:500])
    if not pr.ok:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
