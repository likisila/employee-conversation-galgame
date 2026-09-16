from __future__ import annotations

import json
import subprocess
from pathlib import Path
from typing import Any

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
PROPERTY = ROOT / "property"
PUBLIC = ROOT / "public"
OUT = PUBLIC / "assets" / "cutscenes"
OUT.mkdir(parents=True, exist_ok=True)

CUTSCENES = json.loads((PROPERTY / "cutscenes.json").read_text(encoding="utf-8"))
IMAGES = json.loads((PROPERTY / "images.json").read_text(encoding="utf-8"))
CHARACTERS = {x["id"]: x for x in json.loads((PROPERTY / "characters.json").read_text(encoding="utf-8"))}

W = int(CUTSCENES["format"]["width"])
H = int(CUTSCENES["format"]["height"])
FPS = int(CUTSCENES["format"]["fps"])

FONT_CANDIDATES = [
    Path("/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc"),
    Path("/usr/share/fonts/opentype/noto/NotoSansCJKtc-Regular.otf"),
    Path("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"),
]
BOLD_CANDIDATES = [
    Path("/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc"),
    Path("/usr/share/fonts/opentype/noto/NotoSansCJKtc-Bold.otf"),
    Path("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"),
]
FONT_PATH = next(p for p in FONT_CANDIDATES if p.exists())
BOLD_PATH = next(p for p in BOLD_CANDIDATES if p.exists())

INK = (18, 30, 43, 225)
WHITE = (247, 247, 244, 255)
AMBER = (245, 199, 119, 255)
SLATE = (178, 191, 202, 255)


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(BOLD_PATH if bold else FONT_PATH), size)


def public_path(src: str) -> Path:
    return PUBLIC / src.lstrip("/") if src.startswith("/assets/") else ROOT / src


def cover(im: Image.Image, size=(W, H)) -> Image.Image:
    im = im.convert("RGBA")
    scale = max(size[0] / im.width, size[1] / im.height)
    nw, nh = round(im.width * scale), round(im.height * scale)
    im = im.resize((nw, nh), Image.Resampling.LANCZOS)
    left, top = (nw - size[0]) // 2, (nh - size[1]) // 2
    return im.crop((left, top, left + size[0], top + size[1]))


def load_background(key: str, mood: str | None = None) -> Image.Image:
    spec = IMAGES["backgrounds"][key]
    im = cover(Image.open(public_path(spec["src"])))
    if mood:
        tint = (12, 42, 70, 70) if mood == "cold" else (230, 158, 63, 32)
        im = Image.alpha_composite(im, Image.new("RGBA", (W, H), tint))
    return im


def load_sprite(character: str, expression: str, target_height: int, opacity: float = 1.0) -> Image.Image:
    spec = IMAGES["characters"][character]
    sheet = Image.open(public_path(spec["src"])).convert("RGBA")
    columns = int(spec.get("columns", 1))
    frame_w = sheet.width // columns
    index = int(spec.get("expressions", {}).get(expression, spec.get("expressions", {}).get(spec.get("defaultExpression", "neutral"), 0)))
    frame = sheet.crop((index * frame_w, 0, (index + 1) * frame_w, sheet.height))
    bbox = frame.getbbox()
    if bbox:
        frame = frame.crop(bbox)
    scale = target_height / frame.height
    frame = frame.resize((max(1, round(frame.width * scale)), target_height), Image.Resampling.LANCZOS)
    if opacity < 1:
        alpha = frame.getchannel("A").point(lambda p: round(p * opacity))
        frame.putalpha(alpha)
    return frame


def compose(item: dict[str, Any]) -> Image.Image:
    canvas = load_background(item["background"], item.get("mood"))
    for actor in item.get("actors", []):
        sprite = load_sprite(
            actor["character"], actor["expression"], int(actor["height"]), float(actor.get("opacity", 1.0))
        )
        x = round(float(actor["x"]) - sprite.width / 2)
        y = H - 22 - sprite.height
        canvas.alpha_composite(sprite, (x, y))
    draw = ImageDraw.Draw(canvas)
    draw.rectangle((0, 0, W, 22), fill=(7, 12, 18, 255))
    draw.rectangle((0, H - 22, W, H), fill=(7, 12, 18, 255))
    return canvas


def wrap_zh(text: str, chars: int = 28) -> str:
    lines, current = [], ""
    for ch in text:
        current += ch
        if ch == "\n" or (len(current.replace("\n", "")) >= chars and ch not in "『「（"):
            lines.append(current.rstrip("\n"))
            current = ""
    if current:
        lines.append(current)
    return "\n".join(lines)


def title_without_prefix(title: str) -> str:
    return title.split("：", 1)[1] if title.startswith("結局：") and "：" in title else title


def scene_data(scene_id: str) -> dict[str, Any]:
    return json.loads((PROPERTY / "scenes" / f"{scene_id}.json").read_text(encoding="utf-8"))


def render_card(base: Image.Image, item: dict[str, Any], card: dict[str, Any]) -> Image.Image:
    scene = scene_data(item["scene"])
    line = scene["lines"][int(card["lineIndex"])]
    text = str(line["text"])
    speaker_id = line.get("speaker")
    speaker = CHARACTERS.get(speaker_id, {}).get("displayName") if speaker_id else None

    im = base.copy()
    d = ImageDraw.Draw(im, "RGBA")

    if card.get("endingCard"):
        d.rectangle((0, 0, W, H), fill=(8, 17, 27, 112))
        heading = title_without_prefix(scene["title"])
        d.text((W // 2, 190), heading, font=font(54, True), anchor="ma", fill=WHITE)
        d.rounded_rectangle((W // 2 - 92, 260, W // 2 + 92, 266), radius=3, fill=AMBER if item.get("mood") == "warm" else SLATE)
        d.multiline_text((W // 2, 318), wrap_zh(text, 24), font=font(29), anchor="ma", align="center", spacing=12, fill=WHITE)
        return im.convert("RGB")

    if card.get("showSceneTitle"):
        d.rounded_rectangle((68, 62, 560, 132), radius=18, fill=(17, 30, 43, 210))
        d.rounded_rectangle((68, 62, 79, 132), radius=4, fill=AMBER)
        d.text((100, 82), scene["title"], font=font(30, True), fill=WHITE)

    y0, y1 = H - 252, H - 56
    d.rounded_rectangle((78, y0, 1202, y1), radius=24, fill=INK, outline=(116, 132, 144, 155), width=2)
    body_y = y0 + 34
    if speaker:
        d.text((108, y0 + 22), speaker, font=font(24, True), fill=AMBER)
        body_y = y0 + 62
    d.multiline_text((108, body_y), wrap_zh(text, 31), font=font(31), fill=WHITE, spacing=9)
    if card.get("caption"):
        d.text((108, y1 - 32), str(card["caption"]), font=font(18), fill=SLATE)
    return im.convert("RGB")


def encode_pair(a_path: Path, b_path: Path, out_path: Path, duration_ms: int, camera: str) -> None:
    duration = duration_ms / 1000
    fade = 0.7 if duration >= 8 else 0.55
    seg = (duration + fade) / 2
    frames = round(seg * FPS)
    if camera == "pull":
        z0 = "if(eq(on,1),1.035,max(zoom-0.00035,1.0))"
        z1 = "if(eq(on,1),1.025,max(zoom-0.00025,1.0))"
    else:
        z0 = "min(zoom+0.00032,1.03)"
        z1 = "min(zoom+0.00030,1.03)"
    offset = seg - fade
    vf = (
        f"[0:v]scale=1344:756,zoompan=z='{z0}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d={frames}:s={W}x{H}:fps={FPS},setsar=1[v0];"
        f"[1:v]scale=1344:756,zoompan=z='{z1}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d={frames}:s={W}x{H}:fps={FPS},setsar=1[v1];"
        f"[v0][v1]xfade=transition=fade:duration={fade}:offset={offset},format=yuv420p[v]"
    )
    subprocess.run(
        [
            "ffmpeg", "-y", "-loglevel", "error",
            "-loop", "1", "-t", str(seg), "-i", str(a_path),
            "-loop", "1", "-t", str(seg), "-i", str(b_path),
            "-filter_complex", vf, "-map", "[v]", "-an", "-t", str(duration),
            "-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-pix_fmt", "yuv420p", "-movflags", "+faststart",
            str(out_path),
        ],
        check=True,
    )


def main() -> None:
    still_dir = OUT / ".stills"
    still_dir.mkdir(exist_ok=True)
    manifest_items = []
    preview_frames = []

    for item in CUTSCENES["items"]:
        base = compose(item)
        cards = item["cards"]
        if len(cards) != 2:
            raise ValueError(f"{item['id']}: renderer currently expects exactly two cards")
        a = render_card(base, item, cards[0])
        b = render_card(base, item, cards[1])
        a_path = still_dir / f"{item['id']}-a.png"
        b_path = still_dir / f"{item['id']}-b.png"
        a.save(a_path)
        b.save(b_path)
        encode_pair(a_path, b_path, OUT / item["file"], int(item["durationMs"]), item.get("camera", "push"))
        preview_frames.append((item["file"], b.copy()))
        manifest_items.append(
            {
                "id": item["id"], "scene": item["scene"], "src": f"/assets/cutscenes/{item['file']}",
                "durationMs": item["durationMs"], "trigger": item["trigger"],
            }
        )

    manifest = {"version": CUTSCENES["version"], "format": CUTSCENES["format"], "basePath": "/assets/cutscenes/", "cutscenes": manifest_items}
    (OUT / "cutscenes.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    thumb_w, thumb_h = 384, 216
    rows = (len(preview_frames) + 1) // 2
    sheet = Image.new("RGB", (thumb_w * 2, thumb_h * rows), (20, 28, 35))
    for i, (_, im) in enumerate(preview_frames):
        sheet.paste(im.resize((thumb_w, thumb_h), Image.Resampling.LANCZOS), ((i % 2) * thumb_w, (i // 2) * thumb_h))
    sheet.save(OUT / "preview_contact_sheet.jpg", quality=90)

    (OUT / "README.md").write_text(
        "# Cutscene bundle\n\nGenerated from `property/cutscenes.json`, story scene JSON, character metadata, and the current visual assets.\n\n"
        "- 1280×720 / 24 fps / H.264 MP4\n- Silent so game BGM/SFX can continue underneath\n- Re-render with `python scripts/render_cutscenes.py`\n",
        encoding="utf-8",
    )

    for p in still_dir.glob("*"):
        p.unlink()
    still_dir.rmdir()


if __name__ == "__main__":
    main()
