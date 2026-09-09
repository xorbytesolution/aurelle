const THREE = require('three');

const pts = [
  new THREE.Vector3( 0.70, 28.00,  9.50), // u=0.00
  new THREE.Vector3( 0.45, 25.50,  6.80), // u~0.10
  new THREE.Vector3( 0.28, 23.50,  4.80), // u~0.20
  new THREE.Vector3( 0.165, 22.46, 3.70), // u~0.30 - exact fingertip entry
  new THREE.Vector3( 0.02, 21.46,  2.67), // u~0.40 - distal phalanx
  new THREE.Vector3(-0.074, 20.96, 1.89), // u~0.50 - DIP joint
  new THREE.Vector3(-0.16, 20.20,  0.65), // u~0.60 - PIP knuckle
  new THREE.Vector3(-0.14, 19.60,  0.22), // u~0.70 - proximal phalanx
  new THREE.Vector3(-0.09, 18.80, -0.05), // u~0.85 - lower shaft
  new THREE.Vector3(-0.08, 18.25, -0.25), // u=1.00 - resting base
];

const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal', 0.5);

console.log('u=0.30 (fingertip hover):', curve.getPoint(0.30));
console.log('u=0.60 (middle knuckle):', curve.getPoint(0.60));
console.log('u=1.00 (resting base):', curve.getPoint(1.00));
