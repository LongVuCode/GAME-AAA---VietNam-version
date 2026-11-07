#!/usr/bin/env python3
"""Prepare runtime textures for the web prototype from the downloaded CC0 sources.

Reads the files fetched by fetch_polyhaven.py (images only, never executed) and writes:

  <web>/assets/terrain/terrain_albedo.jpg   5 layers stacked vertically (1024 x 5120), sRGB, graded to
                                            the ART_DIRECTION palette (per-channel gain in linear space)
  <web>/assets/terrain/terrain_nrm.jpg      R,G = tangent normal x,y (OpenGL +Y), B = roughness (4:4:4 jpg)
  <web>/assets/terrain/terrain_height.jpg   R = height (for height blending), G = cavity/AO, 512 px layers
  <work>/props_tex/<name>_{diff,nor,rough}.png  graded/resized maps that tools/blender reads
  <work>/props_tex/bamboo_culm_*.png        self-made procedural bamboo culm (no source asset)
  <work>/props_tex/<model>_diffa.png        foliage diffuse + separate CC0 alpha map merged to RGBA

    python3 -I tools/assets/prepare_textures.py --dl <assets_dl> --work <workdir> --web prototype/web
Requires Pillow + numpy.
"""
import argparse
import os

import numpy as np
from PIL import Image

# Terrain layer order is part of the shader contract (prototype/web/src/env/terrain.js TERRAIN_LAYERS).
TERRAIN = [
    ("brown_mud_02", "wet_mud", "#4a3b2b"),
    ("sparse_grass", "grass", "#626640"),
    ("dirt_floor", "path", "#6e5a42"),
    ("mud_cracked_dry_riverbed_002", "dry_mud", "#77654c"),
    ("brown_mud_leaves_01", "bank", "#56503a"),
]
# Prop textures for Blender: (source id, out name, palette target or None, size)
PROPS = [
    ("reed_roof_04", "thatch", "#9a8355", 1024),
    ("weathered_planks", "planks", "#5c452f", 1024),
    ("bamboo_wall_02", "woven_bamboo", "#a08a5c", 1024),
    ("bark_willow", "bark", "#4f4030", 512),
    ("rough_wood", "hewn_wood", "#6a5640", 1024),
    ("clay_plaster", "clay", "#8a6a50", 512),
]
FOLIAGE = ["shrub_03", "fern_02", "weed_plant_02"]


def srgb_to_lin(c):
    c = c / 255.0
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)


def lin_to_srgb(c):
    c = np.clip(c, 0, 1)
    return np.round(255 * np.where(c <= 0.0031308, c * 12.92, 1.055 * c ** (1 / 2.4) - 0.055)).astype(np.uint8)


def hex_rgb(h):
    h = h.lstrip("#")
    return np.array([int(h[i:i + 2], 16) for i in (0, 2, 4)], dtype=np.float64)


def grade(img, target_hex, strength=0.85):
    """Shift the mean colour toward the palette target (per-channel gain in linear light), keep detail."""
    a = srgb_to_lin(np.asarray(img.convert("RGB"), dtype=np.float64))
    mean = a.reshape(-1, 3).mean(0)
    tgt = srgb_to_lin(hex_rgb(target_hex))
    gain = (tgt / np.maximum(mean, 1e-4)) ** strength
    return Image.fromarray(lin_to_srgb(a * gain))


def load(path, size, mode="RGB"):
    im = Image.open(path).convert(mode)
    return im if im.size == (size, size) else im.resize((size, size), Image.LANCZOS)


def tex(dl, tid, m):
    return os.path.join(dl, "textures", tid, f"{tid}_{m}_1k.jpg")


def bamboo_culm(work, w=256, h=1024, seed=3):
    """Procedural dry bamboo culm (u around the culm, v along it; 3 nodes per tile). Self-made."""
    rng = np.random.default_rng(seed)
    v = np.linspace(0, 1, h, endpoint=False)[:, None]
    u = np.linspace(0, 1, w, endpoint=False)[None, :]
    fib = np.repeat(rng.normal(0, 1, (1, w)), h, 0)
    fib = (fib + np.roll(fib, 1, 1) + np.roll(fib, -1, 1)) / 3
    streak = np.repeat(rng.normal(0, 1, (h // 32, 1)), 32, 0)[:h] * 0.04
    nodes = 3
    d = np.abs(((v * nodes) % 1.0) - 0.5) * 2  # 1 at a node, 0 between
    ring = np.exp(-((1 - d) / 0.018) ** 2)
    ridge = np.exp(-((1 - d) / 0.05) ** 2)
    base = np.array([0.62, 0.55, 0.34])  # weathered dry bamboo (linear-ish, graded below)
    shade = 1 + 0.05 * fib + streak - 0.35 * ring + 0.06 * ridge
    blotch = 0.85 + 0.15 * np.cos(u * 6.283 * 2 + rng.uniform(0, 6)) * np.cos(v * 6.283 * 1.5)
    col = base[None, None, :] * (shade * blotch)[..., None]
    col[..., 1] *= 1 - 0.08 * ring
    img = Image.fromarray(np.clip(col * 255, 0, 255).astype(np.uint8))
    img = grade(img, "#a8955f", 0.9)
    img.save(os.path.join(work, "bamboo_culm_diff.png"))
    height = 0.6 * ridge - 0.9 * ring + 0.03 * fib
    gy, gx = np.gradient(height)
    n = np.stack([-gx * 6, gy * 6, np.ones_like(gx)], -1)
    n /= np.linalg.norm(n, axis=-1, keepdims=True)
    Image.fromarray(((n * 0.5 + 0.5) * 255).astype(np.uint8)).save(os.path.join(work, "bamboo_culm_nor.png"))
    rough = np.clip(0.55 + 0.25 * ring - 0.1 * ridge + 0.03 * fib, 0, 1)
    Image.fromarray((rough * 255).astype(np.uint8)).save(os.path.join(work, "bamboo_culm_rough.png"))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dl", required=True)
    ap.add_argument("--work", required=True)
    ap.add_argument("--web", required=True)
    a = ap.parse_args()
    tdir = os.path.join(a.web, "assets", "terrain")
    pdir = os.path.join(a.work, "props_tex")
    os.makedirs(tdir, exist_ok=True)
    os.makedirs(pdir, exist_ok=True)

    S, HS = 1024, 512
    alb, nrm, hgt = [], [], []
    for tid, _role, target in TERRAIN:
        alb.append(grade(load(tex(a.dl, tid, "diff"), S), target))
        n = np.asarray(load(tex(a.dl, tid, "nor_gl"), S))
        r = np.asarray(load(tex(a.dl, tid, "rough"), S, "L"))
        nrm.append(Image.fromarray(np.dstack([n[..., 0], n[..., 1], r]).astype(np.uint8)))
        d = np.asarray(load(tex(a.dl, tid, "disp"), HS, "L"), dtype=np.float64)
        d = (d - d.min()) / max(1e-6, d.max() - d.min())
        blur = np.asarray(Image.fromarray((d * 255).astype(np.uint8)).resize((64, 64), Image.BILINEAR).resize((HS, HS), Image.BILINEAR), dtype=np.float64) / 255.0
        cav = np.clip(0.5 + (d - blur) * 2.5, 0, 1)
        hgt.append(Image.fromarray(np.dstack([(d * 255), (cav * 255), np.zeros_like(d)]).astype(np.uint8)))

    def stack(ims, size):
        out = Image.new("RGB", (size, size * len(ims)))
        for i, im in enumerate(ims):
            out.paste(im, (0, i * size))
        return out

    stack(alb, S).save(os.path.join(tdir, "terrain_albedo.jpg"), quality=86, optimize=True, progressive=True)
    stack(nrm, S).save(os.path.join(tdir, "terrain_nrm.jpg"), quality=90, subsampling=0, optimize=True)
    stack(hgt, HS).save(os.path.join(tdir, "terrain_height.jpg"), quality=90, subsampling=0, optimize=True)

    for tid, name, target, size in PROPS:
        d = load(tex(a.dl, tid, "diff"), size)
        (grade(d, target) if target else d).save(os.path.join(pdir, f"{name}_diff.png"))
        load(tex(a.dl, tid, "nor_gl"), size).save(os.path.join(pdir, f"{name}_nor.png"))
        load(tex(a.dl, tid, "rough"), size, "L").save(os.path.join(pdir, f"{name}_rough.png"))
    bamboo_culm(pdir)

    for mid in FOLIAGE:
        base = os.path.join(a.dl, "models", mid, "textures")
        d = Image.open(os.path.join(base, f"{mid}_diff_1k.jpg")).convert("RGB")
        al = Image.open(os.path.join(base, f"{mid}_alpha_1k.jpg")).convert("L").resize(d.size)
        d = grade(d, {"shrub_03": "#5f6a3a", "fern_02": "#55663a", "weed_plant_02": "#5d6a3c"}[mid], 0.6)
        d.putalpha(al)
        d.save(os.path.join(pdir, f"{mid}_diffa.png"))
    print("terrain ->", tdir, [os.path.getsize(os.path.join(tdir, f)) for f in sorted(os.listdir(tdir))])
    print("props ->", pdir, len(os.listdir(pdir)), "files")


if __name__ == "__main__":
    main()
