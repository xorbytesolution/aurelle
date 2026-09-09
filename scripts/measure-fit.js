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

const { gltf: ringGltf, binBuf: ringBin } = parseGLB('public/models/doji-diamond-ring.glb');
const { gltf: handGltf, binBuf: handBin } = parseGLB('public/models/Jewelry+Hand+Holder.glb');

// Hand vertices
const hPosAcc = handGltf.accessors[handGltf.meshes[0].primitives[0].attributes.POSITION];
const hBufView = handGltf.bufferViews[hPosAcc.bufferView];
const hOffset = (hBufView.byteOffset || 0) + (hPosAcc.byteOffset || 0);

// Spline points in code:
const splinePts = [
  [ 0.70,  28.00,  9.50],
  [ 0.45,  25.50,  6.80],
  [ 0.28,  23.50,  4.80],
  [ 0.165, 22.46,  3.70],
  [ 0.02,  21.46,  2.67],
  [-0.074, 20.96,  1.89],
  [-0.16,  20.20,  0.65],
  [-0.14,  19.60,  0.22],
  [-0.09,  18.80, -0.05],
  [-0.08,  18.25, -0.25],
].map(([x, y, z]) => new THREE.Vector3(x, y, z));

const curve = new THREE.CatmullRomCurve3(splinePts, false, 'centripetal', 0.5);

// Let's sample the spline at wear position (u=1.0) and other positions
console.log('Wear pos (u=1.0):', curve.getPoint(1.0));
console.log('Wear tangent (u=1.0):', curve.getTangent(1.0).normalize());

// At u=1.0: localP is (-0.08, 18.25, -0.25)
// Let's find all hand vertices within a sphere or cylinder around (-0.08, 18.25, -0.25)
let wearCenter = curve.getPoint(1.0);
let wearTangent = curve.getTangent(1.0).normalize();
// Normal plane perpendicular to tangent:
// For any hand vertex, its distance along tangent: dParallel = (v - wearCenter) . tangent
// its perpendicular distance: dPerp = ||(v - wearCenter) - dParallel * tangent||
let closeVerts = [];
for (let i = 0; i < hPosAcc.count; i++) {
  const off = hOffset + i * 12;
  const x = handBin.readFloatLE(off);
  const y = handBin.readFloatLE(off + 4);
  const z = handBin.readFloatLE(off + 8);
  const v = new THREE.Vector3(x, -z, y); // node space

  const diff = v.clone().sub(wearCenter);
  const dParallel = diff.dot(wearTangent);
  if (Math.abs(dParallel) < 0.2) { // 0.2 slice along finger cylinder
    const dPerpVec = diff.sub(wearTangent.clone().multiplyScalar(dParallel));
    const dPerp = dPerpVec.length();
    if (dPerp < 2.5) {
      closeVerts.push({ v, dPerp, dPerpVec, dParallel });
    }
  }
}

console.log(`Vertices in slice at wear position: ${closeVerts.length}`);
// Max and min distances in perpendicular plane:
let maxRadius = Math.max(...closeVerts.map(c => c.dPerp));
let minRadius = Math.min(...closeVerts.map(c => c.dPerp));
console.log(`Finger radius range in slice: [${minRadius.toFixed(3)}, ${maxRadius.toFixed(3)}] in hand-local units`);

// In hand world space, hand is scaled by HAND_CALIBRATION.SCALE = 0.13:
console.log(`Finger radius in WORLD space: [${(minRadius * 0.13).toFixed(4)}, ${(maxRadius * 0.13).toFixed(4)}]`);
console.log(`Finger diameter in WORLD space: [${(minRadius * 0.26).toFixed(4)}, ${(maxRadius * 0.26).toFixed(4)}]`);

// Now let's check the ring's inner bore radius in WORLD space at RING_PHYSICAL_SCALE = 1.62:
// In doji-diamond-ring.glb, Circle.006 is the inner shank mesh:
// min X = -0.0943, max X = 0.0943 -> radius in model space = 0.0943 (or inner bore ~ 0.088)
// With ring scale 1.62:
console.log(`Ring outer radius at scale 1.62: ${(0.0953 * 1.62).toFixed(4)}`);
console.log(`Ring inner bore at scale 1.62: ${(0.088 * 1.62).toFixed(4)} ~ ${(0.0943 * 1.62).toFixed(4)}`);

