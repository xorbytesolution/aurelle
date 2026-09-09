const fs = require('fs');
const buf = fs.readFileSync('public/models/Jewelry+Hand+Holder.glb');
const jsonLen = buf.readUInt32LE(12);
const jsonBuf = buf.slice(20, 20 + jsonLen);
const gltf = JSON.parse(jsonBuf.toString('utf8'));
const binStart = 20 + jsonLen + 8;
const posView = gltf.bufferViews[0];
const posCount = gltf.accessors[0].count;

// Let's inspect the wrist and palm area: Y in [8.0, 14.0]
let palmZMin = Infinity, palmZMax = -Infinity;
let palmXMin = Infinity, palmXMax = -Infinity;
for (let i = 0; i < posCount; i++) {
  const off = binStart + posView.byteOffset + i * 12;
  const x = buf.readFloatLE(off);
  const y = -buf.readFloatLE(off + 8);
  const z = buf.readFloatLE(off + 4);

  if (y >= 10.0 && y <= 14.0) {
    if (z < palmZMin) palmZMin = z;
    if (z > palmZMax) palmZMax = z;
    if (x < palmXMin) palmXMin = x;
    if (x > palmXMax) palmXMax = x;
  }
}
console.log(`Palm/Mid-hand region (Y in [10, 14]): X=[${palmXMin.toFixed(2)}, ${palmXMax.toFixed(2)}] Z=[${palmZMin.toFixed(2)}, ${palmZMax.toFixed(2)}]`);

// Check the thumb:
let thumbMaxX = -Infinity, thumbVert = null;
for (let i = 0; i < posCount; i++) {
  const off = binStart + posView.byteOffset + i * 12;
  const x = buf.readFloatLE(off);
  const y = -buf.readFloatLE(off + 8);
  const z = buf.readFloatLE(off + 4);

  if (x > thumbMaxX) {
    thumbMaxX = x;
    thumbVert = { x, y, z };
  }
}
console.log('Thumb tip or extreme right vertex:', thumbVert);

// Check normals on the finger to see which side faces outwards
const normView = gltf.bufferViews[1];
let posZNormals = []; // normals of vertices with high Z (Z > 0.5)
let negZNormals = []; // normals of vertices with low Z (Z < -0.4)
for (let i = 0; i < posCount; i++) {
  const off = binStart + posView.byteOffset + i * 12;
  const x = buf.readFloatLE(off);
  const y = -buf.readFloatLE(off + 8);
  const z = buf.readFloatLE(off + 4);

  const nOff = binStart + normView.byteOffset + i * 12;
  const nx = buf.readFloatLE(nOff);
  const ny = -buf.readFloatLE(nOff + 8);
  const nz = buf.readFloatLE(nOff + 4);

  if (y >= 18.0 && y <= 18.5 && x >= -3.2 && x <= -1.4) {
    if (z > 0.5) posZNormals.push({ nx, ny, nz });
    if (z < -0.4) negZNormals.push({ nx, ny, nz });
  }
}

const avgPosZ = posZNormals.reduce((acc, n) => ({ x: acc.x + n.nx, y: acc.y + n.ny, z: acc.z + n.nz }), { x: 0, y: 0, z: 0 });
const avgNegZ = negZNormals.reduce((acc, n) => ({ x: acc.x + n.nx, y: acc.y + n.ny, z: acc.z + n.nz }), { x: 0, y: 0, z: 0 });
console.log(`Avg normal for +Z side of finger: (${(avgPosZ.x/posZNormals.length).toFixed(3)}, ${(avgPosZ.y/posZNormals.length).toFixed(3)}, ${(avgPosZ.z/posZNormals.length).toFixed(3)})`);
console.log(`Avg normal for -Z side of finger: (${(avgNegZ.x/negZNormals.length).toFixed(3)}, ${(avgNegZ.y/negZNormals.length).toFixed(3)}, ${(avgNegZ.z/negZNormals.length).toFixed(3)})`);
