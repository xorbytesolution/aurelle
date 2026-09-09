const fs = require('fs');

const buf = fs.readFileSync('public/models/doji-diamond-ring.glb');
const jsonLen = buf.readUInt32LE(12);
const jsonBuf = buf.slice(20, 20 + jsonLen);
const gltf = JSON.parse(jsonBuf.toString('utf8'));

console.log('Meshes in doji-diamond-ring.glb:');
gltf.meshes.forEach((m, idx) => {
  console.log(`Mesh ${idx}: ${m.name}`);
  m.primitives.forEach((p, pidx) => {
    console.log(`  prim ${pidx} material: ${gltf.materials ? gltf.materials[p.material]?.name : 'none'}`);
  });
});

console.log('\nNodes:');
gltf.nodes.forEach((n, idx) => {
  console.log(`Node ${idx}: ${n.name} (mesh=${n.mesh}) translation=${JSON.stringify(n.translation)} rotation=${JSON.stringify(n.rotation)}`);
});
