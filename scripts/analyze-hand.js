const fs = require('fs');

function parseGLB(path) {
  const buf = fs.readFileSync(path);
  const jsonLen = buf.readUInt32LE(12);
  const gltf = JSON.parse(buf.slice(20, 20 + jsonLen).toString('utf8'));
  const binOffset = 20 + jsonLen + 8;
  const binBuf = buf.slice(binOffset);
  return { gltf, binBuf };
}

const { gltf: handGltf, binBuf: handBin } = parseGLB('public/models/Jewelry+Hand+Holder.glb');
console.log('Hand meshes:');
handGltf.meshes.forEach(m => {
  m.primitives.forEach((p, idx) => {
    const acc = handGltf.accessors[p.attributes.POSITION];
    console.log(`Hand mesh "${m.name}" prim ${idx}: min=${JSON.stringify(acc.min)}, max=${JSON.stringify(acc.max)}, count=${acc.count}`);
  });
});

console.log('\nHand nodes:');
handGltf.nodes.forEach((n, idx) => {
  console.log(`Node ${idx}: "${n.name}" translation=${JSON.stringify(n.translation)} rotation=${JSON.stringify(n.rotation)} scale=${JSON.stringify(n.scale)}`);
});
