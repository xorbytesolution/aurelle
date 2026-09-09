const fs = require('fs');
const THREE = require('three');

function parseGLB(path) {
  const buf = fs.readFileSync(path);
  const jsonLen = buf.readUInt32LE(12);
  const gltf = JSON.parse(buf.slice(20, 20 + jsonLen).toString('utf8'));
  const binOffset = 20 + jsonLen + 8;
  const binBuf = buf.slice(binOffset);
  return { gltf, binBuf };
}

const { gltf, binBuf } = parseGLB('public/models/doji-diamond-ring.glb');

// Let's inspect Circle.006 which is the main band shank
const shankMesh = gltf.meshes.find(m => m.name === 'Circle.006');
const posAcc = gltf.accessors[shankMesh.primitives[0].attributes.POSITION];
const bufView = gltf.bufferViews[posAcc.bufferView];
const byteOffset = (bufView.byteOffset || 0) + (posAcc.byteOffset || 0);

// Ring bore is along Y axis!
// Radius in X-Z plane: r = hypot(x, z)
let radii = [];
let innerRadii = [];
for (let i = 0; i < posAcc.count; i++) {
  const off = byteOffset + i * 12;
  const x = binBuf.readFloatLE(off);
  const y = binBuf.readFloatLE(off + 4);
  const z = binBuf.readFloatLE(off + 8);
  const r = Math.hypot(x, z);
  radii.push(r);
  // inner surface (near y=0, smallest r)
  if (Math.abs(y) < 0.005) {
    innerRadii.push(r);
  }
}

const minR = Math.min(...radii);
const maxR = Math.max(...radii);
const innerBoreR = Math.min(...innerRadii);
console.log(`Shank radii in model space: min=${minR.toFixed(5)}, max=${maxR.toFixed(5)}, innerBore=${innerBoreR.toFixed(5)}`);

// At scale 1.62:
console.log(`At scale 1.62: innerBore in world = ${(innerBoreR * 1.62).toFixed(5)}`);
// At scale 1.80:
console.log(`At scale 1.80: innerBore in world = ${(innerBoreR * 1.80).toFixed(5)}`);

// Finger max radius is 0.1195 in world space!
// If innerBore is 0.0766 * 1.62 = 0.1241, clearance is:
console.log(`Clearance with finger at 1.62: ${(innerBoreR * 1.62 - 0.1195).toFixed(5)}`);
console.log(`Clearance with finger at 1.75: ${(innerBoreR * 1.75 - 0.1195).toFixed(5)}`);
console.log(`Clearance with finger at 1.85: ${(innerBoreR * 1.85 - 0.1195).toFixed(5)}`);
