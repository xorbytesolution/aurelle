const fs = require('fs');
const THREE = require('three');

const buf = fs.readFileSync('public/models/Jewelry+Hand+Holder.glb');
const jsonLen = buf.readUInt32LE(12);
const jsonBuf = buf.slice(20, 20 + jsonLen);
const gltf = JSON.parse(jsonBuf.toString('utf8'));

const binStart = 20 + jsonLen + 8;
const posView = gltf.bufferViews[0];
const posCount = gltf.accessors[0].count;

const pts = [
  new THREE.Vector3( 0.70, 28.00,  9.50),
  new THREE.Vector3( 0.45, 25.50,  6.80),
  new THREE.Vector3( 0.28, 23.50,  4.80),
  new THREE.Vector3( 0.165, 22.46, 3.70),
  new THREE.Vector3( 0.02, 21.46,  2.67),
  new THREE.Vector3(-0.074, 20.96, 1.89),
  new THREE.Vector3(-0.16, 20.20,  0.65),
  new THREE.Vector3(-0.14, 19.60,  0.22),
  new THREE.Vector3(-0.09, 18.80, -0.05),
  new THREE.Vector3(-0.08, 18.25, -0.25),
];

const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal', 0.5);

const verts = [];
for (let i = 0; i < posCount; i++) {
  const off = binStart + posView.byteOffset + i * 12;
  const rawX = buf.readFloatLE(off);
  const rawY = buf.readFloatLE(off + 4);
  const rawZ = buf.readFloatLE(off + 8);
  verts.push(new THREE.Vector3(rawX, -rawZ, rawY));
}

const ringScale = 1.62;
const ringInnerRadiusWorld = 0.07996 * ringScale;
const handScale = 0.13;

console.log('Testing slide clearance from u=0.30 (fingertip) to u=1.00 (base)...');
for (let u = 0.30; u <= 1.001; u += 0.05) {
  const center = curve.getPoint(u);
  const tangent = curve.getTangent(u).normalize();
  
  // Normal plane to tangent passing through center:
  // (p - center) . tangent = 0
  // Find vertices close to this plane (within 0.2 units) and close to center (within 2.0 units)
  let maxFingerDist = 0;
  for (const v of verts) {
    if (v.x < -1.3 || v.x > 0.9) continue;
    const diff = v.clone().sub(center);
    const projOnTan = diff.dot(tangent);
    if (Math.abs(projOnTan) <= 0.2) {
      const radialVec = diff.sub(tangent.clone().multiplyScalar(projOnTan));
      const distWorld = radialVec.length() * handScale;
      if (distWorld > maxFingerDist) maxFingerDist = distWorld;
    }
  }
  
  const clearance = ringInnerRadiusWorld - maxFingerDist;
  console.log(`u=${u.toFixed(2)} Y=${center.y.toFixed(2)}: maxFingerRadius=${maxFingerDist.toFixed(4)} ringRadius=${ringInnerRadiusWorld.toFixed(4)} clearance=${clearance.toFixed(4)} (${(clearance/ringInnerRadiusWorld*100).toFixed(1)}%)`);
}
