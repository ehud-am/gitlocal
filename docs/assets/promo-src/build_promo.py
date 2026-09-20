#!/usr/bin/env python3
"""Builds the GitLocal promo video (promo_full.mp4) and README/website GIF from the
screenshots in this folder, plus generated title/closing cards.

Frames are rendered with Pillow and piped straight into ffmpeg, so this needs only
`pip install pillow` and an `ffmpeg` on PATH (no ffmpeg text filters / freetype build).

    python3 build_promo.py

Outputs (next to this script):
    promo_full.mp4                 1280x896 master video
    gitlocal-promo-final-v3.gif    800x560 GIF used by the README and gitlocal.dev
    gitlocal-demo.gif              (written to ../ — same GIF)
"""
import os
import shutil
import subprocess
import sys

from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.abspath(__file__))
ASSETS = os.path.dirname(ROOT)
LOGO = os.path.join(ROOT, "logo_112.png")

W, H, FPS = 1280, 896, 20
BG = (11, 23, 32)
ACCENT = (52, 214, 122)
GRAY = (148, 163, 184)
WHITE = (255, 255, 255)

FONT_CANDIDATES = {
    "bold": [
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
        "C:/Windows/Fonts/arialbd.ttf",
    ],
    "reg": [
        "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
        "/System/Library/Fonts/Supplemental/Arial.ttf",
        "C:/Windows/Fonts/arial.ttf",
    ],
    "mono": [
        "/usr/share/fonts/truetype/liberation/LiberationMono-Bold.ttf",
        "/System/Library/Fonts/Supplemental/Courier New Bold.ttf",
        "C:/Windows/Fonts/courbd.ttf",
    ],
}


def font(kind, size):
    for path in FONT_CANDIDATES[kind]:
        if os.path.exists(path):
            return ImageFont.truetype(path, size)
    sys.exit(f"No {kind} font found; add a path to FONT_CANDIDATES")


LOGO_IMG = Image.open(LOGO).convert("RGBA").resize((112, 112), Image.LANCZOS)


def centered(draw, text, y, fnt, fill):
    width = draw.textlength(text, font=fnt)
    draw.text(((W - width) / 2, y), text, font=fnt, fill=fill)


def fade(img, t, duration, edge=0.3):
    """Fade to/from black over `edge` seconds at both ends, like ffmpeg's fade filter."""
    k = min(1.0, t / edge, (duration - t) / edge)
    if k >= 1.0:
        return img
    return Image.blend(Image.new("RGB", img.size, (0, 0, 0)), img, max(0.0, k))


def typed(text, t, start, char_dur):
    return text[: max(0, min(len(text), int((t - start) / char_dur) + 1))] if t >= start else ""


def card_frames(duration, headline, colors, eyebrow=None, subtext=None, chip=None,
                footer=None, char_dur=0.055, type_start=0.35):
    head_f, eye_f = font("bold", 58), font("bold", 24)
    sub_f, chip_f, foot_f = font("reg", 26), font("mono", 30), font("reg", 20)
    starts, t0 = [], type_start
    for line in headline:
        starts.append(t0)
        t0 += len(line) * char_dur + 0.18
    for i in range(int(round(duration * FPS))):
        t = i / FPS
        img = Image.new("RGB", (W, H), BG)
        img.paste(LOGO_IMG, ((W - 112) // 2, 54), LOGO_IMG)
        d = ImageDraw.Draw(img)
        if eyebrow:
            centered(d, eyebrow, 192, eye_f, ACCENT)
        for n, line in enumerate(headline):
            centered(d, typed(line, t, starts[n], char_dur), 350 + n * 72, head_f, colors[n])
        if subtext:
            centered(d, subtext, 350 + len(headline) * 72 + 46, sub_f, GRAY)
        if chip:
            cw, ch, cx, cy = 360, 64, (W - 360) // 2, 620
            overlay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
            od = ImageDraw.Draw(overlay)
            od.rectangle([cx, cy, cx + cw, cy + ch], fill=ACCENT + (31,))
            od.rectangle([cx, cy, cx + cw, cy + ch], outline=ACCENT + (230,), width=2)
            img = Image.alpha_composite(img.convert("RGBA"), overlay).convert("RGB")
            d = ImageDraw.Draw(img)
            centered(d, chip, cy + (ch - 30) // 2 - 4, chip_f, ACCENT)
        if footer:
            centered(d, footer, 750, foot_f, GRAY)
        yield fade(img, t, duration)


def screenshot_frames(image_name, duration, caption, char_dur=0.02, type_start=0.35):
    """A static screenshot (no zoom/pan, so the UI stays the focus) with a typed caption bar."""
    src = Image.open(os.path.join(ROOT, image_name)).convert("RGB").resize((W, H), Image.LANCZOS)
    cap_f = font("bold", 32)
    bar = Image.new("RGBA", (W, 140), BG + (232,))  # ~0.91 alpha so underlying UI text does not show through
    for i in range(int(round(duration * FPS))):
        t = i / FPS
        img = src.convert("RGBA")
        img.alpha_composite(bar, (0, H - 140))
        ImageDraw.Draw(img).text((44, H - 92), typed(caption, t, type_start, char_dur), font=cap_f, fill=WHITE)
        yield fade(img.convert("RGB"), t, duration)


# Total runtime is capped at 20 s: 3.0 + 5 x 2.2 + 3.4 + 2.6 = 20.0
def sequence():
    yield from card_frames(
        3.0, ["Designed for builders.", "Not just developers."], [WHITE, ACCENT],
        eyebrow="GITLOCAL", subtext="A local, GitHub-style viewer for the code your AI agent wrote",
        char_dur=0.035)
    shots = [
        ("shot2-browse.jpg", 2.2, "Browse your repo like GitHub, right on your machine"),
        ("shot3-markdown.jpg", 2.2, "Read Markdown the way it was meant to be read"),
        ("shot5-search.jpg", 2.2, "Search file names and contents across the repo"),
        ("shot6-review.jpg", 2.2, "See exactly what your agent changed"),
        ("shot8-excel.jpg", 2.2, "Preview PDFs, spreadsheets, decks, and more"),
        ("shot1-claude-split.jpg", 3.4, "Split the screen: run Claude right beside your code"),
    ]
    for name, dur, caption in shots:
        yield from screenshot_frames(name, dur, caption)
    yield from card_frames(
        2.6, ["Get started now.", "It is free."], [WHITE, ACCENT], eyebrow="GITLOCAL",
        chip="npx gitlocal",
        footer="npm install -g gitlocal   |   Homebrew app also available for macOS",
        char_dur=0.05)


def encode(frames, out_path):
    cmd = ["ffmpeg", "-loglevel", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24",
           "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
           "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "23", "-movflags", "+faststart", out_path]
    proc = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    for frame in frames:
        proc.stdin.write(frame.tobytes())
    proc.stdin.close()
    if proc.wait() != 0:
        sys.exit("ffmpeg failed")


def make_gif(mp4, gif, width=800, fps=10, colors=96):
    vf = (f"fps={fps},scale={width}:-1:flags=lanczos,split[a][b];"
          f"[a]palettegen=max_colors={colors}:stats_mode=diff[p];"
          f"[b][p]paletteuse=dither=bayer:bayer_scale=4:diff_mode=rectangle")
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", mp4, "-vf", vf, "-loop", "0", gif], check=True)


def main():
    mp4 = os.path.join(ROOT, "promo_full.mp4")
    encode(sequence(), mp4)
    print("built", mp4)
    gif = os.path.join(ROOT, "gitlocal-promo-final-v3.gif")
    make_gif(mp4, gif)
    shutil.copyfile(gif, os.path.join(ASSETS, "gitlocal-demo.gif"))
    print("built", gif, f"({os.path.getsize(gif) / 1e6:.1f} MB)")


if __name__ == "__main__":
    main()
