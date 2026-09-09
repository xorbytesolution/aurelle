const THREE = require('three');

const pts = [
  [-2.30, 27.50,  2.60],
  [-2.35, 25.50,  1.80],
  [-2.38, 23.80,  1.10],
  [-2.41, 22.17,  0.50],
  [-2.35, 21.30,  0.42],
  [-2.40, 20.25,  0.29],
  [-2.48, 19.25,  0.13],
  [-2.50, 18.25,  0.051],
].map(([x, y, z]) => new THREE.Vector3(x, y, z));

const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal', 0.5);

console.log('Spline samples:');
for (let u = 0; u <= 1.001; u += 0.2) {
  const p = curve.getPoint(u);
  const t = curve.getTangent(u);
  console.log('u=' + u.toFixed(2) + ' pos=(' + p.x.toFixed(3) + ', ' + p.y.toFixed(3) + ', ' + p.z.toFixed(3) + ') tan=(' + t.x.toFixed(3) + ', ' + t.y.toFixed(3) + ', ' + t.z.toFixed(3) + ')');
}
