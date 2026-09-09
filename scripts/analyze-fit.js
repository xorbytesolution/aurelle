const fs = require('fs');
const THREE = require('three');

// Let's parse both GLBs
function parseGLB(path) {
  const buf = fs.readFileSync(path);
  const jsonLen = buf.readUInt32LE(12);
  const gltf = JSON.parse(buf.slice(20, 20 + jsonLen).toString('utf8'));
  const binOffset = 20 + jsonLen + 8; // header(12) + chunk0_len(4) + chunk0_type(4) + jsonLen + chunk1_len(4) + chunk1_type(4)
  const binBuf = buf.slice(binOffset);
  return { gltf, binBuf };
}

console.log('--- RING ANALYSIS ---');
const { gltf: ringGltf, binBuf: ringBin } = parseGLB('public/models/doji-diamond-ring.glb');

// Find ring bounds and bore radius
ringGltf.meshes.forEach(m => {
  m.primitives.forEach(p => {
    const acc = ringGltf.accessors[p.attributes.POSITION];
    console.log(`Ring mesh "${m.name}": min=${JSON.stringify(acc.min)}, max=${JSON.stringify(acc.max)}`);
  });
});

console.log('\n--- HAND ANALYSIS ---');
const { gltf: handGltf, binBuf: handBin } = parseGLB('public/models/Jewelry+Hand+Holder.glb');
handGltf.meshes.forEach(m => {
  m.primitives.forEach(p => {
    const acc = ringGltf.accessors[p.attributes.POSITION];
    console.log(`Hand mesh "${m.name}": min=${JSON.stringify(acc.min)}, max=${JSON.stringify(acc.max)}`);
  });
});
