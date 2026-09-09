const fs = require('fs');
const THREE = require('three');

// Let's inspect the primitives of Circle.006
const glbBuffer = fs.readFileSync('public/models/doji-diamond-ring.glb');
const jsonLength = glbBuffer.readUInt32LE(12);
const jsonChunk = glbBuffer.slice(20, 20 + jsonLength).toString('utf8');
const gltf = JSON.parse(jsonChunk);

const mesh2 = gltf.meshes[2]; // Circle.006
console.log('Mesh 2 name:', mesh2.name);
mesh2.primitives.forEach((p, pi) => {
  const posAcc = gltf.accessors[p.attributes.POSITION];
  console.log(`Primitive ${pi}: count ${posAcc.count}, min: ${posAcc.min}, max: ${posAcc.max}`);
});
