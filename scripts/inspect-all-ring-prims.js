const fs = require('fs');
const glbBuffer = fs.readFileSync('public/models/doji-diamond-ring.glb');
const jsonLength = glbBuffer.readUInt32LE(12);
const jsonChunk = glbBuffer.slice(20, 20 + jsonLength).toString('utf8');
const gltf = JSON.parse(jsonChunk);

console.log('Nodes in scene 0:');
const rootNodes = gltf.scenes[0].nodes;
console.log('Root nodes:', rootNodes);

rootNodes.forEach(ni => {
  const node = gltf.nodes[ni];
  const mesh = node.mesh !== undefined ? gltf.meshes[node.mesh] : null;
  console.log('Node ' + ni + ' ("' + node.name + '"): mesh=' + (mesh ? mesh.name : 'none') + ' translation=' + JSON.stringify(node.translation) + ' scale=' + JSON.stringify(node.scale));
  if (mesh) {
    mesh.primitives.forEach((p, pi) => {
      const mat = gltf.materials ? gltf.materials[p.material] : null;
      console.log('    prim ' + pi + ': mat=' + (mat ? mat.name : 'none') + ' accessor=' + p.attributes.POSITION);
    });
  }
});
