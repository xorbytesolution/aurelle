const THREE = require('three');

console.log('Testing opening sequence math and planes...');
const planeUp = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const planeDown = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0);

const testUp = new THREE.Vector3(0, 0.5, 0);
const testDown = new THREE.Vector3(0, -0.5, 0);

console.log('planeUp distance to testUp:', planeUp.distanceToPoint(testUp));
console.log('planeDown distance to testDown:', planeDown.distanceToPoint(testDown));
