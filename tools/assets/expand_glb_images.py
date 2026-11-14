"""Expand embedded WebP images to PNG for Blender import (no network access)."""
import io
import json
import struct
from pathlib import Path
from PIL import Image


def expand_images(source, destination):
    raw = Path(source).read_bytes()
    if raw[:4] != b'glTF':
        raise ValueError('Expected binary glTF')
    size, kind = struct.unpack_from('<II', raw, 12)
    if kind != 0x4e4f534a:
        raise ValueError('Missing JSON chunk')
    document = json.loads(raw[20:20 + size])
    offset = 20 + size
    binary_size, kind = struct.unpack_from('<II', raw, offset)
    if kind != 0x004e4942:
        raise ValueError('Missing BIN chunk')
    binary = raw[offset + 8:offset + 8 + binary_size]
    output = bytearray()
    for index, view in enumerate(document['bufferViews']):
        start = view.get('byteOffset', 0)
        data = binary[start:start + view['byteLength']]
        images = [image for image in document.get('images', []) if image.get('bufferView') == index]
        if images:
            buffer = io.BytesIO()
            Image.open(io.BytesIO(data)).save(buffer, format='PNG')
            data = buffer.getvalue()
            for image in images:
                image['mimeType'] = 'image/png'
        output.extend(b'\0' * (-len(output) % 4))
        view.update(byteOffset=len(output), byteLength=len(data))
        output.extend(data)
    for texture in document.get('textures', []):
        webp = texture.get('extensions', {}).pop('EXT_texture_webp', None)
        if webp:
            texture['source'] = webp['source']
    for field in ('extensionsUsed', 'extensionsRequired'):
        document[field] = [v for v in document.get(field, []) if v != 'EXT_texture_webp']
    document['buffers'][0]['byteLength'] = len(output)
    encoded = json.dumps(document).encode()
    encoded += b' ' * (-len(encoded) % 4)
    output.extend(b'\0' * (-len(output) % 4))
    Path(destination).write_bytes(struct.pack('<III', 0x46546c67, 2, 28 + len(encoded) + len(output))
                                 + struct.pack('<II', len(encoded), 0x4e4f534a) + encoded
                                 + struct.pack('<II', len(output), 0x004e4942) + output)


def extract_images(source, output_directory):
    """Write embedded PNGs without depending on Blender's lazy packed-image loading."""
    raw = Path(source).read_bytes()
    size = struct.unpack_from('<I', raw, 12)[0]
    document = json.loads(raw[20:20+size])
    binary = raw[28+size:]
    result = {}
    for image in document.get('images', []):
        view = document['bufferViews'][image['bufferView']]
        start = view.get('byteOffset', 0)
        name = 'asset_' + ''.join(c if c.isalnum() else '_' for c in image['name']) + '.png'
        target = Path(output_directory) / name
        target.write_bytes(binary[start:start+view['byteLength']])
        result[image['name']] = target
    return result
