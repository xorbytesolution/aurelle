const THREE = require('three');

// Let's build the exact rotation matrix for the ring on the finger:
// We want:
// 1. Ring local Y (hole) = upVec (pointing along -fingerTan)
// 2. Ring local +Z (center diamond) = dorsal normal (pointing towards back of hand)
// 3. Ring local +X = upVec.cross(dorsal)

const fingerTan = new THREE.Vector3(0.05, 0.99, 0.12).normalize();
const upVec = fingerTan.clone().negate();

// The dorsal vector on the ring finger:
// From our vertex inspection, the back of the finger is at +Z in local hand space!
// We project (0, 0, 1) to be perpendicular to upVec:
const rawDorsal = new THREE.Vector3(0, 0, 1);
const dorsal = rawDorsal.clone().projectOnPlane(upVec).normalize();

// Lateral vector:
const lateral = new THREE.Vector3().crossVectors(upVec, dorsal).normalize();

// Re-orthogonalize dorsal:
dorsal.crossVectors(lateral, upVec).normalize();

// Build 3x3 rotation matrix where columns are the basis vectors:
// Column 0 = local X = lateral
// Column 1 = local Y = upVec
// Column 2 = local Z = dorsal
const rotMatrix = new THREE.Matrix4().makeBasis(lateral, upVec, dorsal);
const ringQuat = new THREE.Quaternion().setFromRotationMatrix(rotMatrix);

// Verify:
const testHole = new THREE.Vector3(0, 1, 0).applyQuaternion(ringQuat);
const testDiamond = new THREE.Vector3(0, 0, 1).applyQuaternion(ringQuat);

console.log('testHole vs upVec angle:', THREE.MathUtils.radToDeg(testHole.angleTo(upVec)).toFixed(4), 'deg');
console.log('testDiamond vs dorsal angle:', THREE.MathUtils.radToDeg(testDiamond.angleTo(dorsal)).toFixed(4), 'deg');
console.log('testDiamond local hand coords:', testDiamond);
