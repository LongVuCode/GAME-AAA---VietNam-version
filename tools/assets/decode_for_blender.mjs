// Decode the existing licensed web GLBs for DCC import; does not fetch or execute asset content.
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';
await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.decoder': MeshoptDecoder});
for (let i=2; i<process.argv.length; i+=2) {
  const doc=await io.read(process.argv[i]);
  for(const ext of doc.getRoot().listExtensionsUsed()) if(ext.extensionName==='EXT_meshopt_compression') ext.dispose();
  await io.write(process.argv[i+1],doc);
  console.log('Decoded', process.argv[i+1]);
}
