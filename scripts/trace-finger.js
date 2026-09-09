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

// Let's inspect slice at y=18.25 across all X
let vertsAtY = [];
for (let i = 0; i < posAcc.count; i++) {
  const off = byteOffset + i * 12;
  const x = binBuf.readFloatLE(off);
  const y = binBuf.readFloatLE(off + 4);
  const z = binBuf.readFloatLE(off + 8);
  
  const nodeX = x;
  const nodeY = -z;
  const nodeZ = y;

  if (Math.abs(nodeY - 18.25) < 0.05) {
    vertsAtY.push({ x: nodeX, y: nodeY, z: nodeZ });
  }
}

// Let's trace from fingertip down to base:
// What is the fingertip of ring finger?
// In FINGER_SPLINE_POINTS: [ 0.165, 22.46, 3.70 ]
console.log('Ring finger slice by Y from tip to base:');
for (let testY of [22.4, 21.5, 20.5, 19.5, 18.8, 18.25]) {
  let fverts = [];
  for (let i = 0; i < posAcc.count; i++) {
    const off = byteOffset + i * 12;
    const x = binBuf.readFloatLE(off);
    const y = binBuf.readFloatLE(off + 4);
    const z = binBuf.readFloatLE(off + 8);
    const nodeX = x;
    const nodeY = -z;
    const nodeZ = y;
    if (Math.abs(nodeY - testY) < 0.05) {
      fverts.push({ x: nodeX, y: nodeY, z: nodeZ });
    }
  }

  // Filter around ring finger path
  // Find cluster nearest spline x, z
  console.log(`\nAt Y = ${testY}: total verts = ${fverts.length}`);
  // Let's find min/max in a window of radius 1.2 around the expected center
}
