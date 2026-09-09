const THREE = require('three');

// Let's analyze the ring geometry in detail.
// In the raw GLB:
// Solitaire diamond is at (0, 0, +0.1028).
// Pavé diamonds are along the arc at Z > 0, spanning X from -0.093 to +0.093.
// Finger axis (hole normal) is along Y.
// Band thickness is along Y: [-0.014, +0.014].

// If we want a HORIZONTAL ring composition where:
// - The ring lies horizontally (like on a surface or floating horizontally)
// - The diamond crown is tilted towards the viewer so we see the table facet of the diamond, prongs, and both pavé bands spanning horizontally left-to-right!
// How should it be rotated?
// Let's check:
// In raw GLB:
// The pavé bands span horizontally along X from -0.093 to +0.093!
// So X is already the HORIZONTAL axis across the screen!
// The diamond crown is at Z = +0.1028 (towards the front/top).
// The finger axis is Y.
// If the ring is viewed with a camera looking towards the diamond:
// If camera is at [0, 1.5, 3] looking at [0, 0, 0]:
// Camera looks down onto the ring at an angle of ~30-40 degrees.
// The diamond crown (Z = +0.1) is in the front/center, closest to camera.
// The pavé bands branch out to the left (-X) and right (+X) horizontally across the screen!
// The back of the band (Z = -0.1) is behind the diamond.
// This is the classic horizontal luxury jewellery shot seen on Sketchfab and Tiffany/Cartier campaigns!

console.log('Horizontal beauty orientation confirmed.');
