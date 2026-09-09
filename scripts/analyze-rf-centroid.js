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

const { gltf: handGltf, binBuf: handBin } = parseGLB('public/models/Jewelry+Hand+Holder.glb');
const hPosAcc = handGltf.accessors[handGltf.meshes[0].primitives[0].attributes.POSITION];
const hBufView = handGltf.bufferViews[hPosAcc.bufferView];
const hOffset = (hBufView.byteOffset || 0) + (hPosAcc.byteOffset || 0);

// Let's inspect vertices on the Ring Finger specifically:
// The ring finger is between Pinky (x ~ -2.4) and Middle Finger (x ~ 2.15).
// So Ring Finger is around X in [-1.2, 1.0].
// Let's find vertices in X in [-1.2, 1.0] at Y in [18.2, 18.3]:
let rfVerts = [];
for (let i = 0; i < hPosAcc.count; i++) {
  const off = hOffset + i * 12;
  const x = handBin.readFloatLE(off);
  const y = handBin.readFloatLE(off + 4);
  const z = handBin.readFloatLE(off + 8);
  const nodeX = x;
  const nodeY = -z;
  const nodeZ = y;

  if (nodeY >= 18.2 && nodeY <= 18.3 && nodeX >= -1.2 && nodeX <= 1.0) {
    rfVerts.push(new THREE.Vector3(nodeX, nodeY, nodeZ));
  }
}

console.log(`Ring finger vertices at Y in [18.2, 18.3]: ${rfVerts.length}`);
// Compute centroid of these vertices:
let cx = 0, cy = 0, cz = 0;
rfVerts.forEach(v => { cx += v.x; cy += v.y; cz += v.z; });
cx /= rfVerts.length; cy /= rfVerts.length; cz /= rfVerts.length;
console.log(`Ring finger centroid at Y=18.25: (${cx.toFixed(3)}, ${cy.toFixed(3)}, ${cz.toFixed(3)})`);

let minX = Math.min(...rfVerts.map(v => v.x));
let maxX = Math.max(...rfVerts.map(v => v.x));
let minZ = Math.min(...rfVerts.map(v => v.z));
let maxZ = Math.max(...rfVerts.map(v => v.z));
console.log(`X span: [${minX.toFixed(3)}, ${maxX.toFixed(3)}], width = ${(maxX - minX).toFixed(3)}`);
console.log(`Z span: [${minZ.toFixed(3)}, ${maxZ.toFixed(3)}], depth = ${(maxZ - minZ).toFixed(3)}`);

let distsFromCentroid = rfVerts.map(v => Math.hypot(v.x - cx, v.z - cz));
let maxR = Math.max(...distsFromCentroid);
let minR = Math.min(...distsFromCentroid);
let avgR = distsFromCentroid.reduce((a,b)=>a+b, 0) / distsFromCentroid.length;
console.log(`Radius from centroid in local units: min=${minR.toFixed(3)}, max=${maxR.toFixed(3)}, avg=${avgR.toFixed(3)}`);

console.log(`\nIn World units with HAND_SCALE = 0.13:`);
console.log(`Ring finger diameter at Y=18.25: ~ ${(avgR * 2 * 0.13).toFixed(4)} (radius ${(avgR * 0.13).toFixed(4)})`);
console.log(`Max radius (widest part, e.g. web/knuckle): ${(maxR * 0.13).toFixed(4)}`);

// Now let's check what scale the ring needs to be to fit around this finger!
// Ring model: bore inner radius is ~0.088 units in GLB.
// To have inner bore radius = (maxR * 0.13) + clearance:
const targetBoreRadius = (maxR * 0.13) * 1.05; // 5% comfort clearance
const neededRingScale = targetBoreRadius / 0.088;
console.log(`\nNeeded ring scale to completely encompass finger (zero clipping): ${neededRingScale.toFixed(3)}`);

