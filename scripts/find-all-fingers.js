const fs = require('fs');

const buf = fs.readFileSync('public/models/Jewelry+Hand+Holder.glb');
const jsonLen = buf.readUInt32LE(12);
const jsonBuf = buf.slice(20, 20 + jsonLen);
const gltf = JSON.parse(jsonBuf.toString('utf8'));

const binStart = 20 + jsonLen + 8;
const posView = gltf.bufferViews[0];
const posCount = gltf.accessors[0].count;

const verts = [];
for (let i = 0; i < posCount; i++) {
  const off = binStart + posView.byteOffset + i * 12;
  const rawX = buf.readFloatLE(off);
  const rawY = buf.readFloatLE(off + 4);
  const rawZ = buf.readFloatLE(off + 8);
  verts.push({
    x: rawX,
    y: -rawZ,
    z: rawY
  });
}

// Check slices at different Y: 15, 17, 19, 21, 23, 25, 27
for (const testY of [16, 18, 20, 22, 24, 26]) {
  const slice = verts.filter(v => Math.abs(v.y - testY) < 0.15);
  const sortedX = [...slice].sort((a, b) => a.x - b.x);
  let clusters = [];
  let cur = [];
  for (const v of sortedX) {
    if (cur.length === 0) cur.push(v);
    else if (v.x - cur[cur.length - 1].x > 0.4) {
      clusters.push(cur);
      cur = [v];
    } else cur.push(v);
  }
  if (cur.length > 0) clusters.push(cur);
  
  const desc = clusters.map(c => {
    const minX = Math.min(...c.map(v => v.x));
    const maxX = Math.max(...c.map(v => v.x));
    return `[${minX.toFixed(1)}..${maxX.toFixed(1)}]`;
  }).join(', ');
  console.log(`Y=${testY}: ${clusters.length} fingers -> ${desc}`);
}
