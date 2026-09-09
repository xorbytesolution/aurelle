const fs = require('fs');

const buf = fs.readFileSync('public/models/Jewelry+Hand+Holder.glb');
const jsonLen = buf.readUInt32LE(12);
const jsonBuf = buf.slice(20, 20 + jsonLen);
const gltf = JSON.parse(jsonBuf.toString('utf8'));

const binStart = 20 + jsonLen + 8;
const posView = gltf.bufferViews[0];
const normView = gltf.bufferViews[1];
const posCount = gltf.accessors[0].count;

let dorsalCount = 0;
let palmCount = 0;

for (let i = 0; i < posCount; i++) {
  const pOff = binStart + posView.byteOffset + i * 12;
  const nOff = binStart + normView.byteOffset + i * 12;
  
  const rawX = buf.readFloatLE(pOff);
  const rawY = buf.readFloatLE(pOff + 4);
  const rawZ = buf.readFloatLE(pOff + 8);
  
  // (x, y, z) -> (x, -z, y)
  const x = rawX;
  const y = -rawZ;
  const z = rawY;
  
  const nx = buf.readFloatLE(nOff);
  const ny = -buf.readFloatLE(nOff + 8);
  const nz = buf.readFloatLE(nOff + 4);
  
  // Check ring finger at Y in [18.1, 18.4]
  if (Math.abs(y - 18.25) < 0.15 && x >= -1.0 && x <= 0.8) {
    if (z > -0.25) {
      // +Z side
      dorsalCount++;
    } else {
      // -Z side
      palmCount++;
    }
  }
}
console.log(`Ring finger base vertices: +Z (dorsal/knuckle side): ${dorsalCount}, -Z (palm side): ${palmCount}`);
