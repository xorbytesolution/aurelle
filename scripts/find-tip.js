const fs = require('fs');
const buf = fs.readFileSync('public/models/Jewelry+Hand+Holder.glb');
const jsonLen = buf.readUInt32LE(12);
const jsonBuf = buf.slice(20, 20 + jsonLen);
const gltf = JSON.parse(jsonBuf.toString('utf8'));
const binStart = 20 + jsonLen + 8;
const posView = gltf.bufferViews[0];
const posCount = gltf.accessors[0].count;

let maxFingerY = -Infinity;
let tipVert = null;
for (let i = 0; i < posCount; i++) {
  const off = binStart + posView.byteOffset + i * 12;
  const x = buf.readFloatLE(off);
  const y = -buf.readFloatLE(off + 8);
  const z = buf.readFloatLE(off + 4);

  // Ring finger column
  if (x >= -3.2 && x <= -1.4 && y > 21.0) {
    if (y > maxFingerY) {
      maxFingerY = y;
      tipVert = { x, y, z };
    }
  }
}
console.log('Ring finger tip vertex:', tipVert);
