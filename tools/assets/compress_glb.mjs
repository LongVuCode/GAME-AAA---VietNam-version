// compress_glb.mjs - post-process GLB exported by tools/blender/build_env_props.py for the web build:
// dedup + prune, weld, then EXT_meshopt_compression (quantized positions/normals/UVs, meshopt filters).
// three.js 0.169 decodes it with GLTFLoader.setMeshoptDecoder(MeshoptDecoder) from
// three/examples/jsm/libs/meshopt_decoder.module.js (the decoder wasm is embedded in that module).
// Textures stay as the WebP images Blender exported (EXT_texture_webp).
//   node tools/assets/compress_glb.mjs <in.glb> <out.glb> [<in2.glb> <out2.glb> ...]
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, prune, weld, meshopt } from '@gltf-transform/functions';
import { MeshoptEncoder } from 'meshoptimizer';
import { statSync } from 'node:fs';

await MeshoptEncoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder });
const args = process.argv.slice(2);
if (args.length < 2 || args.length % 2) { console.error('usage: compress_glb.mjs in.glb out.glb [...]'); process.exit(2); }
for (let i = 0; i < args.length; i += 2) {
  const [src, dst] = [args[i], args[i + 1]];
  const doc = await io.read(src);
  await doc.transform(dedup(), prune({ keepLeaves: true }), weld(), meshopt({ encoder: MeshoptEncoder, level: 'medium' }));
  await io.write(dst, doc);
  console.log(`${src} (${statSync(src).size} B) -> ${dst} (${statSync(dst).size} B)`);
}
