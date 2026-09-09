const fs = require('fs');

const glbBuffer = fs.readFileSync('public/models/doji-diamond-ring.glb');
const jsonLength = glbBuffer.readUInt32LE(12);
const jsonChunk = glbBuffer.slice(20, 20 + jsonLength).toString('utf8');
const gltf = JSON.parse(jsonChunk);

console.log('--- NODES HIERARCHY ---');
gltf.nodes.forEach((node, i) => {
  console.log(`Node ${i}: "${node.name}"`, {
    mesh: node.mesh !== undefined ? gltf.meshes[node.mesh].name : undefined,
    children: node.children,
    translation: node.translation,
    rotation: node.rotation,
    scale: node.scale,
  });
});

console.log('\n--- MESHES & PRIMITIVES ---');
gltf.meshes.forEach((mesh, mi) => {
  console.log(`Mesh ${mi}: "${mesh.name}", primitives count: ${mesh.primitives.length}`);
  mesh.primitives.forEach((p, pi) => {
    const matIndex = p.material;
    const mat = gltf.materials[matIndex];
    // Find POSITION accessor to get bounds
    const posAccessorIndex = p.attributes.POSITION;
    const posAccessor = gltf.accessors[posAccessorIndex];
    console.log(`  Prim ${pi}: mat "${mat ? mat.name : 'none'}", pos min:`, posAccessor.min, 'max:', posAccessor.max);
  });
});

console.log('\n--- SCENES ---');
console.log(JSON.stringify(gltf.scenes, null, 2));
