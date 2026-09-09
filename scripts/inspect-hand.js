const fs = require('fs');

const buf = fs.readFileSync('public/models/Jewelry+Hand+Holder.glb');
// Read GLB header: magic(4), version(4), length(4)
const totalLen = buf.readUInt32LE(8);
// Chunk 0: jsonLength(4), chunkType(4)
const jsonLen = buf.readUInt32LE(12);
const jsonBuf = buf.slice(20, 20 + jsonLen);
const gltf = JSON.parse(jsonBuf.toString('utf8'));

console.log('GLTF JSON:');
console.log('Meshes:', JSON.stringify(gltf.meshes, null, 2));
console.log('Accessors count:', gltf.accessors.length);
gltf.accessors.forEach((acc, i) => {
  console.log(`Accessor ${i}: count=${acc.count} type=${acc.type} componentType=${acc.componentType} min=${JSON.stringify(acc.min)} max=${JSON.stringify(acc.max)}`);
});
