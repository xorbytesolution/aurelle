const THREE = require('three');

// Test inverted hand math
const handScale = 0.13;
// When standing:
// wrist base was at Y ~ -12.58 (local), which is -12.58 * 0.13 = -1.635 world.
// Fingertips reached up to Y ~ +23 (local), which is +23 * 0.13 = +2.99 world from wrist.
// If inverted (rotated 180 deg around Z):
// Fingertips point downward.
// If wrist base is placed at top of screen:
// e.g. handBaseY = +1.80 world.
// Fingertip of ring finger (local Y ~ 22.5):
// Inverted local Y is -22.5 -> world Y = 1.80 - 22.5 * 0.13 = 1.80 - 2.925 = -1.125 world.
// Center of ring finger wear position (local Y ~ 18.25):
// Inverted world Y = 1.80 - 18.25 * 0.13 = 1.80 - 2.37 = -0.57 world.

console.log('Inverted hand geometry:');
console.log('Hand Base Y (wrist at top): +1.80');
console.log('Wear position Y: -0.57');
console.log('Fingertip entry Y: -1.125');

// Let's test Euler rotation for inverted dorsal view:
// We want:
// 1. Fingers point DOWN (-Y)
// 2. Knuckles / dorsal side still face CAMERA (+Z)
// 3. Palm faces AWAY (-Z) at 0 deg, then turns to face camera at 180 deg.

const eulerUpright = new THREE.Euler(0.10, -0.15, -0.05, 'XYZ');
const qUpright = new THREE.Quaternion().setFromEuler(eulerUpright);

// If we rotate 180 deg around Z:
const qRotZ180 = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI);
const qInvertedZ = qUpright.clone().premultiply(qRotZ180);

const dorsalInverted = new THREE.Vector3(0, 0, 1).applyQuaternion(qInvertedZ);
const fingerDirInverted = new THREE.Vector3(0, 1, 0).applyQuaternion(qInvertedZ);

console.log('Dorsal normal facing camera (+Z):', dorsalInverted.z.toFixed(3));
console.log('Finger pointing down (-Y):', fingerDirInverted.y.toFixed(3));
console.log('Lateral X:', fingerDirInverted.x.toFixed(3));
