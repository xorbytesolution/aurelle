const fs = require('fs');

function parseGLB(path) {
  const buf = fs.readFileSync(path);
  const jsonLen = buf.readUInt32LE(12);
  const gltf = JSON.parse(buf.slice(20, 20 + jsonLen).toString('utf8'));
  const binOffset = 20 + jsonLen + 8;
  const binBuf = buf.slice(binOffset);
  return { gltf, binBuf };
}

const { gltf, binBuf } = parseGLB('public/models/Jewelry+Hand+Holder.glb');
const posAcc = gltf.accessors[gltf.meshes[0].primitives[0].attributes.POSITION];
const bufView = gltf.bufferViews[posAcc.bufferView];
const byteOffset = (bufView.byteOffset || 0) + (posAcc.byteOffset || 0);

console.log('Total vertices:', posAcc.count);

// Filter vertices near ring finger at y ~ 18.25 in node space
// In node space: x' = x, y' = -z, z' = y
// So y' ~ 18.25 means z ~ -18.25
// And ring finger is near x ~ -0.08, z' ~ -0.25 (y ~ -0.25)
let ringVerts = [];
for (let i = 0; i < posAcc.count; i++) {
  const off = byteOffset + i * 12;
  const x = binBuf.readFloatLE(off);
  const y = binBuf.readFloatLE(off + 4);
  const z = binBuf.readFloatLE(off + 8);
  
  const nodeX = x;
  const nodeY = -z;
  const nodeZ = y;

  if (Math.abs(nodeY - 18.25) < 0.15 && Math.abs(nodeX - (-0.08)) < 1.8 && Math.abs(nodeZ - (-0.25)) < 1.8) {
    ringVerts.push({ x: nodeX, y: nodeY, z: nodeZ });
  }
}

console.log(`Found ${ringVerts.length} vertices near ring finger base y=18.25`);
if (ringVerts.length > 0) {
  let minX = Infinity, maxX = -Infinity;
  let minZ = Infinity, maxZ = -Infinity;
  ringVerts.forEach(v => {
    if (v.x < minX) minX = v.x;
    if (v.x > maxX) maxX = v.x;
    if (v.z < minZ) minZ = v.z;
    if (v.z > maxZ) maxZ = v.z;
  });
  console.log(`Finger slice bounds at y=18.25:`);
  console.log(`X: [${minX.toFixed(3)}, ${maxX.toFixed(3)}], center=${((minX+maxX)/2).toFixed(3)}, width=${(maxX-minX).toFixed(3)}`);
  console.log(`Z: [${minZ.toFixed(3)}, ${maxZ.toFixed(3)}], center=${((minZ+maxZ)/2).toFixed(3)}, depth=${(maxZ-minZ).toFixed(3)}`);
}
