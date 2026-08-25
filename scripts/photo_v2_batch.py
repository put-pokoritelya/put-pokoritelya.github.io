#!/usr/bin/env python3
"""Adaptive, identity-preserving portrait grade for «Путь Покорителя».

The script intentionally does NOT regenerate, reshape, smooth or retouch faces.
It performs only photographic corrections: tone, white balance, saturation,
background restraint and mild output sharpening. Each file gets parameters
from its own measured exposure/color statistics.

Input:  assets/photo/*.jpg
Output: assets/photo-v2/*.webp
        photo-v2-report.csv
        photo-v2-contact-sheet.jpg
        photo-v2-preview.html
"""

from __future__ import annotations

import csv
import html
import math
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageOps

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "assets" / "photo"
OUT = ROOT / "assets" / "photo-v2"
REPORT = ROOT / "photo-v2-report.csv"
SHEET = ROOT / "photo-v2-contact-sheet.jpg"
PREVIEW = ROOT / "photo-v2-preview.html"

OUT.mkdir(parents=True, exist_ok=True)

CASCADE = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")


def clamp(v: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, v))


def smooth_mask(size: tuple[int, int], faces: list[tuple[int, int, int, int]]) -> Image.Image:
    w, h = size
    mask = Image.new("L", (w, h), 0)
    d = ImageDraw.Draw(mask)
    if faces:
        for x, y, fw, fh in faces:
            # Enlarge to include forehead, jaw and a little neck/shoulder context.
            cx, cy = x + fw / 2, y + fh / 2
            ew, eh = fw * 1.65, fh * 1.95
            box = (
                int(cx - ew / 2), int(cy - eh * 0.52),
                int(cx + ew / 2), int(cy + eh * 0.48),
            )
            d.ellipse(box, fill=255)
    else:
        # Conservative fallback for portraits where Haar misses a profile.
        d.ellipse((int(w * .25), int(h * .08), int(w * .76), int(h * .72)), fill=215)
    return mask.filter(ImageFilter.GaussianBlur(radius=max(w, h) * .035))


def detect_faces(rgb: np.ndarray) -> list[tuple[int, int, int, int]]:
    gray = cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY)
    min_side = max(44, int(min(rgb.shape[:2]) * .075))
    faces = CASCADE.detectMultiScale(
        gray, scaleFactor=1.08, minNeighbors=4, minSize=(min_side, min_side)
    )
    return [tuple(map(int, f)) for f in faces]


def stats(rgb: np.ndarray) -> tuple[float, float, float, float]:
    f = rgb.astype(np.float32) / 255.0
    lum = .2126 * f[..., 0] + .7152 * f[..., 1] + .0722 * f[..., 2]
    hsv = cv2.cvtColor(rgb, cv2.COLOR_RGB2HSV).astype(np.float32)
    sat = hsv[..., 1] / 255.0
    return float(np.mean(lum)), float(np.percentile(lum, 10)), float(np.percentile(lum, 95)), float(np.mean(sat))


def apply_luma_curve(rgb: np.ndarray, exposure_ev: float, shadow_lift: float, highlight_comp: float) -> np.ndarray:
    x = rgb.astype(np.float32) / 255.0
    y = .2126 * x[..., 0] + .7152 * x[..., 1] + .0722 * x[..., 2]

    gain = 2.0 ** exposure_ev
    y2 = np.clip(y * gain, 0.0, 1.0)

    if shadow_lift > 0:
        y2 = y2 + shadow_lift * np.power(1.0 - y2, 2.4)

    if highlight_comp > 0:
        # Smooth shoulder: compress only the upper tonal region.
        t = np.clip((y2 - .62) / .38, 0.0, 1.0)
        y2 = y2 - highlight_comp * (t * t * (3 - 2 * t)) * (y2 - .62)

    ratio = y2 / np.maximum(y, 1e-4)
    out = np.clip(x * ratio[..., None], 0.0, 1.0)
    return (out * 255.0).astype(np.uint8)


def mild_channel_balance(im: Image.Image, means: tuple[float, float, float]) -> Image.Image:
    r, g, b = means
    # Very small correction only. We protect the documentary character of the lighting.
    rg = clamp((g + 1e-6) / (r + 1e-6), .96, 1.04)
    bg = clamp((g + 1e-6) / (b + 1e-6), .96, 1.04)
    r_gain = clamp(1.0 + (rg - 1.0) * .30, .988, 1.018)
    b_gain = clamp(1.0 + (bg - 1.0) * .28, .982, 1.018)
    arr = np.asarray(im).astype(np.float32)
    arr[..., 0] *= r_gain
    arr[..., 2] *= b_gain
    return Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8))


def face_metrics(rgb: np.ndarray, mask: Image.Image) -> tuple[float, float, tuple[float, float, float]]:
    m = np.asarray(mask).astype(np.float32) / 255.0
    sel = m > .45
    if sel.sum() < 100:
        sel = np.ones(m.shape, dtype=bool)
    px = rgb[sel].astype(np.float32) / 255.0
    lum = .2126 * px[:, 0] + .7152 * px[:, 1] + .0722 * px[:, 2]
    hsv = cv2.cvtColor((rgb).astype(np.uint8), cv2.COLOR_RGB2HSV).astype(np.float32)
    sat = hsv[..., 1][sel] / 255.0
    means = tuple(float(v) for v in np.mean(px, axis=0))
    return float(np.mean(lum)), float(np.mean(sat)), means


def grade(path: Path) -> tuple[Image.Image, dict[str, object]]:
    src = Image.open(path).convert("RGB")
    rgb0 = np.asarray(src)
    faces = detect_faces(rgb0)
    mask = smooth_mask(src.size, faces)

    mean_l, p10, p95, mean_sat = stats(rgb0)
    face_l, face_sat, face_rgb = face_metrics(rgb0, mask)

    # Individual exposure decision from THIS source image.
    # Keep the correction intentionally modest: photography, not AI re-creation.
    target_mean = .45
    exposure_ev = clamp(math.log2(target_mean / max(mean_l, .08)) * .42, -.34, .34)
    if face_l < .36:
        exposure_ev += clamp((.44 - face_l) * .42, 0, .10)
    elif face_l > .70:
        exposure_ev -= clamp((face_l - .67) * .55, 0, .12)
    exposure_ev = clamp(exposure_ev, -.38, .38)

    shadow_lift = clamp((.105 - p10) * .65, 0.0, .075)
    highlight_comp = clamp((p95 - .86) * 1.10, 0.0, .24)

    rgb = apply_luma_curve(rgb0, exposure_ev, shadow_lift, highlight_comp)
    im = Image.fromarray(rgb)

    # Mild neutralization based on the subject area, not the neon background.
    im = mild_channel_balance(im, face_rgb)

    # Contrast is adaptive: flat frames get a little more, already hard frames get less.
    contrast = 1.045 if (p95 - p10) < .68 else 1.018
    im = ImageEnhance.Contrast(im).enhance(contrast)

    # Background competition: only highly saturated frames get stronger reduction.
    if mean_sat > .42:
        bg_sat = .76
    elif mean_sat > .32:
        bg_sat = .82
    elif mean_sat > .24:
        bg_sat = .88
    else:
        bg_sat = .94

    desat_bg = ImageEnhance.Color(im).enhance(bg_sat)
    inv_mask = ImageOps.invert(mask)
    im = Image.composite(desat_bg, im, inv_mask)

    # Protect/restore natural subject color. No smoothing, no shape changes.
    if face_sat < .18:
        face_color = 1.07
    elif face_sat > .42:
        face_color = .94
    else:
        face_color = 1.015
    subject = ImageEnhance.Color(im).enhance(face_color)
    im = Image.composite(subject, im, mask)

    # Local face density: dark faces are lifted; over-lit faces are gently pulled down.
    if face_l < .38:
        face_gain = 1.10
    elif face_l < .44:
        face_gain = 1.055
    elif face_l > .72:
        face_gain = .91
    elif face_l > .64:
        face_gain = .955
    else:
        face_gain = 1.0
    face_layer = ImageEnhance.Brightness(im).enhance(face_gain)
    im = Image.composite(face_layer, im, mask)

    # Output-only sharpening. No skin blur/beauty retouching.
    im = im.filter(ImageFilter.UnsharpMask(radius=.85, percent=34, threshold=5))

    notes: list[str] = []
    if p95 > .90: notes.append("HIGHLIGHT_HEAVY")
    if p10 < .07: notes.append("DEEP_SHADOWS")
    if mean_sat > .38: notes.append("COLOR_HEAVY")
    if face_l < .40: notes.append("FACE_DARK")
    if face_l > .68: notes.append("FACE_BRIGHT")
    if not faces: notes.append("PROFILE_OR_NO_FACE_FALLBACK")
    if not notes: notes.append("MINIMAL_CORRECTION")

    info = {
        "file": path.name,
        "faces": len(faces),
        "mean_luma": round(mean_l, 4),
        "p10": round(p10, 4),
        "p95": round(p95, 4),
        "mean_saturation": round(mean_sat, 4),
        "face_luma": round(face_l, 4),
        "face_saturation": round(face_sat, 4),
        "exposure_ev": round(exposure_ev, 3),
        "shadow_lift": round(shadow_lift, 3),
        "highlight_comp": round(highlight_comp, 3),
        "background_saturation": bg_sat,
        "face_gain": face_gain,
        "diagnosis": ";".join(notes),
    }
    return im, info


def fit_thumb(im: Image.Image, size=(300, 180)) -> Image.Image:
    canvas = Image.new("RGB", size, "#f5f3ef")
    copy = im.copy()
    copy.thumbnail(size, Image.Resampling.LANCZOS)
    x = (size[0] - copy.width) // 2
    y = (size[1] - copy.height) // 2
    canvas.paste(copy, (x, y))
    return canvas


def build_contact(pairs: list[tuple[Path, Path, dict[str, object]]]) -> None:
    cell_w, cell_h = 632, 226
    thumb = (300, 180)
    cols = 2
    rows = math.ceil(len(pairs) / cols)
    sheet = Image.new("RGB", (cell_w * cols, cell_h * rows), "white")
    draw = ImageDraw.Draw(sheet)

    for i, (orig, out, info) in enumerate(pairs):
        c, r = i % cols, i // cols
        x0, y0 = c * cell_w, r * cell_h
        a = fit_thumb(Image.open(orig).convert("RGB"), thumb)
        b = fit_thumb(Image.open(out).convert("RGB"), thumb)
        sheet.paste(a, (x0 + 8, y0 + 32))
        sheet.paste(b, (x0 + 320, y0 + 32))
        draw.text((x0 + 8, y0 + 8), f"{orig.stem}  |  ORIGINAL  →  V2", fill="black")
        draw.text((x0 + 320, y0 + 212), str(info["diagnosis"])[:45], fill="#555555")
    sheet.save(SHEET, quality=91, subsampling=0, optimize=True)


def build_preview(pairs: list[tuple[Path, Path, dict[str, object]]]) -> None:
    cards = []
    for orig, out, info in pairs:
        cards.append(f"""
        <article class="pair">
          <h2>{html.escape(orig.stem.replace('-', ' ').title())}</h2>
          <div class="imgs">
            <figure><img src="assets/photo/{html.escape(orig.name)}" alt=""><figcaption>Original source</figcaption></figure>
            <figure><img src="assets/photo-v2/{html.escape(out.name)}" alt=""><figcaption>Living Editorial V2</figcaption></figure>
          </div>
          <p class="diag">{html.escape(str(info['diagnosis']))}</p>
        </article>""")

    PREVIEW.write_text("""<!doctype html><html lang="ru"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Photo V2 — QA preview</title>
<style>
body{margin:0;background:#FBF9F5;color:#1B1C1A;font:16px/1.5 Arial,sans-serif}.wrap{max-width:1280px;margin:auto;padding:36px}
h1{font:48px Georgia,serif;margin:0 0 12px}.lead{max-width:850px;color:#555}.pair{padding:32px 0;border-top:1px solid #ddd}.pair h2{font:28px Georgia,serif}.imgs{display:grid;grid-template-columns:1fr 1fr;gap:18px}.imgs figure{margin:0}.imgs img{width:100%;height:auto;display:block}.imgs figcaption,.diag{font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:#666;margin-top:8px}.diag{color:#8b1c20}@media(max-width:700px){.imgs{grid-template-columns:1fr}.wrap{padding:20px}h1{font-size:36px}}
</style></head><body><main class="wrap"><h1>Living Editorial Portraits — batch QA</h1>
<p class="lead">No face generation, reshaping, smoothing or identity edits. Only adaptive photographic correction. Review before any production switch.</p>
""" + "\n".join(cards) + "</main></body></html>", encoding="utf-8")


def main() -> None:
    sources = sorted(p for p in SRC.glob("*.jpg") if p.is_file())
    if not sources:
        raise SystemExit("No assets/photo/*.jpg found")

    pairs: list[tuple[Path, Path, dict[str, object]]] = []
    rows: list[dict[str, object]] = []
    for src in sources:
        out_im, info = grade(src)
        out_path = OUT / f"{src.stem}.webp"
        out_im.save(out_path, "WEBP", quality=93, method=6)
        pairs.append((src, out_path, info))
        rows.append(info)
        print(f"{src.name}: {info['diagnosis']} -> {out_path.name}")

    with REPORT.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        writer.writerows(rows)

    build_contact(pairs)
    build_preview(pairs)
    print(f"Processed {len(pairs)} hero portraits")


if __name__ == "__main__":
    main()
