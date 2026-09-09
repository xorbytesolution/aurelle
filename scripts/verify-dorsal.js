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

// Let's inspect the hand vertices on the palm vs dorsal side:
// Where is the palm? In a hand, the palm is cupped, knuckles are on the dorsal side.
// Also look at lines 299-315 in RingCanvas.tsx:
// "float isPalm = smoothstep(0.1, -0.4, vHandLocalNorm.z);" -> normal facing -Z in hand-local space is palm!
// "Fingernails (distal dorsal side, Y > 21.7 and normal facing dorsal +Z)" -> +Z in hand-local space is dorsal!
console.log('Testing hand local space Z:');
// Let's check fingernail vs finger pad at Y=22.3 (fingertip):
let tipVerts = [];
for (let i = 0; i < hPosAcc.count; i++) {
  const off = hOffset + i * 12;
  const x = handBin.readFloatLE(off);
  const y = handBin.readFloatLE(off + 4);
  const z = handBin.readFloatLE(off + 8);
  const nodeX = x;
  const nodeY = -z;
  const nodeZ = y;
  if (Math.abs(nodeY - 22.3) < 0.1 && Math.abs(nodeX - 0.17) < 0.8) {
    tipVerts.push(new THREE.Vector3(nodeX, nodeY, nodeZ));
  }
}
let minZ = Math.min(...tipVerts.map(v => v.z));
let maxZ = Math.max(...tipVerts.map(v => v.z));
console.log(`Fingertip Z span: [${minZ.toFixed(3)}, ${maxZ.toFixed(3)}]`);
// At the fingertip, the finger arches forward (+Z).
// What about at the base (y=18.25)?
let baseVerts = [];
for (let i = 0; i < hPosAcc.count; i++) {
  const off = hOffset + i * 12;
  const x = handBin.readFloatLE(off);
  const y = handBin.readFloatLE(off + 4);
  const z = handBin.readFloatLE(off + 8);
  const nodeX = x;
  const nodeY = -z;
  const nodeZ = y;
  if (Math.abs(nodeY - 18.25) < 0.1 && Math.abs(nodeX - (-0.14)) < 0.8) {
    baseVerts.push(new THREE.Vector3(nodeX, nodeY, nodeZ));
  }
}
let baseMinZ = Math.min(...baseVerts.map(v => v.z));
let baseMaxZ = Math.max(...baseVerts.map(v => v.z));
console.log(`Base Z span at Y=18.25: [${baseMinZ.toFixed(3)}, ${baseMaxZ.toFixed(3)}]`);
