const fs = require('fs');

const glbBuffer = fs.readFileSync('public/models/doji-diamond-ring.glb');
// Read glTF JSON chunk
const jsonLength = glbBuffer.readUInt32LE(12);
const jsonChunk = glbBuffer.slice(20, 20 + jsonLength).toString('utf8');
const gltf = JSON.parse(jsonChunk);

console.log('Meshes and materials:');
gltf.meshes.forEach((mesh, mi) => {
  console.log(`Mesh ${mi}: ${mesh.name}`);
  mesh.primitives.forEach((p, pi) => {
    const matIndex = p.material;
    const mat = gltf.materials[matIndex];
    console.log(`  Primitive ${pi}: material index ${matIndex}, name: "${mat ? mat.name : 'none'}", pbrMetallicRoughness:`, mat ? mat.pbrMetallicRoughness : null);
  });
});
