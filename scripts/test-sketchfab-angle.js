const THREE = require('three');

// Let's test the Euler rotation angles for the beauty horizontal product shot.
// In raw GLB:
// - Circular band is in X-Z plane. (Diameter along X and Z is ~0.192, thickness along Y is ~0.028).
// - Solitaire diamond is at X=0, Y=0, Z=+0.1028.
// - Pavé bands run along X from -0.093 to +0.093 at Z > 0.
// - Bottom of the band is at Z = -0.096.

// In WebGL, camera is at [0, 0, Z] looking at [0, 0, 0] along -Z.
// If we look at raw model:
// Camera at [0, 0, 10]: looking at Z=+0.1028 (the diamond is right in front of camera, but band goes away along Z!).
// If we tilt the ring around X by +70 degrees (Math.PI * 0.38):
// The diamond at Z=+0.1 tilts forward and slightly down or up!
// Let's calculate the projected position of:
// 1. Solitaire diamond: (0, 0, 0.1028)
// 2. Left pavé tip: (-0.093, 0, 0.01)
// 3. Right pavé tip: (+0.093, 0, 0.01)
// 4. Bottom of band: (0, 0, -0.096)

function testRotation(rx, ry, rz) {
  const euler = new THREE.Euler(rx, ry, rz, 'XYZ');
  const d = new THREE.Vector3(0, 0, 0.1028).applyEuler(euler);
  const left = new THREE.Vector3(-0.093, 0, 0.01).applyEuler(euler);
  const right = new THREE.Vector3(0.093, 0, 0.01).applyEuler(euler);
  const back = new THREE.Vector3(0, 0, -0.096).applyEuler(euler);

  console.log(`Angles [${rx.toFixed(2)}, ${ry.toFixed(2)}, ${rz.toFixed(2)}]:`);
  console.log('  Diamond Y:', d.y.toFixed(4), 'Z:', d.z.toFixed(4));
  console.log('  Width X span:', (right.x - left.x).toFixed(4));
  console.log('  Height Y span:', (Math.max(d.y, back.y) - Math.min(d.y, back.y)).toFixed(4));
  console.log('  Aspect ratio (Width/Height):', ((right.x - left.x) / (Math.max(d.y, back.y) - Math.min(d.y, back.y))).toFixed(2));
}

console.log('--- Test 1: Flat horizontal with diamond at top/front ---');
// If rotated around X by -1.1 rad (~ -63 deg):
testRotation(-Math.PI * 0.35, 0, 0);

console.log('--- Test 2: Tilted front beauty angle (like Sketchfab) ---');
// Tilted so diamond is at top center, band curves below it horizontally
testRotation(-Math.PI * 0.42, 0, 0);

console.log('--- Test 3: Subtle luxury 3/4 beauty angle ---');
testRotation(-Math.PI * 0.38, 0.15, -0.05);
