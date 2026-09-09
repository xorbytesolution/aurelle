const THREE = require('three');

// Ring finger spline points (4th digit) from approach altitude down to resting base
const pts = [
  new THREE.Vector3( 0.70, 28.00,  9.50), // high approach hover
  new THREE.Vector3( 0.45, 25.50,  6.80), // approach descent
  new THREE.Vector3( 0.28, 23.50,  4.80), // entering coaxial ring axis above tip
  new THREE.Vector3( 0.165, 22.46, 3.70), // finger tip
  new THREE.Vector3( 0.02, 21.46,  2.67), // upper phalanx
  new THREE.Vector3(-0.074, 20.96, 1.89), // distal interphalangeal joint
  new THREE.Vector3(-0.16, 20.20,  0.65), // middle phalanx
  new THREE.Vector3(-0.14, 19.60,  0.22), // proximal knuckle
  new THREE.Vector3(-0.09, 18.80, -0.05), // proximal phalanx
  new THREE.Vector3(-0.08, 18.25, -0.25), // ring seating base position
];

const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal', 0.5);

console.log('--- Ring Finger Spline Verification ---');
for (let u = 0; u <= 1.001; u += 0.1) {
  const p = curve.getPoint(u);
  const t = curve.getTangent(u);
  console.log(`u=${u.toFixed(2)} pos=(${p.x.toFixed(3)}, ${p.y.toFixed(3)}, ${p.z.toFixed(3)}) tan=(${t.x.toFixed(3)}, ${t.y.toFixed(3)}, ${t.z.toFixed(3)})`);
}
