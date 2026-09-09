const THREE = require('three');

// When resting horizontally with diamond facing forward:
// Raw model:
// - Circular band in X-Z plane.
// - Solitaire diamond at (0, 0, +0.1028).
// - Pavé diamonds along X from -0.093 to +0.093 at Z > 0.
// - Band thickness is along Y: [-0.014, +0.014].

function testHorizontalTilt(rx, ry, rz) {
  const euler = new THREE.Euler(rx, ry, rz, 'XYZ');
  const diamond = new THREE.Vector3(0, 0, 0.1028).applyEuler(euler);
  const leftPav = new THREE.Vector3(-0.093, 0, 0.05).applyEuler(euler);
  const rightPav = new THREE.Vector3(0.093, 0, 0.05).applyEuler(euler);
  const back = new THREE.Vector3(0, 0, -0.096).applyEuler(euler);

  const minX = Math.min(diamond.x, leftPav.x, rightPav.x, back.x);
  const maxX = Math.max(diamond.x, leftPav.x, rightPav.x, back.x);
  const minY = Math.min(diamond.y, leftPav.y, rightPav.y, back.y);
  const maxY = Math.max(diamond.y, leftPav.y, rightPav.y, back.y);

  console.log(`Angles [${rx.toFixed(2)}, ${ry.toFixed(2)}, ${rz.toFixed(2)}]:`);
  console.log(`  Screen Width (X): ${(maxX - minX).toFixed(4)}`);
  console.log(`  Screen Height (Y): ${(maxY - minY).toFixed(4)}`);
  console.log(`  Width / Height Ratio: ${((maxX - minX) / (maxY - minY)).toFixed(2)} (Horizontal oval!)`);
  console.log(`  Diamond Z (depth towards camera): ${diamond.z.toFixed(4)}, Back Z: ${back.z.toFixed(4)}`);
}

console.log('--- Test A: Subtle tilt (0.28 rad / 16 deg) ---');
testHorizontalTilt(0.28, 0, 0);

console.log('--- Test B: Medium luxury beauty tilt (0.42 rad / 24 deg) ---');
testHorizontalTilt(0.42, 0, 0);

console.log('--- Test C: 3/4 horizontal beauty tilt (0.38 rad X, 0.25 rad Y) ---');
testHorizontalTilt(0.38, 0.25, 0);
