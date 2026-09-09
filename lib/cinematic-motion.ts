/**
 * AURELLE — CINEMATIC MOTION INTELLIGENCE ENGINE
 * 
 * Centralized physical mass constants, frame-rate independent damped interpolation,
 * and temporal layering utilities for the luxury cinematic experience.
 * 
 * LAW 01: Scroll is target state; actual state damps with physical mass.
 * LAW 02: Different elements possess different physical mass:
 *   - LIGHT: Sparkles, reflections, micro-indicators (fast, responsive)
 *   - MEDIUM: Ring, hand, UI panels, text (smooth, controlled)
 *   - HEAVY: Camera, orbit carousel, atmospheric lighting (slow momentum, smooth deceleration)
 *   - SUPER HEAVY: Environmental ambient transitions
 */

import * as THREE from 'three'

export const CINEMATIC_MASS = {
  light: 12.0,      // Fast, responsive, delicate micro-details
  medium: 7.2,      // Smooth, controlled ring/hand movement & editorial text
  heavy: 4.2,       // Slow acceleration, physical crane camera, orbital sculpture
  superHeavy: 2.8,  // Slow atmospheric lighting transitions
} as const

/**
 * Damp a scalar value frame-rate independently using THREE.MathUtils.damp
 */
export function dampScalar(
  current: number,
  target: number,
  lambda: number,
  delta: number
): number {
  return THREE.MathUtils.damp(current, target, lambda, delta)
}

/**
 * Damp a THREE.Vector3 toward a target frame-rate independently
 */
export function dampVector3(
  current: THREE.Vector3,
  target: THREE.Vector3,
  lambda: number,
  delta: number
): void {
  current.x = THREE.MathUtils.damp(current.x, target.x, lambda, delta)
  current.y = THREE.MathUtils.damp(current.y, target.y, lambda, delta)
  current.z = THREE.MathUtils.damp(current.z, target.z, lambda, delta)
}

/**
 * Damp a THREE.Color toward a target color frame-rate independently
 */
export function dampColor(
  current: THREE.Color,
  target: THREE.Color,
  lambda: number,
  delta: number
): void {
  current.r = THREE.MathUtils.damp(current.r, target.r, lambda, delta)
  current.g = THREE.MathUtils.damp(current.g, target.g, lambda, delta)
  current.b = THREE.MathUtils.damp(current.b, target.b, lambda, delta)
}

/**
 * Smoothstep helper
 */
export function smoothstep(min: number, max: number, value: number): number {
  const x = Math.max(0, Math.min(1, (value - min) / (max - min)))
  return x * x * (3 - 2 * x)
}

/**
 * Organic Knuckle Resistance Easing for the Sacred Slide:
 * Smooth approach -> subtle knuckle resistance -> continuous slide -> soft settle
 */
export function sacredSlidePhysics(t: number): number {
  const clampedT = Math.max(0, Math.min(1, t))
  
  if (clampedT <= 0.40) {
    // Approach to knuckle: smooth gentle acceleration
    const k = clampedT / 0.40
    const smoothK = k * k * (3 - 2 * k)
    return smoothK * 0.38
  } else if (clampedT <= 0.65) {
    // Clearing the knuckle: subtle tactile resistance / deceleration feel
    const k = (clampedT - 0.40) / 0.25
    // Slower curve through knuckle
    const resistanceCurve = Math.pow(k, 1.35)
    return 0.38 + resistanceCurve * 0.32
  } else if (clampedT <= 0.88) {
    // Gliding down proximal phalanx to resting base
    const k = (clampedT - 0.65) / 0.23
    const smoothK = k * k * (3 - 2 * k)
    return 0.70 + smoothK * 0.336 // subtle 3.6% overshoot
  } else {
    // Settling into resting home: gentle organic relaxation (zero rubber bounce)
    const k = (clampedT - 0.88) / 0.12
    const settle = Math.cos(k * Math.PI * 0.5) // 1 down to 0
    return 1.0 + 0.036 * settle
  }
}
