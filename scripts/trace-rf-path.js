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

// Let's trace slice centroids along the Ring Finger:
// We start from tip at y = 22.45 down to 18.20
const yLevels = [22.40, 22.0, 21.5, 21.0, 20.5, 20.0, 19.5, 19.0, 18.5, 18.25];

console.log('Calculating exact centroids and diameters along the Ring Finger:');
yLevels.forEach(yTarget => {
  let slice = [];
  for (let i = 0; i < hPosAcc.count; i++) {
    const off = hOffset + i * 12;
    const x = handBin.readFloatLE(off);
    const y = handBin.readFloatLE(off + 4);
    const z = handBin.readFloatLE(off + 8);
    const nodeX = x;
    const nodeY = -z;
    const nodeZ = y;

    // Filter to ring finger cross section
    // Near tip: x in [0.0, 0.5], z in [3.0, 4.2]
    // Near base: x in [-1.0, 0.8], z in [-1.2, 1.0]
    // Interpolate rough bounding box
    const prog = (22.40 - yTarget) / (22.40 - 18.25);
    const estX = THREE.MathUtils.lerp(0.20, -0.14, prog);
    const estZ = THREE.MathUtils.lerp(3.70, -0.36, prog);

    if (Math.abs(nodeY - yTarget) < 0.05) {
      if (Math.hypot(nodeX - estX, nodeZ - estZ) < 1.2) {
        slice.push(new THREE.Vector3(nodeX, nodeY, nodeZ));
      }
    }
  }

  if (slice.length > 10) {
    let cx = slice.reduce((s, v) => s + v.x, 0) / slice.length;
    let cz = slice.reduce((s, v) => s + v.z, 0) / slice.length;
    let dists = slice.map(v => Math.hypot(v.x - cx, v.z - cz));
    let maxR = Math.max(...dists);
    let avgR = dists.reduce((a,b)=>a+b, 0) / dists.length;
    console.log(`Y=${yTarget.toFixed(2)}: Centroid=(${cx.toFixed(3)}, ${yTarget.toFixed(2)}, ${cz.toFixed(3)})  avgR=${avgR.toFixed(3)}  maxR=${maxR.toFixed(3)}  worldDiam=${(avgR*2*0.13).toFixed(3)}  (pts: ${slice.length})`);
  }
});

