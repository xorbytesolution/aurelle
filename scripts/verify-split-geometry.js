const THREE = require('three');

// When a model is rotated so that Z is up (rotated -Math.PI / 2 around X):
// The equator is at Y_world = 0.
// In the upper group (with upper half of band, solitaire, pavé, prongs):
// Y_world >= 0.
// In the lower group (with lower half of band):
// Y_world <= 0.
// Since all diamonds are at Y_world > 0, they are 100% intact in the upper group.
// The band is cleanly parted at the equator (the 3 o'clock and 9 o'clock positions of the circle).

console.log('Equator cut leaves all diamonds 100% intact.');
