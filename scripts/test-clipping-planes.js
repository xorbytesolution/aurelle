const THREE = require('three');

const upperPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const lowerPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0);

const testPointAbove = new THREE.Vector3(0, 1, 0);
const testPointBelow = new THREE.Vector3(0, -1, 0);

console.log('Upper plane distance to point above (should be > 0):', upperPlane.distanceToPoint(testPointAbove));
console.log('Upper plane distance to point below (should be < 0):', upperPlane.distanceToPoint(testPointBelow));

console.log('Lower plane distance to point above (should be < 0):', lowerPlane.distanceToPoint(testPointAbove));
console.log('Lower plane distance to point below (should be > 0):', lowerPlane.distanceToPoint(testPointBelow));
