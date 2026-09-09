const fs = require('fs');
const buf = fs.readFileSync('public/models/doji-diamond-ring.glb');
const jsonLen = buf.readUInt32LE(12);
const gltf = JSON.parse(buf.slice(20, 20 + jsonLen).toString('utf8'));

console.log('Nodes in doji-diamond-ring.glb:');
gltf.nodes.forEach((n, idx) => {
  console.log(`Node ${idx}: "${n.name}", mesh=${n.mesh !== undefined ? gltf.meshes[n.mesh].name : 'none'}, translation=${JSON.stringify(n.translation)}, scale=${JSON.stringify(n.scale)}, rotation=${JSON.stringify(n.rotation)}`);
});
