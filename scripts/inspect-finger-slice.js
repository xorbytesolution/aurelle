const fs = require('fs');

const buf = fs.readFileSync('public/models/Jewelry+Hand+Holder.glb');
const jsonLen = buf.readUInt32LE(12);
const jsonBuf = buf.slice(20, 20 + jsonLen);
const gltf = JSON.parse(jsonBuf.toString('utf8'));

const binStart = 20 + jsonLen + 8;
const posView = gltf.bufferViews[0];
const posCount = gltf.accessors[0].count;

let fingerVerts = [];
for (let i = 0; i < posCount; i++) {
  const off = binStart + posView.byteOffset + i * 12;
  const rawX = buf.readFloatLE(off);
  const rawY = buf.readFloatLE(off + 4);
  const rawZ = buf.readFloatLE(off + 8);

  // Node 0 has rotation [sqrt(0.5), 0, 0, sqrt(0.5)] -> +90 deg around X
  // (x, y, z) -> (x, -z, y)
  const x = rawX;
  const y = -rawZ;
  const z = rawY;

  // Ring finger base Y ~ 18.25, X around -2.3
  if (y >= 18.15 && y <= 18.35 && x >= -3.2 && x <= -1.4) {
    fingerVerts.push({ x, y, z });
  }
}

console.log(`Found ${fingerVerts.length} vertices near ring finger base Y in [18.15, 18.35]`);

let fMinZ = Infinity, fMaxZ = -Infinity, fMinX = Infinity, fMaxX = -Infinity;
fingerVerts.forEach(v => {
  if (v.z < fMinZ) fMinZ = v.z;
  if (v.z > fMaxZ) fMaxZ = v.z;
  if (v.x < fMinX) fMinX = v.x;
  if (v.x > fMaxX) fMaxX = v.x;
});
console.log(`Finger slice at Y~18.25: X=[${fMinX.toFixed(3)}, ${fMaxX.toFixed(3)}] Z=[${fMinZ.toFixed(3)}, ${fMaxZ.toFixed(3)}]`);
console.log(`Finger center: X=${((fMinX+fMaxX)/2).toFixed(3)}, Z=${((fMinZ+fMaxZ)/2).toFixed(3)}`);
console.log(`Finger diameter: dX=${(fMaxX-fMinX).toFixed(3)}, dZ=${(fMaxZ-fMinZ).toFixed(3)}`);

// Also check which side is dorsal vs palm:
// In this slice, what are the normal directions?
// Vertices at minZ vs maxZ
console.log(`Min Z (back or palm?): ${fMinZ.toFixed(3)}, Max Z: ${fMaxZ.toFixed(3)}`);
