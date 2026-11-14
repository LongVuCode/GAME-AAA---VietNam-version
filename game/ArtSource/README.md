# Source art — internal prototype

Windows users only need `git lfs pull` and the UE importer; Blender is not required to build the level. See `docs/production/REALISTIC06_WINDOWS_HANDOFF.md`.

`Characters/`: three custom procedural rigs, 20 distinct motion clips; **PLACEHOLDER_AI**, internal prototype only. Meshes and motion are not production-quality realistic character art. `Environment06/`: licensed source conversion and procedural terrain; provenance L-031–L-033, per-file hashes in manifests. Do not move this pack into a commercial release without the required art/license review.

Optional regeneration (Python 3.13 + packages in `tools/blender/requirements-art.txt`, Node dependencies from `tools/assets/package-lock.json`):

```bash
cd tools/assets
npm ci
node decode_for_blender.mjs ../../prototype/web/assets/models/env_nature.glb /workspace/art-work/nature.glb ../../prototype/web/assets/models/env_props.glb /workspace/art-work/props.glb
cd ../..
python tools/blender/build_realistic_environment.py --decoded /workspace/art-work --out game/ArtSource/Environment06
python tools/blender/build_character_pack.py --out game/ArtSource/Characters
python tools/blender/verify_realistic_art.py --out reports/qa/REALISTIC06_ART_CHECK.json
python tools/blender/render_realistic_preview.py --out reports/art/realistic06
```

Use a task directory for the decoded GLBs. UE static FBX imports explicitly disable scene/unit conversion: static geometry is raw XYZ centimetres, Z up. Skeletal FBXs use the separate standard axis/unit metadata contract. Do not apply the static settings to characters. `design/data/ue_realistic_0_6.json` is the authoritative placement/quest/localization source.
