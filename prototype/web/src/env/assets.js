// env/assets.js - runtime asset loading for the environment (relative URLs next to index.html:
// dist/assets/...). Everything is optional: a failed load (e.g. the page opened from file://, where
// browsers block fetch) leaves the graybox in place and logs one console.warn, never an error.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';

/** Asset paths (relative to the page). build.mjs copies prototype/web/assets/ -> dist/assets/. */
export const ASSETS = {
  hdri: 'assets/hdri/overcast_soil_puresky_2k.hdr',
  terrainAlbedo: 'assets/terrain/terrain_albedo.jpg',
  terrainNrm: 'assets/terrain/terrain_nrm.jpg',
  terrainHeight: 'assets/terrain/terrain_height.jpg',
  reeds: 'assets/foliage/reed_atlas.webp',
  grass: 'assets/foliage/grass_atlas.webp',
  props: 'assets/models/env_props.glb',
  nature: 'assets/models/env_nature.glb',
};

export const assetUrl = (rel) => new URL(rel, document.baseURI).href;

export function loadImage(rel) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`image failed: ${rel}`));
    img.src = assetUrl(rel);
  });
}

/** Vertically stacked square layers (w x w*n) -> DataArrayTexture (RGBA8, mipmapped). */
export async function loadArrayTexture(rel, layers, { srgb = false, size = 0, anisotropy = 4 } = {}) {
  const img = await loadImage(rel);
  const w0 = img.naturalWidth, h0 = img.naturalHeight / layers;
  const w = size || w0, h = size || h0;
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h * layers;
  const ctx = cv.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, w, h * layers);
  const data = new Uint8Array(ctx.getImageData(0, 0, w, h * layers).data.buffer);
  const tex = new THREE.DataArrayTexture(data, w, h, layers);
  tex.format = THREE.RGBAFormat; tex.type = THREE.UnsignedByteType;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.minFilter = THREE.LinearMipmapLinearFilter; tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = true; tex.anisotropy = anisotropy;
  tex.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  tex.flipY = false; tex.unpackAlignment = 4;
  tex.needsUpdate = true;
  return tex;
}

export async function loadTexture(rel, { srgb = true, anisotropy = 4 } = {}) {
  const img = await loadImage(rel);
  const t = new THREE.Texture(img);
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.anisotropy = anisotropy; t.needsUpdate = true;
  return t;
}

let _gltf = null;
export function gltfLoader() {
  if (!_gltf) { _gltf = new GLTFLoader(); _gltf.setMeshoptDecoder(MeshoptDecoder); }
  return _gltf;
}
export function loadGLB(rel) { return gltfLoader().loadAsync(assetUrl(rel)); }

export function loadHDR(rel) {
  return new RGBELoader().setDataType(THREE.HalfFloatType).loadAsync(assetUrl(rel));
}
