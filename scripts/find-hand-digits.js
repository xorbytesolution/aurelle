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

// Let's inspect the entire hand: find all tips / extremities
let tips = [
  { name: 'Digit A', x: -2.4, y: 22.17, z: 0.5 },
  { name: 'Digit B', x: 0.165, y: 22.46, z: 3.7 },
  { name: 'Digit C', x: 2.15, y: 24.85, z: 0.6 },
  { name: 'Digit D', x: 4.95, y: 23.88, z: 0.1 },
];

// Let's check if there is another digit (e.g. thumb)
let otherHigh = [];
for (let i = 0; i < posAcc.count; i++) {
  const off = byteOffset + i * 12;
  const x = binBuf.readFloatLE(off);
  const y = binBuf.readFloatLE(off + 4);
  const z = binBuf.readFloatLE(off + 8);
  const nodeX = x;
  const nodeY = -z;
  const nodeZ = y;
  // Let's find any extremity where y > 15
  if (nodeX > 6.0 || nodeX < -3.0 || nodeZ < -2.0 || nodeZ > 4.5) {
    otherHigh.push({ x: nodeX, y: nodeY, z: nodeZ });
  }
}
console.log('Outer vertices count:', otherHigh.length);
if (otherHigh.length > 0) {
  let maxX = Math.max(...otherHigh.map(p=>p.x));
  let minX = Math.min(...otherHigh.map(p=>p.x));
  let maxZ = Math.max(...otherHigh.map(p=>p.z));
  let minZ = Math.min(...otherHigh.map(p=>p.z));
  console.log(`X range: [${minX.toFixed(2)}, ${maxX.toFixed(2)}], Z range: [${minZ.toFixed(2)}, ${maxZ.toFixed(2)}]`);
  let maxExtremity = otherHigh.reduce((max, p) => p.x > max.x ? p : max, otherHigh[0]);
  console.log('Max X vertex:', maxExtremity);
}
