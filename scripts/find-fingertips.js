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

// Let's find local peaks in Y (the fingertips!)
let highVerts = [];
for (let i = 0; i < posAcc.count; i++) {
  const off = byteOffset + i * 12;
  const x = binBuf.readFloatLE(off);
  const y = binBuf.readFloatLE(off + 4);
  const z = binBuf.readFloatLE(off + 8);
  const nodeX = x;
  const nodeY = -z;
  const nodeZ = y;
  if (nodeY > 21.0) {
    highVerts.push({ x: nodeX, y: nodeY, z: nodeZ });
  }
}

// Group into fingertip clusters
console.log('Fingertip vertices (Y > 21.0): count =', highVerts.length);
// Find max Y for each finger:
// Index finger, middle finger, ring finger, pinky, thumb?
let bins = {};
highVerts.forEach(v => {
  let binKey = Math.round(v.x * 0.7);
  if (!bins[binKey]) bins[binKey] = [];
  bins[binKey].push(v);
});

Object.keys(bins).sort((a,b)=>a-b).forEach(k => {
  let pts = bins[k];
  let maxY = Math.max(...pts.map(p=>p.y));
  let topPt = pts.find(p=>p.y === maxY);
  console.log(`Cluster ${k}: count=${pts.length}, max Y=${maxY.toFixed(3)} at pos=(${topPt.x.toFixed(3)}, ${topPt.y.toFixed(3)}, ${topPt.z.toFixed(3)})`);
});
