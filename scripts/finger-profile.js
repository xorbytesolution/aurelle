const fs = require('fs');
const buf = fs.readFileSync('public/models/Jewelry+Hand+Holder.glb');
const jsonLen = buf.readUInt32LE(12);
const jsonBuf = buf.slice(20, 20 + jsonLen);
const gltf = JSON.parse(jsonBuf.toString('utf8'));
const binStart = 20 + jsonLen + 8;
const posView = gltf.bufferViews[0];
const posCount = gltf.accessors[0].count;

// Let's sample along the ring finger ray from base (16) to tip (22) and check Z profile
for (let y = 14; y <= 22; y += 1) {
  let minZ = Infinity, maxZ = -Infinity;
  for (let i = 0; i < posCount; i++) {
    const off = binStart + posView.byteOffset + i * 12;
    const x = buf.readFloatLE(off);
    const py = -buf.readFloatLE(off + 8);
    const z = buf.readFloatLE(off + 4);

    if (Math.abs(py - y) < 0.15 && Math.abs(x - (-2.5)) < 0.4) {
      if (z < minZ) minZ = z;
      if (z > maxZ) maxZ = z;
    }
  }
  console.log(`Finger cross-section at Y=${y}: Z in [${minZ.toFixed(2)}, ${maxZ.toFixed(2)}] thickness=${(maxZ-minZ).toFixed(2)}`);
}
