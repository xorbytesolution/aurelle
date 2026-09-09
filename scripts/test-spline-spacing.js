const THREE = require('three');

const pts = [
  [-0.08, 18.25, -0.25], // u=1.0: base of ring finger
  [-0.09, 18.80, -0.05],
  [-0.14, 19.60,  0.22],
  [-0.16, 20.20,  0.65],
  [-0.074, 20.96, 1.89],
  [ 0.02, 21.46,  2.67],
  [ 0.165, 22.46, 3.70], // fingertip
  [ 0.28, 23.50,  4.80],
  [ 0.45, 25.50,  6.80],
  [ 0.70, 28.00,  9.50], // u=0.0: hover approach
].reverse().map(([x, y, z]) => new THREE.Vector3(x, y, z));

const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal', 0.5);

console.log('Total arc length:', curve.getLength().toFixed(3));
for (let i = 0; i <= 10; i++) {
  const u = i / 10;
  const p = curve.getPoint(u);
  const t = curve.getTangent(u);
  console.log(`u=${u.toFixed(2)}: Y=${p.y.toFixed(2)}, Z=${p.z.toFixed(2)}, X=${p.x.toFixed(2)}, Tan=(${t.x.toFixed(2)}, ${t.y.toFixed(2)}, ${t.z.toFixed(2)})`);
}
