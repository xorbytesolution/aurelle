const THREE = require('three');

// Let's test setFromUnitVectors with upVec
// localT is tangent along finger: ~ (0.05, 0.99, 0.12)
const localT = new THREE.Vector3(0.05, 0.99, 0.12).normalize();
// In world space (with handRotY = Math.PI):
const rotY = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI);
const worldTan = localT.clone().applyQuaternion(rotY).normalize();
const upVec = worldTan.clone().negate();

const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), upVec);

// Where does local +Z (diamond vector) point?
const diamondLocal = new THREE.Vector3(0, 0, 1);
const diamondWorld = diamondLocal.clone().applyQuaternion(q);

console.log('Diamond in world space:', diamondWorld);
console.log('Finger dorsal direction in world space (should be ~ (0, 0, 1)):');
const dorsalLocal = new THREE.Vector3(0, 0, 1);
const dorsalWorld = dorsalLocal.clone().applyQuaternion(rotY);
console.log('Dorsal in world space:', dorsalWorld);

// Angle between diamond and true dorsal:
console.log('Angle between diamond and dorsal:', THREE.MathUtils.radToDeg(diamondWorld.angleTo(dorsalWorld)).toFixed(1), 'degrees');
