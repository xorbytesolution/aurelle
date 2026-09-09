const THREE = require('three');

// Simulate the model dimensions
const min = new THREE.Vector3(-0.09605, -0.01407, -0.09605);
const max = new THREE.Vector3(0.09605, 0.01407, 0.10283);
const center = new THREE.Vector3().addVectors(min, max).multiplyScalar(0.5);
const size = new THREE.Vector3().subVectors(max, min);

console.log('Model original center:', center);
console.log('Model original size:', size);

// Test camera view:
// Camera at [0, 0, 11], fov = 34 degrees
const cameraDist = 11;
const fov = 34;
const visibleHeight = 2 * cameraDist * Math.tan(THREE.MathUtils.degToRad(fov / 2));
console.log('Visible canvas height at distance 11:', visibleHeight.toFixed(2), 'units');

// For ring to occupy 60% of visible height:
const targetVisualSize = visibleHeight * 0.62;
const scale = targetVisualSize / size.z;
console.log('Target visual size (62%):', targetVisualSize.toFixed(2), 'units');
console.log('Calculated ideal scale:', scale.toFixed(1));

// Let's check when scale is 21:
const ringRenderedHeight = size.z * 21;
console.log('At scale 21, ring height:', ringRenderedHeight.toFixed(2), 'units (' + ((ringRenderedHeight / visibleHeight) * 100).toFixed(1) + '% of canvas)');
