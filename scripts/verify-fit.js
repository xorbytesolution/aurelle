const fs = require('fs');

const buf = fs.readFileSync('public/models/Jewelry+Hand+Holder.glb');
const jsonLen = buf.readUInt32LE(12);
const jsonBuf = buf.slice(20, 20 + jsonLen);
const gltf = JSON.parse(jsonBuf.toString('utf8'));

const binStart = 20 + jsonLen + 8;
const posView = gltf.bufferViews[0];
const posCount = gltf.accessors[0].count;

const ringBaseLocal = { x: -0.08, y: 18.25, z: -0.25 };
const handScale = 0.13;
const ringScale = 1.62;
const ringInnerRadiusRaw = 0.07996;
const ringInnerRadiusWorld = ringInnerRadiusRaw * ringScale;

console.log('Ring Inner Radius (world):', ringInnerRadiusWorld.toFixed(4));

let maxDist = 0;
let minDist = Infinity;

for (let i = 0; i < posCount; i++) {
  const off = binStart + posView.byteOffset + i * 12;
  const rawX = buf.readFloatLE(off);
  const rawY = buf.readFloatLE(off + 4);
  const rawZ = buf.readFloatLE(off + 8);
  
  const x = rawX;
  const y = -rawZ;
  const z = rawY;
  
  if (Math.abs(y - ringBaseLocal.y) <= 0.15 && x >= -1.0 && x <= 0.8) {
    const dx = x - ringBaseLocal.x;
    const dz = z - ringBaseLocal.z;
    const distLocal = Math.sqrt(dx * dx + dz * dz);
    const distWorld = distLocal * handScale;
    
    if (distWorld > maxDist) maxDist = distWorld;
    if (distWorld < minDist) minDist = distWorld;
  }
}

console.log(`Finger radius range in slice: minWorldR = ${minDist.toFixed(4)}, maxWorldR = ${maxDist.toFixed(4)}`);
console.log(`Ring inner radius = ${ringInnerRadiusWorld.toFixed(4)}`);
console.log(`Min clearance = ${(ringInnerRadiusWorld - maxDist).toFixed(4)} world units`);
console.log(`Clearance percentage = ${(((ringInnerRadiusWorld - maxDist) / ringInnerRadiusWorld) * 100).toFixed(1)}%`);
