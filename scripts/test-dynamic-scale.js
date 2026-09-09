const THREE = require('three');

function getDynamicRingScaleMonotonic(p, isMobile, introProgress = 1.0) {
  const heroScale = isMobile ? 2.10 : 2.75;
  const wearScale = isMobile ? 1.30 : 1.62;

  let currentScale = heroScale;

  if (p <= 0.32) {
    // 0.00 - 0.32: HERO & ANATOMY — BIG, GRAND HERO RING
    currentScale = heroScale;
  } else if (p <= 0.66) {
    // 0.32 - 0.66: Smooth, continuous, monotonic transition from Hero to Finger Wear scale
    const t = (p - 0.32) / 0.34;
    const smoothT = t * t * (3 - 2 * t);
    currentScale = THREE.MathUtils.lerp(heroScale, wearScale, smoothT);
  } else if (p <= 0.82) {
    // 0.66 - 0.82: ALIGN, SLIDE, SETTLE & 360° ORBIT — EXACT SNUG FIT ON FINGER (CHHOTI KARKE SET)
    currentScale = wearScale;
  } else if (p <= 0.92) {
    // 0.82 - 0.92: SACRED RELEASE & FLIGHT — expands back into space as hero jewel
    const t = (p - 0.82) / 0.10;
    const smoothT = t * t * (3 - 2 * t);
    currentScale = THREE.MathUtils.lerp(wearScale, heroScale * 0.90, smoothT);
  } else {
    // 0.92 - 1.00: THRESHOLD & DESCENT INTO CAROUSEL
    currentScale = heroScale * 0.90;
  }

  const introScale = p <= 0.12 ? THREE.MathUtils.lerp(0.82, 1.0, introProgress) : 1.0;
  return currentScale * introScale;
}

console.log('--- Monotonic Dynamic Scale Curve ---');
for (let p = 0; p <= 1.001; p += 0.05) {
  console.log(`p=${p.toFixed(2)}: scale = ${getDynamicRingScaleMonotonic(p, false).toFixed(3)}`);
}
