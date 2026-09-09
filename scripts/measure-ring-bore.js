const fs = require('fs');
const buf = fs.readFileSync('public/models/doji-diamond-ring.glb');
const jsonLen = buf.readUInt32LE(12);
const jsonBuf = buf.slice(20, 20 + jsonLen);
const gltf = JSON.parse(jsonBuf.toString('utf8'));
const binStart = 20 + jsonLen + 8;

// Mesh 2: Circle.006 (main band)
// Let's find vertices of Circle.006 and find the inner radius (minimum distance from Y axis where |Y| < 0.01)
const mesh2 = gltf.meshes[2];
const prim0 = mesh2.primitives[0];
const posAccessor = gltf.accessors[prim0.attributes.POSITION];
const bufferView = gltf.bufferViews[posAccessor.bufferView];

let minR = Infinity, maxR = -Infinity;
for (let i = 0; i < posAccessor.count; i++) {
  const off = binStart + bufferView.byteOffset + (posAccessor.byteOffset || 0) + i * 12;
  const x = buf.readFloatLE(off);
  const y = buf.readFloatLE(off + 4);
  const z = buf.readFloatLE(off + 8);

  const r = Math.sqrt(x * x + z * z);
  if (r < minR) minR = r;
  if (r > maxR) maxR = r;
}

console.log(`Ring mesh raw radius from Y-axis: minR=${minR.toFixed(5)} maxR=${maxR.toFixed(5)}`);
console.log(`Inner bore diameter = ${(minR * 2).toFixed(5)}`);
console.log(`Outer diameter = ${(maxR * 2).toFixed(5)}`);
