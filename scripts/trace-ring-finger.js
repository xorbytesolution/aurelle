const fs = require('fs');

const buf = fs.readFileSync('public/models/Jewelry+Hand+Holder.glb');
const jsonLen = buf.readUInt32LE(12);
const jsonBuf = buf.slice(20, 20 + jsonLen);
const gltf = JSON.parse(jsonBuf.toString('utf8'));

const binStart = 20 + jsonLen + 8;
const posView = gltf.bufferViews[0];
const posCount = gltf.accessors[0].count;

const verts = [];
for (let i = 0; i < posCount; i++) {
  const off = binStart + posView.byteOffset + i * 12;
  const rawX = buf.readFloatLE(off);
  const rawY = buf.readFloatLE(off + 4);
  const rawZ = buf.readFloatLE(off + 8);
  verts.push({
    x: rawX,
    y: -rawZ,
    z: rawY
  });
}

// Filter vertices belonging to the Ring Finger:
// X range ~ [-1.2, 0.8]
// Y range from base of finger (around Y = 17.5) to tip of ring finger
const ringFingerVerts = verts.filter(v => v.x >= -1.3 && v.x <= 0.9 && v.y >= 17.0);

console.log(`Found ${ringFingerVerts.length} vertices in Ring Finger column`);

// Find max Y (tip of ring finger)
let tip = { x: 0, y: -Infinity, z: 0 };
for (const v of ringFingerVerts) {
  if (v.y > tip.y) {
    tip = v;
  }
}
console.log(`Ring finger tip: pos = (${tip.x.toFixed(3)}, ${tip.y.toFixed(3)}, ${tip.z.toFixed(3)})`);

// Sample slices every 0.5 units in Y from base (18.0) to near tip (22.5)
console.log('\n--- RING FINGER SLICES ---');
const splinePoints = [];
for (let y = tip.y; y >= 17.5; y -= 0.5) {
  const slice = ringFingerVerts.filter(v => Math.abs(v.y - y) <= 0.25);
  if (slice.length < 10) continue;
  
  const minX = Math.min(...slice.map(v => v.x));
  const maxX = Math.max(...slice.map(v => v.x));
  const minZ = Math.min(...slice.map(v => v.z));
  const maxZ = Math.max(...slice.map(v => v.z));
  
  const avgX = slice.reduce((sum, v) => sum + v.x, 0) / slice.length;
  const avgZ = slice.reduce((sum, v) => sum + v.z, 0) / slice.length;
  
  const widthX = maxX - minX;
  const depthZ = maxZ - minZ;
  const radius = (widthX + depthZ) / 4;
  
  console.log(`Y=${y.toFixed(2)}: Center=(${avgX.toFixed(3)}, ${avgZ.toFixed(3)}), X-range=[${minX.toFixed(2)}, ${maxX.toFixed(2)}], Z-range=[${minZ.toFixed(2)}, ${maxZ.toFixed(2)}], diaX=${widthX.toFixed(3)}, diaZ=${depthZ.toFixed(3)}, avgRadius=${radius.toFixed(3)}, count=${slice.length}`);
  
  splinePoints.push({
    x: Number(avgX.toFixed(3)),
    y: Number(y.toFixed(2)),
    z: Number(avgZ.toFixed(3)),
    radius: Number(radius.toFixed(3)),
    diaX: Number(widthX.toFixed(3)),
    diaZ: Number(depthZ.toFixed(3))
  });
}

console.log('\n--- SPLINE POINTS FOR RING FINGER (from above tip down to base) ---');
console.log(JSON.stringify(splinePoints, null, 2));
