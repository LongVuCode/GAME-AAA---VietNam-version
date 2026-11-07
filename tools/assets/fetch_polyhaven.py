#!/usr/bin/env python3
"""Download the CC0 Poly Haven assets listed in polyhaven_assets.json and write a manifest.

Downloads go to a directory OUTSIDE the repo (default: $ASSETS_DL or ./assets_dl). Files are only read
afterwards (images, meshes); nothing downloaded is executed. Every file gets a SHA-256 in
manifest.json (tools/assets/manifest.json), together with the asset page URL, authors, license and
download date. `--register` prints the rows for docs/ASSET_LICENSE_REGISTER.md.

    python3 tools/assets/fetch_polyhaven.py --out /path/outside/repo/assets_dl
    python3 tools/assets/fetch_polyhaven.py --out ... --register   # print register rows only

Only the Python standard library is used. Poly Haven's license (CC0 for every asset) is stated at
https://polyhaven.com/license (checked 2026-11-07).
"""
import argparse
import datetime as dt
import hashlib
import json
import os
import sys
import time
import urllib.request

API = "https://api.polyhaven.com"
HERE = os.path.dirname(os.path.abspath(__file__))
UA = {"User-Agent": "dongco-asset-pipeline/0.4 (prototype; contact: project-dongco)"}
MAP_KEYS = {"diff": "Diffuse", "nor_gl": "nor_gl", "rough": "Rough", "disp": "Displacement", "arm": "arm", "ao": "AO"}


def get_json(url):
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60) as r:
        return json.load(r)


def sha256(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def download(url, dest, size=None, md5=None):
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    if os.path.exists(dest) and (size is None or os.path.getsize(dest) == size):
        if md5 is None or hashlib.md5(open(dest, "rb").read()).hexdigest() == md5:
            return dest
    tmp = dest + ".part"
    for attempt in range(4):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=180) as r, open(tmp, "wb") as f:
                while True:
                    b = r.read(1 << 20)
                    if not b:
                        break
                    f.write(b)
            break
        except Exception as e:  # network hiccup: retry
            if attempt == 3:
                raise
            print(f"  retry {url}: {e}", file=sys.stderr)
            time.sleep(2 + attempt * 3)
    if size is not None and os.path.getsize(tmp) != size:
        raise RuntimeError(f"size mismatch for {url}")
    if md5 is not None and hashlib.md5(open(tmp, "rb").read()).hexdigest() != md5:
        raise RuntimeError(f"md5 mismatch for {url}")
    os.replace(tmp, dest)
    return dest


def entry(asset_id, kind, role, info, files):
    return {
        "id": asset_id, "kind": kind, "role": role, "name": info.get("name", asset_id),
        "page_url": f"https://polyhaven.com/a/{asset_id}", "authors": sorted(info.get("authors", {}).keys()),
        "license": "CC0-1.0", "license_url": "https://polyhaven.com/license", "source": "Poly Haven",
        "downloaded": dt.date.today().isoformat(), "files": files,
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--config", default=os.path.join(HERE, "polyhaven_assets.json"))
    ap.add_argument("--out", default=os.environ.get("ASSETS_DL", "assets_dl"))
    ap.add_argument("--manifest", default=os.path.join(HERE, "manifest.json"))
    ap.add_argument("--register", action="store_true", help="print license register rows from the manifest and exit")
    a = ap.parse_args()
    if a.register:
        print_register(json.load(open(a.manifest, encoding="utf-8")))
        return
    cfg = json.load(open(a.config, encoding="utf-8"))
    res = cfg.get("resolution", "1k")
    out = os.path.abspath(a.out)
    manifest = {"_note": "Sinh boi tools/assets/fetch_polyhaven.py. Moi file co SHA-256; tep tai ve nam ngoai repo.",
                "generated": dt.date.today().isoformat(), "assets": []}

    for t in cfg.get("textures", []):
        info, files = get_json(f"{API}/info/{t['id']}"), get_json(f"{API}/files/{t['id']}")
        got = []
        for m in t["maps"]:
            node = files[MAP_KEYS[m]][t.get("res", res)]
            f = node.get("jpg") or node.get("png")
            dest = os.path.join(out, "textures", t["id"], os.path.basename(f["url"]))
            download(f["url"], dest, f.get("size"), f.get("md5"))
            got.append({"map": m, "url": f["url"], "path": os.path.relpath(dest, out), "bytes": os.path.getsize(dest), "sha256": sha256(dest)})
        manifest["assets"].append(entry(t["id"], "texture", t["role"], info, got))
        print("texture", t["id"], len(got), "files")

    for mdl in cfg.get("models", []):
        info, files = get_json(f"{API}/info/{mdl['id']}"), get_json(f"{API}/files/{mdl['id']}")
        g = files["gltf"][mdl.get("res", res)]["gltf"]
        base = os.path.join(out, "models", mdl["id"])
        got = []
        dest = os.path.join(base, os.path.basename(g["url"]))
        download(g["url"], dest, g.get("size"), g.get("md5"))
        got.append({"map": "gltf", "url": g["url"], "path": os.path.relpath(dest, out), "bytes": os.path.getsize(dest), "sha256": sha256(dest)})
        for rel, f in g.get("include", {}).items():
            d2 = os.path.normpath(os.path.join(base, rel))
            if not d2.startswith(base + os.sep):
                raise RuntimeError(f"unsafe include path {rel}")
            download(f["url"], d2, f.get("size"), f.get("md5"))
            got.append({"map": rel, "url": f["url"], "path": os.path.relpath(d2, out), "bytes": os.path.getsize(d2), "sha256": sha256(d2)})
        if mdl.get("alpha_map"):
            # Poly Haven's glTF bundle has no alpha for foliage cards (alphaMode MASK): fetch the separate Alpha map.
            f = files["Alpha"][mdl.get("res", res)]["jpg"]
            d2 = os.path.join(base, "textures", os.path.basename(f["url"]))
            download(f["url"], d2, f.get("size"), f.get("md5"))
            got.append({"map": "alpha", "url": f["url"], "path": os.path.relpath(d2, out), "bytes": os.path.getsize(d2), "sha256": sha256(d2)})
        manifest["assets"].append(entry(mdl["id"], "model", mdl["role"], info, got))
        print("model", mdl["id"], len(got), "files")

    for h in cfg.get("hdris", []):
        info, files = get_json(f"{API}/info/{h['id']}"), get_json(f"{API}/files/{h['id']}")
        f = files["hdri"][h.get("res", res)]["hdr"]
        dest = os.path.join(out, "hdris", os.path.basename(f["url"]))
        download(f["url"], dest, f.get("size"), f.get("md5"))
        manifest["assets"].append(entry(h["id"], "hdri", h["role"], info, [
            {"map": "hdr", "url": f["url"], "path": os.path.relpath(dest, out), "bytes": os.path.getsize(dest), "sha256": sha256(dest)}]))
        print("hdri", h["id"])

    with open(a.manifest, "w", encoding="utf-8") as fh:
        json.dump(manifest, fh, ensure_ascii=False, indent=1)
        fh.write("\n")
    print("manifest:", a.manifest, len(manifest["assets"]), "assets")


def print_register(manifest, start=1):
    kinds = {"texture": "Texture PBR 1K (CC0)", "model": "Model 3D glTF 1K (CC0)", "hdri": "HDRI (CC0)"}
    for i, a in enumerate(manifest["assets"], start):
        main = a["files"][0]
        print(f"| A-{i:03d} | Poly Haven `{a['id']}` ({a['name']}; tác giả: {', '.join(a['authors'])}) | {kinds[a['kind']]} | "
              f"{a['page_url']} (file: {len(a['files'])}, SHA-256 `{main['sha256'][:8]}…` tệp đầu, đủ trong `tools/assets/manifest.json`) | CC0 1.0 | "
              f"{a['downloaded']} | Prototype web Demo 0.4: {a['role']} | Không | | Không ghi công bắt buộc (CC0); vẫn ghi credits |")


if __name__ == "__main__":
    main()
