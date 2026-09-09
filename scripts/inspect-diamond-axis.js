const fs = require('fs');
const THREE = require('three');

function parseGLB(path) {
  const buf = fs.readFileSync(path);
  const jsonLen = buf.readUInt32LE(12);
  const gltf = JSON.parse(buf.slice(20, 20 + jsonLen).toString('utf8'));
  const binOffset = 20 + jsonLen + 8;
  const binBuf = buf.slice(binOffset);
  return { gltf, binBuf };
}

const { gltf, binBuf } = parseGLB('public/models/doji-diamond-ring.glb');

console.log('Inspecting meshes in doji-diamond-ring.glb:');
gltf.meshes.forEach(m => {
  m.primitives.forEach((p, idx) => {
    const acc = gltf.accessors[p.attributes.POSITION];
    const mat = gltf.materials ? gltf.materials[p.material]?.name : 'no-mat';
    console.log(`Mesh "${m.name}" prim ${idx} (${mat}): min=${JSON.stringify(acc.min)}, max=${JSON.stringify(acc.max)}`);
  });
});

// Specifically check "dmesh" (the solitaire diamond)
const dmesh = gltf.meshes.find(m => m.name.toLowerCase().includes('dmesh'));
if (dmesh) {
  const acc = gltf.accessors[dmesh.primitives[0].attributes.POSITION];
  const center = [
    (acc.min[0] + acc.max[0]) / 2,
    (acc.min[1] + acc.max[1]) / 2,
    (acc.min[2] + acc.max[2]) / 2,
  ];
  console.log('\nDiamond center in model space:', center);
}
