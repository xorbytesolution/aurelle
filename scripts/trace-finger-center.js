const fs = require('fs');

const buf = fs.readFileSync('public/models/Jewelry+Hand+Holder.glb');
const jsonLen = buf.readUInt32LE(12);
const jsonBuf = buf.slice(20, 20 + jsonLen);
const gltf = JSON.parse(jsonBuf.toString('utf8'));

const binStart = 20 + jsonLen + 8;
const posView = gltf.bufferViews[0];
const posCount = gltf.accessors[0].count;

// Sample at multiple Y levels along the ring finger:
const yLevels = [17.5, 18.25, 19.25, 20.25, 21.5, 22.5, 23.5];

yLevels.forEach(targetY => {
  let fMinX = Infinity, fMaxX = -Infinity, fMinZ = Infinity, fMaxZ = -Infinity;
  let count = 0;
  for (let i = 0; i < posCount; i++) {
    const off = binStart + posView.byteOffset + i * 12;
    const rawX = buf.readFloatLE(off);
    const rawY = buf.readFloatLE(off + 4);
    const rawZ = buf.readFloatLE(off + 8);
    const x = rawX;
    const y = -rawZ;
    const z = rawY;

    if (Math.abs(y - targetY) < 0.1 && x >= -3.5 && x <= -1.2) {
      if (x < fMinX) fMinX = x; if (x > fMaxX) fMaxX = x;
      if (z < fMinZ) fMinZ = z; if (z > fMaxZ) fMaxZ = z;
      count++;
    }
  }
  const centerX = (fMinX + fMaxX) / 2;
  const centerZ = (fMinZ + fMaxZ) / 2;
  const diamX = fMaxX - fMinX;
  const diamZ = fMaxZ - fMinZ;
  console.log(`Y=${targetY.toFixed(2)}: count=${count} center=(${centerX.toFixed(3)}, ${targetY.toFixed(2)}, ${centerZ.toFixed(3)}) diam=(${diamX.toFixed(3)}, ${diamZ.toFixed(3)}) Z-range=[${fMinZ.toFixed(3)}, ${fMaxZ.toFixed(3)}]`);
});
