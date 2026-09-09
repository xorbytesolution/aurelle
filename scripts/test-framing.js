const THREE = require('three');

function testFraming(title, handBaseX, camX, lookX, camZ) {
  const quat = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.10, Math.PI - 0.15, -0.05, 'XYZ'));
  const scale = 0.23;
  const base = new THREE.Vector3(handBaseX, -2.85, -0.20);
  
  const fingers = {
    ring: new THREE.Vector3(-2.50, 18.25, 0.051),
    middle: new THREE.Vector3(-0.80, 19.5, 0.2),
    index: new THREE.Vector3(1.10, 18.5, 0.3),
    thumb: new THREE.Vector3(2.80, 13.0, -0.5),
    pinky: new THREE.Vector3(-4.10, 16.5, -0.2),
  };

  const cam = new THREE.PerspectiveCamera(28, 16/9, 0.1, 100);
  cam.position.set(camX, 1.4, camZ);
  cam.lookAt(lookX, 1.4, 0);
  cam.updateMatrixWorld();
  cam.updateProjectionMatrix();

  console.log('--- ' + title + ' ---');
  for (const [name, pt] of Object.entries(fingers)) {
    const worldPt = pt.clone().multiplyScalar(scale).applyQuaternion(quat).add(base);
    const ndc = worldPt.clone().project(cam);
    const screenPercent = ((ndc.x + 1) / 2 * 100).toFixed(1);
    console.log(`  ${name.padEnd(7)}: worldX=${worldPt.x.toFixed(2)}, ndc.x=${ndc.x.toFixed(2)} (${screenPercent}% from left)`);
  }
}

// Current framing:
testFraming('CURRENT (Collision)', -0.15, 0.46, 0.21, 4.2);

// Proposed A: Camera pan to left
testFraming('PROPOSED A (Cam pan)', -0.15, -0.45, -0.30, 5.0);

// Proposed B: Camera at wearWorldPos.x - 0.45, lookAt wearWorldPos.x - 0.25, Z=5.2
testFraming('PROPOSED B', -0.15, -0.25, -0.10, 5.2);

// Proposed C: Camera at wearWorldPos.x - 0.55, lookAt wearWorldPos.x - 0.35, Z=5.0
testFraming('PROPOSED C', -0.15, -0.35, -0.20, 5.0);
