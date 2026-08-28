#!/usr/bin/env python3
"""Builds the GitLocal promo GIF from screenshots + generated title/closing cards."""
import subprocess, os, sys

ROOT = "/workspace/agent/gitlocal/docs/assets/promo-src"
CLIPS = os.path.join(ROOT, "clips")
TXT = os.path.join(ROOT, "txt")
os.makedirs(CLIPS, exist_ok=True)
os.makedirs(TXT, exist_ok=True)

W, H, FPS = 1280, 896, 20
BG = "0x0b1720"
ACCENT = "0x34d67a"
ACCENT2 = "0x61b7ff"
GRAY = "0x94a3b8"
WHITE = "0xffffff"
CAPTION_BG = "0x0b1720"

BOLD = "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf"
REG = "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf"
MONO = "/usr/share/fonts/truetype/liberation/LiberationMono-Bold.ttf"

LOGO = os.path.join(ROOT, "logo_112.png")


def run(cmd):
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        print("CMD FAILED:", " ".join(cmd))
        print(r.stderr[-4000:])
        sys.exit(1)


def write_txt(name, content):
    p = os.path.join(TXT, name)
    with open(p, "w") as f:
        f.write(content)
    return p


def typewriter_cmds(name, entries):
    """entries: list of (instance_name, text, start_time, char_dur)"""
    lines = []
    for inst, text, start, char_dur in entries:
        for i in range(1, len(text) + 1):
            t = start + (i - 1) * char_dur
            prefix = text[:i]
            safe = prefix.replace("\\", "\\\\").replace("'", "’").replace(":", "\\:")
            lines.append((t, f"{t:.3f} {inst} reinit 'text={safe}';"))
    lines.sort(key=lambda x: x[0])
    p = os.path.join(TXT, name)
    with open(p, "w") as f:
        f.write("\n".join(l for _, l in lines) + "\n")
    return p


def card(out_name, duration, headline_lines, headline_y_start=350, headline_gap=72,
         headline_colors=None, eyebrow=None, subtext=None, footer=None, chip_text=None,
         char_dur=0.055, type_start=0.35):
    """Builds a title/closing card: dark bg + logo + typewriter headline + static extras."""
    if headline_colors is None:
        headline_colors = [WHITE] * len(headline_lines)

    filters = []
    # inputs: [0] color bg, [1] logo png (looped)
    filters.append(f"[1:v]scale=112:112[logo]")
    filters.append(f"[0:v][logo]overlay=x=(W-112)/2:y=54:format=auto[bg0]")

    stage = "bg0"
    idx = 0

    if eyebrow:
        p = write_txt(f"{out_name}_eyebrow.txt", eyebrow)
        nxt = f"s{idx}"; idx += 1
        filters.append(
            f"[{stage}]drawtext=fontfile={BOLD}:textfile={p}:fontcolor={ACCENT}:"
            f"fontsize=24:x=(w-text_w)/2:y=192[{nxt}]"
        )
        stage = nxt

    # typewriter headline lines via sendcmd
    entries = []
    t = type_start
    for i, text in enumerate(headline_lines):
        inst = f"txt{i}"
        entries.append((f"drawtext@{inst}", text, t, char_dur))
        t = t + len(text) * char_dur + 0.18

    cmds_path = typewriter_cmds(f"{out_name}_cmds.txt", entries)
    nxt = f"s{idx}"; idx += 1
    filters.append(f"[{stage}]sendcmd=f={cmds_path}[{nxt}]")
    stage = nxt

    for i, text in enumerate(headline_lines):
        y = headline_y_start + i * headline_gap
        nxt = f"s{idx}"; idx += 1
        filters.append(
            f"[{stage}]drawtext@txt{i}=fontfile={BOLD}:fontcolor={headline_colors[i]}:"
            f"fontsize=58:x=(w-text_w)/2:y={y}:text=''[{nxt}]"
        )
        stage = nxt

    if subtext:
        p = write_txt(f"{out_name}_subtext.txt", subtext)
        nxt = f"s{idx}"; idx += 1
        sub_y = headline_y_start + len(headline_lines) * headline_gap + 46
        filters.append(
            f"[{stage}]drawtext=fontfile={REG}:textfile={p}:fontcolor={GRAY}:"
            f"fontsize=26:x=(w-text_w)/2:y={sub_y}[{nxt}]"
        )
        stage = nxt

    if chip_text:
        chip_w, chip_h = 360, 64
        chip_x = f"(w-{chip_w})/2"
        chip_y = 620
        nxt = f"s{idx}"; idx += 1
        filters.append(
            f"[{stage}]drawbox=x={chip_x}:y={chip_y}:w={chip_w}:h={chip_h}:"
            f"color={ACCENT}@0.12:t=fill[{nxt}]"
        )
        stage = nxt
        nxt2 = f"s{idx}"; idx += 1
        filters.append(
            f"[{stage}]drawbox=x={chip_x}:y={chip_y}:w={chip_w}:h={chip_h}:"
            f"color={ACCENT}@0.9:t=2[{nxt2}]"
        )
        stage = nxt2
        p = write_txt(f"{out_name}_chip.txt", chip_text)
        nxt = f"s{idx}"; idx += 1
        filters.append(
            f"[{stage}]drawtext=fontfile={MONO}:textfile={p}:fontcolor={ACCENT}:"
            f"fontsize=30:x=(w-text_w)/2:y={chip_y + (chip_h - 30) // 2 - 4}[{nxt}]"
        )
        stage = nxt

    if footer:
        p = write_txt(f"{out_name}_footer.txt", footer)
        nxt = f"s{idx}"; idx += 1
        filters.append(
            f"[{stage}]drawtext=fontfile={REG}:textfile={p}:fontcolor={GRAY}:"
            f"fontsize=20:x=(w-text_w)/2:y=750[{nxt}]"
        )
        stage = nxt

    nxt = "outv"
    filters.append(
        f"[{stage}]fade=t=in:st=0:d=0.3,fade=t=out:st={duration - 0.3}:d=0.3[{nxt}]"
    )

    filter_complex = ";".join(filters)
    out_path = os.path.join(CLIPS, f"{out_name}.mp4")
    cmd = [
        "ffmpeg", "-y",
        "-f", "lavfi", "-i", f"color=c={BG}:s={W}x{H}:d={duration}:r={FPS}",
        "-loop", "1", "-t", str(duration), "-i", LOGO,
        "-filter_complex", filter_complex,
        "-map", "[outv]",
        "-c:v", "libx264", "-pix_fmt", "yuv420p",
        out_path,
    ]
    run(cmd)
    print("built", out_path)


def screenshot_clip(out_name, image_path, duration, caption, char_dur=0.032, type_start=0.4,
                     zoom_to=1.08, focus="center"):
    frames = int(round(duration * FPS))
    if focus == "top":
        x_expr = "iw/2-(iw/zoom/2)"
        y_expr = "0"
    else:
        x_expr = "iw/2-(iw/zoom/2)"
        y_expr = "ih/2-(ih/zoom/2)"

    entries = [("drawtext@cap", caption, type_start, char_dur)]
    cmds_path = typewriter_cmds(f"{out_name}_cmds.txt", entries)

    filter_complex = (
        f"[0:v]scale=1600:1120,"
        f"zoompan=z='min(zoom+0.0007,{zoom_to})':d={frames}:s={W}x{H}:"
        f"x='{x_expr}':y='{y_expr}':fps={FPS}[zp];"
        f"[zp]drawbox=x=0:y={H-140}:w={W}:h=140:color={CAPTION_BG}@0.78:t=fill[cb];"
        f"[cb]sendcmd=f={cmds_path}[sc];"
        f"[sc]drawtext@cap=fontfile={BOLD}:fontcolor={WHITE}:fontsize=32:"
        f"x=44:y={H-92}:text=''[td];"
        f"[td]fade=t=in:st=0:d=0.3,fade=t=out:st={duration - 0.3}:d=0.3[outv]"
    )
    out_path = os.path.join(CLIPS, f"{out_name}.mp4")
    cmd = [
        "ffmpeg", "-y",
        "-loop", "1", "-i", image_path,
        "-filter_complex", filter_complex,
        "-map", "[outv]",
        "-frames:v", str(frames),
        "-r", str(FPS),
        "-c:v", "libx264", "-pix_fmt", "yuv420p",
        out_path,
    ]
    run(cmd)
    print("built", out_path)


def main():
    card(
        "01_title", 4.4,
        headline_lines=["Designed for builders.", "Not just developers."],
        headline_colors=[WHITE, ACCENT],
        eyebrow="GITLOCAL",
        subtext="A local, GitHub-style viewer for the code your AI agent wrote",
        char_dur=0.06875,
    )

    screenshot_clip(
        "02_tree", os.path.join(ROOT, "shot5-folders.jpg"), 3.4,
        "Browse your repo like GitHub, right on your machine",
        char_dur=0.04,
    )
    screenshot_clip(
        "05_claude", os.path.join(ROOT, "shot1-empty-repo.jpg"), 3.4,
        "Hand off to your AI agent without leaving the repo",
        char_dur=0.04,
    )

    card(
        "06_closing", 4.2,
        headline_lines=["Get started now.", "It is free."],
        headline_colors=[WHITE, ACCENT],
        eyebrow="GITLOCAL",
        chip_text="npx gitlocal",
        footer="npm install -g gitlocal   |   Homebrew app also available for macOS",
        char_dur=0.075,
    )

    # concat
    list_path = os.path.join(ROOT, "concat_list.txt")
    order = ["01_title", "02_tree", "05_claude", "06_closing"]
    with open(list_path, "w") as f:
        for name in order:
            f.write(f"file '{os.path.join(CLIPS, name + '.mp4')}'\n")

    full_mp4 = os.path.join(ROOT, "promo_full.mp4")
    run(["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", list_path, "-c", "copy", full_mp4])
    print("built", full_mp4)


if __name__ == "__main__":
    main()
