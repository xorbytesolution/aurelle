'use client'

import React, { Suspense, useRef, useMemo, useState, useEffect } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useGLTF, Environment } from '@react-three/drei'
import * as THREE from 'three'
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js'
import gsap from 'gsap'
import { CINEMATIC_MASS, dampScalar, dampVector3, sacredSlidePhysics } from '@/lib/cinematic-motion'

export type RingMaterialType = 'platinum' | 'yellow-gold' | 'rose-gold'

export interface RingCanvasProps {
  progress: number // normalized master scroll progress [0, 1]
  materialType?: RingMaterialType
  onDragStateChange?: (isDragging: boolean) => void
  heroIntroReady?: boolean
}

const MODEL_RING = '/models/doji-diamond-ring.glb'
const MODEL_HAND = '/models/Jewelry+Hand+Holder.glb'

useGLTF.preload(MODEL_RING)
useGLTF.preload(MODEL_HAND)

/**
 * ============================================================================
 * ISOLATED HAND & FINGER CALIBRATION LAYER
 * ============================================================================
 * Centralized coordinates, spline waypoints, and scales for the 3D hand and ring.
 * Hand and finger geometry measured directly from model vertex data.
 */
export const HAND_CALIBRATION = {
  // Global hand model scale factor
  // 0.115: full hand (wrist-to-fingertips) fits elegantly in viewport without cropping
  SCALE: 0.115,
  SCALE_MOBILE: 0.095,

  // 3D centerline path along the RING FINGER (4th digit) from approach altitude down to resting base
  // These are LOCAL hand-space coords measured directly from the Ring Finger in clonedHandScene
  FINGER_SPLINE_POINTS: [
    [ 0.70,  28.00,  9.50],  // High hover station directly above ring finger
    [ 0.45,  25.50,  6.80],  // Smooth approach descent vector
    [ 0.28,  23.50,  4.80],  // Entering coaxial ring axis above tip
    [ 0.165, 22.46,  3.70],  // Ring finger tip entry (measured tip vertex)
    [ 0.02,  21.46,  2.67],  // Distal phalanx
    [-0.074, 20.96,  1.89],  // Distal interphalangeal joint
    [-0.16,  20.20,  0.65],  // Middle phalanx knuckle
    [-0.14,  19.60,  0.22],  // Proximal shaft
    [-0.09,  18.80, -0.05],  // Lower shaft
    [-0.08,  18.25, -0.25],  // Snug resting wear position at ring finger base
  ] as const,

  // Grand Hero inspection scale: ring is large and prominent during Hero and Anatomy
  HERO_RING_SCALE: 2.75,
  HERO_RING_SCALE_MOBILE: 2.15,

  // Physically calibrated scale for the ring on the Ring Finger:
  // Ring inner bore radius = 0.07996 in model space.
  // Hand SCALE = 0.115 → proportional ring scale = 1.62 × (0.115/0.13) ≈ 1.43
  // At scale 1.43: bore radius = 0.1143 world units, finger radius ≈ 0.0975 → snug photorealistic fit
  RING_PHYSICAL_SCALE: 1.43,
  RING_PHYSICAL_SCALE_MOBILE: 1.20,

  // Bounded tactile inspection limits at Climax (in radians)
  BOUNDED_YAW_MAX: Math.PI / 4,    // ±45°
  BOUNDED_PITCH_MAX: Math.PI / 12, // ±15°

  // ============================================================================
  // CINEMATIC CAMERA & HAND FRAMING
  // ============================================================================
  // Hand at scale 0.115: height ~2.9 units. Center Y: 0.0, wrist Y: -1.45, fingertips Y: +1.45.
  // Camera at Z=8.0 gives a tighter, more intimate editorial frame.
  // HAND_BASE_X=0.18: hand slightly left-of-center, leaving space for editorial text.
  HAND_FRAME_LOOK_CENTER: [0.18, 0.12, 0] as const,
  HAND_CAM_Z_FULL: 8.0,           // Full-hand view (was 9.2) — tighter, more cinematic
  HAND_CAM_Z_RING: 5.6,           // Ring-on-finger close-up (was 6.5) — dramatic zoom
  HAND_BASE_X_DESKTOP: 0.18,      // Center-left (was 0.35) — editorial balance
  HAND_BASE_X_MOBILE: 0.0,
}

/**
 * Slide trajectory easing function with genuine continuous physics:
 * Smooth acceleration -> deceleration -> slight overshoot -> soft spring settle.
 */
function slideWithSettle(t: number): number {
  if (t <= 0.82) {
    const k = t / 0.82
    const smoothK = k * k * (3 - 2 * k)
    return smoothK * 1.036 // 3.6% subtle overshoot past destination
  } else {
    const k = (t - 0.82) / 0.18
    const spring = Math.cos(k * Math.PI * 0.5) // 1 down to 0
    return 1.0 + 0.036 * spring // soft spring settle back to snug 1.0
  }
}


function CinematicScene({
  progress,
  materialType = 'platinum',
  userRotRef,
  heroIntroReady = false,
}: {
  progress: number
  materialType?: RingMaterialType
  userRotRef: React.MutableRefObject<{ x: number; y: number }>
  heroIntroReady?: boolean
}) {
  const ringGltf = useGLTF(MODEL_RING)
  const handGltf = useGLTF(MODEL_HAND)

  const clonedRingScene = useMemo(() => {
    const cloned = SkeletonUtils.clone(ringGltf.scene)
    cloned.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh
        if (mesh.material) {
          mesh.material = Array.isArray(mesh.material)
            ? mesh.material.map((m) => m.clone())
            : mesh.material.clone()
        }
      }
    })
    return cloned
  }, [ringGltf.scene])
  const clonedHandScene = useMemo(() => SkeletonUtils.clone(handGltf.scene), [handGltf.scene])

  const ringRootRef = useRef<THREE.Group>(null)
  const ringMotionGroupRef = useRef<THREE.Group>(null)
  const ringIdleGroupRef = useRef<THREE.Group>(null)

  const handRootRef = useRef<THREE.Group>(null)
  const handMotionGroupRef = useRef<THREE.Group>(null)
  const handIdleGroupRef = useRef<THREE.Group>(null)

  const wearAnchorRef = useRef<THREE.Group>(null)
  const approachAnchorRef = useRef<THREE.Group>(null)

  const keyLightRef = useRef<THREE.DirectionalLight>(null)
  const spotLightRef = useRef<THREE.SpotLight>(null)
  const rimLightRef = useRef<THREE.SpotLight>(null)

  // Camera starts at Z = 1.72 framing the ring heroically in the viewport center
  const currentCamPos = useRef(new THREE.Vector3(0, 0.18, 1.72))
  const currentLookAt = useRef(new THREE.Vector3(0, 0.04, 0))
  const parallaxPos = useRef(new THREE.Vector2(0, 0))
  const currentRingOpacity = useRef(1.0)
  const currentHandOpacity = useRef(0.0)

  const { size } = useThree()

  // 3D continuous spline tracing the true curved centerline of the ring finger
  const slideCurve = useMemo(() => {
    const pts = HAND_CALIBRATION.FINGER_SPLINE_POINTS.map(
      ([x, y, z]) => new THREE.Vector3(x, y, z)
    )
    return new THREE.CatmullRomCurve3(pts, false, 'centripetal', 0.5)
  }, [])

  // Configure high-luxury PBR materials for the ring
  useEffect(() => {
    let metalColor = '#f0eee9' // Platinum 950
    let milgrainColor = '#222220' // Iconic dark charcoal titanium milgrain contrast
    let metalness = 0.98
    let roughness = 0.08

    if (materialType === 'yellow-gold') {
      metalColor = '#ecd08c' // 18K Yellow Gold
      milgrainColor = '#9a752e'
      metalness = 0.96
      roughness = 0.12
    } else if (materialType === 'rose-gold') {
      metalColor = '#e8b59e' // 18K Rose Gold
      milgrainColor = '#8c5040'
      metalness = 0.96
      roughness = 0.12
    }

    clonedRingScene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh
        if (mesh.material) {
          const matName = ((Array.isArray(mesh.material) ? mesh.material[0]?.name : mesh.material.name) || '').toLowerCase()
          const meshName = (mesh.name || '').toLowerCase()

          const isDiamond = matName.includes('material_2') || matName.includes('diamond') || meshName.includes('dobj') || meshName.startsWith('dmesh')
          const isMilgrain = meshName.includes('circle006_1') || matName.includes('white gold 2')

          // Hardware depth layering: metal band is order 1, diamond is order 3
          mesh.renderOrder = isDiamond ? 3 : 1

          if (isDiamond) {
            mesh.material = new THREE.MeshPhysicalMaterial({
              color: new THREE.Color('#ffffff'),
              roughness: 0.0,
              metalness: 0.0,
              transmission: 0.98,
              ior: 2.418,
              dispersion: 0.044,
              thickness: 0.45,
              envMapIntensity: 3.2,
              depthWrite: true,
              depthTest: true,
              transparent: false,
            })
          } else if (isMilgrain) {
            mesh.material = new THREE.MeshStandardMaterial({
              metalness: 0.96,
              roughness: 0.22,
              color: new THREE.Color(materialType === 'platinum' ? '#222220' : milgrainColor),
              emissive: new THREE.Color(materialType === 'platinum' ? '#10100e' : '#1a1206'),
              envMapIntensity: 2.4,
              depthWrite: true,
              depthTest: true,
              transparent: false,
            })
          } else {
            const isProng = meshName.includes('prong') || meshName.includes('circle001') || meshName.includes('circle002')
            mesh.material = new THREE.MeshStandardMaterial({
              metalness: isProng ? 0.98 : metalness,
              roughness: isProng ? 0.06 : roughness,
              color: new THREE.Color(isProng && materialType === 'platinum' ? '#f5f3ee' : metalColor),
              emissive: new THREE.Color('#000000'),
              envMapIntensity: 2.8,
              depthWrite: true,
              depthTest: true,
              transparent: false,
            })
          }
        }
      }
    })
  }, [clonedRingScene, materialType])

  // Configure ultra-realistic photorealistic human skin for the hand model
  useEffect(() => {
    clonedHandScene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh
        mesh.castShadow = true
        mesh.receiveShadow = true
        // Hand renders at order 2: AFTER ring metal (1) but BEFORE transmissive diamond (3)
        // Writes depth to physically occlude diamond on the palm side during 360° orbit
        mesh.renderOrder = 2

        const skinMat = new THREE.MeshPhysicalMaterial({
          color: new THREE.Color('#c8a06a'),         // Warm golden champagne — sculpted luxury mannequin
          roughness: 0.52,                           // Slightly smoother — polished luxury feel
          metalness: 0.0,                            // Skin is dielectric
          transmission: 0.0,                         // OPAQUE — writes depth to physically block diamond on palm side
          thickness: 1.2,                            // Anatomical dermal depth for SSS coloring
          ior: 1.40,                                 // Human skin index of refraction
          attenuationColor: new THREE.Color('#8a5c1a'), // Deep warm amber inner scatter (golden)
          attenuationDistance: 0.55,
          sheen: 0.45,                               // Stronger sheen for golden luxe look
          sheenColor: new THREE.Color('#e8cfa0'),    // Warm gold shimmer sheen
          sheenRoughness: 0.60,
          clearcoat: 0.10,                           // More clearcoat for polished gold-skin gloss
          clearcoatRoughness: 0.60,
          envMapIntensity: 0.70,                     // More env reflection for golden shimmer
          depthWrite: true,
          depthTest: true,
          transparent: false,
        })

        skinMat.onBeforeCompile = (shader) => {
          shader.vertexShader = shader.vertexShader.replace(
            '#include <common>',
            `#include <common>
            varying vec3 vHandLocalPos;
            varying vec3 vHandLocalNorm;`
          )
          shader.vertexShader = shader.vertexShader.replace(
            '#include <begin_vertex>',
            `#include <begin_vertex>
            // Transform raw mesh vertex to hand-local space (undoing node +90° X-rotation)
            vHandLocalPos = vec3(position.x, -position.z, position.y);
            vHandLocalNorm = normalize(vec3(normal.x, -normal.z, normal.y));`
          )

          shader.fragmentShader = shader.fragmentShader.replace(
            '#include <common>',
            `#include <common>
            varying vec3 vHandLocalPos;
            varying vec3 vHandLocalNorm;

            float skinPores(vec3 p) {
              float scale = 40.0;
              float s1 = sin(p.x * scale) * sin(p.y * scale) * sin(p.z * scale);
              float s2 = sin(p.x * scale * 2.3 + 1.7) * sin(p.y * scale * 2.3 + 2.1) * sin(p.z * scale * 2.3);
              return (s1 * 0.65 + s2 * 0.35);
            }`
          )

          shader.fragmentShader = shader.fragmentShader.replace(
            '#include <color_fragment>',
            `#include <color_fragment>

            // 1. Palm (inner side) — slightly lighter warm ivory-gold
            float isPalm = smoothstep(0.1, -0.4, vHandLocalNorm.z);
            vec3 palmarColor = vec3(0.88, 0.76, 0.58);  // Warm ivory-gold palm

            // 2. Knuckle joint warm gold flush
            float knuckleDist1 = abs(vHandLocalPos.y - 20.25);
            float knuckleFlush1 = exp(-knuckleDist1 * knuckleDist1 * 1.5) * (1.0 - isPalm * 0.5);
            float knuckleDist2 = abs(vHandLocalPos.y - 21.30);
            float knuckleFlush2 = exp(-knuckleDist2 * knuckleDist2 * 2.0) * (1.0 - isPalm * 0.5);
            float jointFlush = max(knuckleFlush1, knuckleFlush2);
            vec3 knuckleTone = vec3(0.72, 0.52, 0.28);  // Warm amber-gold knuckle

            // 3. Fingernails — warm golden beige
            float isNail = smoothstep(21.7, 22.2, vHandLocalPos.y) * smoothstep(0.2, 0.6, vHandLocalNorm.z);
            vec3 nailTone = vec3(0.85, 0.70, 0.48);     // Warm golden beige nail

            diffuseColor.rgb = mix(diffuseColor.rgb, palmarColor, isPalm * 0.28);
            diffuseColor.rgb = mix(diffuseColor.rgb, knuckleTone, jointFlush * 0.20);
            diffuseColor.rgb = mix(diffuseColor.rgb, nailTone, isNail * 0.40);

            // 4. Subtle micro-pores (same as before)
            float pores = skinPores(vHandLocalPos);
            diffuseColor.rgb *= (1.0 - pores * 0.028);
            `
          )
        }

        mesh.material = skinMat
      }
    })
  }, [clonedHandScene])

  // Reusable vector buffers for useFrame to prevent garbage collection pauses
  const approachWorldPos = useMemo(() => new THREE.Vector3(), [])
  const hoverWorldPos = useMemo(() => new THREE.Vector3(), [])
  const hoverWorldQuat = useMemo(() => new THREE.Quaternion(), [])
  const wearWorldPos = useMemo(() => new THREE.Vector3(), [])
  const wearWorldQuat = useMemo(() => new THREE.Quaternion(), [])
  const ringTargetPos = useMemo(() => new THREE.Vector3(), [])
  const ringTargetQuat = useMemo(() => new THREE.Quaternion(), [])
  const targetCamPos = useMemo(() => new THREE.Vector3(0, 0.18, 1.72), [])
  const targetLookAt = useMemo(() => new THREE.Vector3(0, 0.04, 0), [])

  // Reusable scratch buffers to eliminate per-frame allocations
  const scratchVecA = useMemo(() => new THREE.Vector3(), [])
  const scratchVecB = useMemo(() => new THREE.Vector3(), [])
  const scratchVecC = useMemo(() => new THREE.Vector3(), [])
  const scratchQuatA = useMemo(() => new THREE.Quaternion(), [])
  const scratchQuatB = useMemo(() => new THREE.Quaternion(), [])
  const scratchEuler = useMemo(() => new THREE.Euler(), [])
  const heroRingPosDesktop = useMemo(() => new THREE.Vector3(0.18, 0.0, 0), [])
  const heroRingPosMobile = useMemo(() => new THREE.Vector3(0.0, -0.06, 0), [])
  const scratchMatrix = useMemo(() => new THREE.Matrix4(), [])

  // Post-loader Hero Entrance Animation tracking
  const introAnim = useRef({ progress: heroIntroReady ? 1 : 0 })
  useEffect(() => {
    if (heroIntroReady) {
      gsap.to(introAnim.current, {
        progress: 1,
        duration: 1.8,
        ease: 'power3.out',
      })
    }
  }, [heroIntroReady])

  // Precomputed resting wear anchor points for 360° hand rotation around stationary ring
  const restHandBasePos = useMemo(
    () => new THREE.Vector3(HAND_CALIBRATION.HAND_BASE_X_DESKTOP, -12.58 * HAND_CALIBRATION.SCALE, -0.20),
    []
  )
  const restHandQuat = useMemo(
    () => new THREE.Quaternion().setFromEuler(new THREE.Euler(0.10, Math.PI - 0.15, -0.05, 'XYZ')),
    []
  )
  const fixedWearWorldPos = useMemo(() => {
    const localP = slideCurve.getPoint(1.0)
    const offset = localP.clone().multiplyScalar(HAND_CALIBRATION.SCALE).applyQuaternion(restHandQuat)
    return restHandBasePos.clone().add(offset)
  }, [restHandBasePos, restHandQuat])
  const fixedFingerWorldTan = useMemo(() => {
    const localT = slideCurve.getTangent(1.0).normalize()
    return localT.clone().applyQuaternion(restHandQuat).normalize()
  }, [restHandQuat])
  const fixedWearWorldQuat = useMemo(() => {
    const upVec = fixedFingerWorldTan.clone().negate()
    // Hand is flipped 180° around Y: hand-local -Z now points toward camera (dorsal),
    // so we use (0,0,-1) to get the camera-facing dorsal direction in world space.
    const worldDorsal = new THREE.Vector3(0, 0, -1)
      .applyQuaternion(restHandQuat)
      .projectOnPlane(upVec)
      .normalize()
    const lateral = new THREE.Vector3().crossVectors(upVec, worldDorsal).normalize()
    worldDorsal.crossVectors(lateral, upVec).normalize()
    const rotMatrix = new THREE.Matrix4().makeBasis(lateral, upVec, worldDorsal)
    return new THREE.Quaternion().setFromRotationMatrix(rotMatrix)
  }, [fixedFingerWorldTan, restHandQuat])
  const tempHandBasePos = useMemo(() => new THREE.Vector3(), [])
  const tempHandQuat = useMemo(() => new THREE.Quaternion(), [])
  const tempOffset = useMemo(() => new THREE.Vector3(), [])
  const tempSpinQuat = useMemo(() => new THREE.Quaternion(), [])

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05)
    const p = Math.max(0, Math.min(1, progress))
    const time = state.clock.getElapsedTime()
    const isMobile = size.width < 768

    // Hand scale and placement calibrated to 65-70% viewport
    const handScale = isMobile ? HAND_CALIBRATION.SCALE_MOBILE : HAND_CALIBRATION.SCALE
    const restingHandBaseY = -12.58 * handScale
    const restingHandBaseX = isMobile ? HAND_CALIBRATION.HAND_BASE_X_MOBILE : HAND_CALIBRATION.HAND_BASE_X_DESKTOP

    // ------------------------------------------------------------------------
    // 1. PROCEDURAL LIVING HAND MOTION (Temporal Layering: Medium Mass)
    // ------------------------------------------------------------------------
    const wristElevation = Math.sin(time * 0.8) * 0.024
    const wristTiltX = Math.cos(time * 0.6) * 0.008
    const wristTiltZ = Math.sin(time * 0.7) * 0.007
    const breathingScale = 1.0 + Math.sin(time * 1.1) * 0.002

    let targetHandOpacity = 0.0
    // Hand base position — DORSAL (back-of-hand) view: ring finger faces camera from knuckle side
    // Positioned so hand is framed on right side on desktop, leaving left side for editorial text
    let handBaseX = restingHandBaseX
    let handBaseY = restingHandBaseY
    let handBaseZ = -0.20
    let handRotX = 0.10
    let handRotY = Math.PI - 0.15 // Dorsal (back-of-hand) faces camera — flipped 180° from palm
    let handRotZ = -0.05

    if (p < 0.36) {
      targetHandOpacity = 0.0
      handBaseY = -10.0 // submerged far off screen
    } else if (p < 0.48) {
      // 0.36 -> 0.48: HAND EMERGES VIA PLATINUM RIM LIGHT SILHOUETTE
      const t = (p - 0.36) / 0.12
      const smoothT = t * t * (3 - 2 * t)
      targetHandOpacity = smoothT
      handBaseY = THREE.MathUtils.lerp(-7.5, restingHandBaseY, smoothT)
    } else if (p < 0.76) {
      // 0.48 -> 0.76: HAND FULLY PRESENT — stable dorsal pose during entire wearing sequence
      targetHandOpacity = 1.0
      handBaseY = restingHandBaseY
    } else if (p < 0.82) {
      // 0.76 -> 0.82: Ring worn on finger — 360° hand presentation showcase
      targetHandOpacity = 1.0
      handBaseY = restingHandBaseY
      handRotY = Math.PI - 0.15 // Dorsal facing camera
      handRotX = 0.10
      handRotZ = -0.05
    } else if (p < 0.88) {
      // 0.82 -> 0.88: THE SACRED UNTHREADING (Hand se nikalna)
      // Hand gently relaxes and lowers into shadows as ring unthreads backward off the finger
      const t = (p - 0.82) / 0.06
      const smoothT = t * t * (3 - 2 * t)
      targetHandOpacity = Math.max(0, 1.0 - smoothT * 1.3)
      handBaseY = THREE.MathUtils.lerp(restingHandBaseY, -7.5, smoothT)
    } else {
      // 0.88 -> 1.00: Hand completely lowered and hidden
      targetHandOpacity = 0.0
      handBaseY = -10.0
    }

    const isWornHold = p >= 0.76 && p < 0.82
    const currentElevation = isWornHold ? 0 : wristElevation
    const currentTiltX = isWornHold ? 0 : wristTiltX
    const currentTiltZ = isWornHold ? 0 : wristTiltZ

    // Hand Scroll Group: purely responds to scroll timeline
    const isWornSpin = p >= 0.77 && p < 0.82
    if (isWornSpin) {
      // 360° Hand Orbit: Hand revolves around the stationary finger wear axis
      const t = (p - 0.77) / 0.05
      const smoothT = t * t * (3 - 2 * t)
      const spinAngle = smoothT * Math.PI * 2

      // Rotate around finger axis (fixedFingerWorldTan) passing through fixedWearWorldPos
      tempSpinQuat.setFromAxisAngle(fixedFingerWorldTan, spinAngle)
    } else {
      tempSpinQuat.identity()
    }

    if (handRootRef.current) {
      if (isWornSpin) {
        tempHandQuat.multiplyQuaternions(tempSpinQuat, restHandQuat)

        const localWearPoint = slideCurve.getPoint(1.0)
        tempOffset
          .copy(localWearPoint)
          .multiplyScalar(handScale)
          .applyQuaternion(tempHandQuat)
        tempHandBasePos.subVectors(fixedWearWorldPos, tempOffset)

        handRootRef.current.position.copy(tempHandBasePos)
        handRootRef.current.quaternion.copy(tempHandQuat)
      } else {
        handRootRef.current.position.set(
          handBaseX,
          handBaseY,
          handBaseZ
        )
        handRootRef.current.rotation.set(
          handRotX,
          handRotY,
          handRotZ
        )
      }
      handRootRef.current.scale.setScalar(handScale)
      handRootRef.current.visible = targetHandOpacity > 0.005
      handRootRef.current.updateMatrixWorld(true)
    }

    // Hand Idle Group: pure micro-breathing & natural wrist elevation
    if (handIdleGroupRef.current) {
      handIdleGroupRef.current.position.set(0, currentElevation, 0)
      handIdleGroupRef.current.rotation.set(currentTiltX, 0, currentTiltZ)
      handIdleGroupRef.current.scale.setScalar(isWornHold ? 1.0 : breathingScale)
      handIdleGroupRef.current.updateMatrixWorld(true)
    }

    // ------------------------------------------------------------------------
    // 2. HELPER: SAMPLE 3D FINGER SPLINE IN WORLD SPACE
    // Dynamically aligns the ring hole along the exact finger cylinder vector,
    // ensuring ZERO clipping through the knuckle or skin flesh.
    // ------------------------------------------------------------------------
    const sampleSplineInWorld = (
      u: number,
      outPos: THREE.Vector3,
      outQuat: THREE.Quaternion
    ) => {
      if (!handIdleGroupRef.current) return
      const clampedU = Math.max(0, Math.min(1, u))
      const localP = slideCurve.getPoint(clampedU)
      const localT = slideCurve.getTangent(clampedU)

      handIdleGroupRef.current.localToWorld(outPos.copy(localP))
      const worldTan = localT
        .clone()
        .transformDirection(handIdleGroupRef.current.matrixWorld)
        .normalize()
      const upVec = worldTan.clone().negate()

      // Hole of ring (local Y [0, 1, 0]) aligns along upVec
      // Solitaire diamond (local +Z) points toward dorsal (camera) side of the finger.
      // Hand is flipped 180° around Y: hand-local -Z is now the camera-facing dorsal direction.
      const worldDorsal = new THREE.Vector3(0, 0, -1)
        .transformDirection(handIdleGroupRef.current.matrixWorld)
        .projectOnPlane(upVec)
        .normalize()
      const lateral = new THREE.Vector3().crossVectors(upVec, worldDorsal).normalize()
      worldDorsal.crossVectors(lateral, upVec).normalize()
      scratchMatrix.makeBasis(lateral, upVec, worldDorsal)
      outQuat.setFromRotationMatrix(scratchMatrix)
    }

    // Precompute world positions at key spline nodes
    sampleSplineInWorld(0.0, hoverWorldPos, hoverWorldQuat)
    sampleSplineInWorld(1.0, wearWorldPos, wearWorldQuat)

    // ------------------------------------------------------------------------
    // 3. MASTER SCENE CHOREOGRAPHY ACROSS 0.00 -> 1.00
    // ------------------------------------------------------------------------
    let targetRingOpacity = 1.0
    let targetKeyIntensity = 2.4
    let targetSpotIntensity = 2.6
    let targetRimIntensity = 2.0

    const heroRingPos = isMobile ? heroRingPosMobile : heroRingPosDesktop
    const introProgress = Math.min(1, Math.max(0, introAnim.current.progress))

    if (p <= 0.18) {
      // 00.00 – 00.18: STATE 01 — RING HERO (Horizontal architectural presentation: diamond solitaire & whole band)
      const t = p / 0.18
      targetCamPos.set(0, isMobile ? 0.08 : 0.18, isMobile ? 2.85 : 1.72)
      targetLookAt.set(0, isMobile ? -0.02 : 0.04, 0)

      if (p <= 0.12) {
        if (introProgress < 0.999) {
          // Post-loader entrance: ring glides forward from depth into the hero resting station
          const inv = 1 - introProgress
          ringTargetPos.set(
            heroRingPos.x,
            heroRingPos.y - 0.08 * inv,
            heroRingPos.z - 0.55 * inv
          )
        } else {
          ringTargetPos.copy(heroRingPos)
        }
      } else {
        const centerT = (p - 0.12) / 0.06
        const smoothCenterT = centerT * centerT * (3 - 2 * centerT)
        ringTargetPos.lerpVectors(heroRingPos, scratchVecA.set(0, 0, 0), smoothCenterT)
      }

      // Horizontal architectural posture:
      // Ring lies horizontally across viewport, tilted forward ~15° so viewer looks down upon the diamond crown
      // and the entire circular band is fully revealed!
      const pitchTilt = 0.26 + Math.sin(t * Math.PI) * 0.10 + (introProgress < 0.999 ? 0.14 * (1 - introProgress) : 0)
      const yawSpin = 0.15 + t * (Math.PI * 0.75) + (introProgress < 0.999 ? 0.65 * (1 - introProgress) : 0)
      const rollBank = Math.sin(t * Math.PI) * 0.06
      scratchEuler.set(pitchTilt, yawSpin, rollBank)
      ringTargetQuat.setFromEuler(scratchEuler)

      targetRingOpacity = Math.min(1.0, introProgress * 1.25)
      targetKeyIntensity = 2.4 * Math.min(1.0, 0.3 + introProgress * 0.7)
      targetSpotIntensity = 2.6
      targetRimIntensity = 2.0
    } else if (p <= 0.32) {
      // 00.18 – 00.32: RING ANATOMY / ARCHITECTURE (Horizontal centered inspection)
      const t = (p - 0.18) / 0.14
      const smoothT = t * t * (3 - 2 * t)
      targetCamPos.set(0, isMobile ? 0.08 : 0.18, isMobile ? 2.85 : 1.75)
      targetLookAt.set(0, isMobile ? -0.02 : 0.04, 0)
      ringTargetPos.set(0, 0, 0) // Exact horizontal & vertical center

      // Continuous horizontal spin highlighting the 4 architectural callouts
      const pitchAnatomy = 0.28 + Math.sin(smoothT * Math.PI) * 0.08
      const yawAnatomy = 0.15 + Math.PI * 0.75 + smoothT * (Math.PI * 0.85)
      const rollAnatomy = -0.04 + Math.sin(smoothT * Math.PI * 2) * 0.06
      scratchEuler.set(pitchAnatomy, yawAnatomy, rollAnatomy)
      ringTargetQuat.setFromEuler(scratchEuler)
      targetRingOpacity = 1.0
      targetKeyIntensity = 2.4
      targetSpotIntensity = 2.6
    } else if (p <= 0.38) {
      // 00.32 – 00.38: DARKNESS CHANGES (Camera pulls back to frame the full hand)
      // Ring smoothly transitions from horizontal center toward upper hover station above the hand
      const t = (p - 0.32) / 0.06
      const smoothT = t * t * (3 - 2 * t)
      // Pull back to full-hand framing: Z=9.2 shows the whole hand at ~68% viewport
      targetCamPos.set(
        0.0,
        THREE.MathUtils.lerp(0.18, HAND_CALIBRATION.HAND_FRAME_LOOK_CENTER[1], smoothT),
        THREE.MathUtils.lerp(isMobile ? 2.85 : 1.75, isMobile ? 12.0 : HAND_CALIBRATION.HAND_CAM_Z_FULL, smoothT)
      )
      // LookAt transitions from ring center to hand center
      targetLookAt.lerpVectors(
        scratchVecA.set(0, 0.04, 0),
        scratchVecB.set(
          isMobile ? 0.0 : HAND_CALIBRATION.HAND_FRAME_LOOK_CENTER[0],
          HAND_CALIBRATION.HAND_FRAME_LOOK_CENTER[1],
          HAND_CALIBRATION.HAND_FRAME_LOOK_CENTER[2]
        ),
        smoothT
      )
      ringTargetPos.lerpVectors(scratchVecA.set(0, 0, 0), hoverWorldPos, smoothT)
      scratchEuler.set(0.30, 0.15 + Math.PI * 1.6, -0.04)
      scratchQuatA.setFromEuler(scratchEuler)
      ringTargetQuat.slerpQuaternions(scratchQuatA, hoverWorldQuat, smoothT)
      targetRingOpacity = 1.0
      targetKeyIntensity = 1.6
      targetRimIntensity = 1.8
    } else if (p <= 0.48) {
      // 00.38 – 00.48: HAND SILHOUETTE EMERGES (Platinum rim light sweeps)
      // Camera at full-hand framing distance — whole hand visible at ~68% viewport
      const t = (p - 0.38) / 0.10
      const camZ = isMobile ? 12.0 : HAND_CALIBRATION.HAND_CAM_Z_FULL
      targetCamPos.set(0.0, HAND_CALIBRATION.HAND_FRAME_LOOK_CENTER[1], camZ)
      targetLookAt.set(
        isMobile ? 0.0 : HAND_CALIBRATION.HAND_FRAME_LOOK_CENTER[0],
        HAND_CALIBRATION.HAND_FRAME_LOOK_CENTER[1],
        HAND_CALIBRATION.HAND_FRAME_LOOK_CENTER[2]
      )
      ringTargetPos.copy(hoverWorldPos)
      ringTargetQuat.copy(hoverWorldQuat)
      targetRingOpacity = 1.0
      targetRimIntensity = THREE.MathUtils.lerp(1.8, 2.8, t)
      targetKeyIntensity = 1.2
    } else if (p <= 0.58) {
      // 00.48 – 00.58: HAND REVEALED (Warm champagne key light illuminates)
      // Full hand visible, ring hover above finger — luxury jewelry commercial framing
      const t = (p - 0.48) / 0.10
      const camZ = isMobile ? 12.0 : HAND_CALIBRATION.HAND_CAM_Z_FULL
      targetCamPos.set(0.0, HAND_CALIBRATION.HAND_FRAME_LOOK_CENTER[1], camZ)
      targetLookAt.set(
        isMobile ? 0.0 : HAND_CALIBRATION.HAND_FRAME_LOOK_CENTER[0],
        HAND_CALIBRATION.HAND_FRAME_LOOK_CENTER[1],
        HAND_CALIBRATION.HAND_FRAME_LOOK_CENTER[2]
      )
      ringTargetPos.copy(hoverWorldPos)
      ringTargetQuat.copy(hoverWorldQuat)
      targetRingOpacity = 1.0
      targetKeyIntensity = THREE.MathUtils.lerp(1.2, 1.6, t)
      targetRimIntensity = 2.4
    } else if (p <= 0.62) {
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // 00.58 – 00.62: ① FLOAT — ring hovers clearly separated from hand
      // Visitor reads: "This ring is floating in space, about to descend"
      // Full hand framing: hand ~68% viewport, ring clearly above finger
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      const t = (p - 0.58) / 0.04
      const smoothT = t * t * (3 - 2 * t)

      sampleSplineInWorld(0.0, ringTargetPos, ringTargetQuat)

      const camZStart = isMobile ? 11.0 : HAND_CALIBRATION.HAND_CAM_Z_FULL
      const camZEnd = isMobile ? 9.5 : 7.2
      targetCamPos.set(
        0.0,
        THREE.MathUtils.lerp(HAND_CALIBRATION.HAND_FRAME_LOOK_CENTER[1], wearWorldPos.y * 0.3, smoothT),
        THREE.MathUtils.lerp(camZStart, camZEnd, smoothT)
      )
      targetLookAt.set(
        isMobile ? 0.0 : THREE.MathUtils.lerp(HAND_CALIBRATION.HAND_FRAME_LOOK_CENTER[0], wearWorldPos.x - 0.08, smoothT * 0.4),
        THREE.MathUtils.lerp(HAND_CALIBRATION.HAND_FRAME_LOOK_CENTER[1], wearWorldPos.y * 0.4, smoothT * 0.5),
        HAND_CALIBRATION.HAND_FRAME_LOOK_CENTER[2]
      )
      targetRingOpacity = 1.0
      targetKeyIntensity = 1.6
      targetRimIntensity = 2.6

    } else if (p <= 0.66) {
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // 00.62 – 00.66: ② APPROACH — ring travels elegantly toward ring finger
      // Curved descent along spline: hover (u=0) → fingertip (u=0.25)
      // Camera at ring-biased distance: hand ~75% viewport
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      const t = (p - 0.62) / 0.04
      const smoothT = t * t * (3 - 2 * t)
      const u = smoothT * 0.30

      sampleSplineInWorld(u, ringTargetPos, ringTargetQuat)

      const camZApproachStart = isMobile ? 9.5 : 7.2
      const camZApproachEnd = isMobile ? 8.5 : 6.4  // Zoom in closer as ring nears finger
      targetCamPos.set(
        0.0,
        THREE.MathUtils.lerp(wearWorldPos.y * 0.3, wearWorldPos.y * 0.4, smoothT),
        THREE.MathUtils.lerp(camZApproachStart, camZApproachEnd, smoothT)
      )
      targetLookAt.set(
        isMobile ? 0.0 : THREE.MathUtils.lerp(wearWorldPos.x - 0.08, wearWorldPos.x - 0.12, smoothT),
        THREE.MathUtils.lerp(wearWorldPos.y * 0.4, wearWorldPos.y * 0.6, smoothT),
        0
      )
      targetRingOpacity = 1.0
      targetKeyIntensity = 1.8
      targetRimIntensity = 2.6

    } else if (p <= 0.69) {
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // 00.66 – 00.69: ③ ALIGN — ring pauses at fingertip, visibly aligns axis
      // Ring wobbles subtly then settles into exact finger-axis orientation.
      // Visitor reads: "The ring is preparing to go onto the finger"
      // Camera: ring-biased but hand still visible at ~75% viewport
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      const t = (p - 0.66) / 0.03
      const smoothT = t * t * (3 - 2 * t)

      sampleSplineInWorld(0.30, ringTargetPos, ringTargetQuat)

      const wobble = Math.sin((1.0 - smoothT) * Math.PI) * 0.08
      scratchEuler.set(wobble, 0, wobble * 0.5)
      scratchQuatA.setFromEuler(scratchEuler)
      ringTargetQuat.multiply(scratchQuatA)

      const camZAlign = isMobile ? 8.0 : 6.0   // Tighter close-up at align moment
      targetCamPos.set(
        0.0,
        wearWorldPos.y * 0.45,
        camZAlign
      )
      targetLookAt.set(
        isMobile ? 0.0 : wearWorldPos.x - 0.12,
        wearWorldPos.y * 0.7,
        0
      )
      targetRingOpacity = 1.0
      targetKeyIntensity = 2.0
      targetSpotIntensity = 2.0
      targetRimIntensity = 2.6

    } else if (p <= 0.76) {
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // 00.69 – 00.76: ④ SLIDE — THE MOST IMPORTANT MOMENT 💍
      // Ring slides slowly, continuously from knuckle to base.
      // Camera: ring+finger context at medium-close. Ring = hero, hand gives context.
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      const t = (p - 0.69) / 0.07
      const slideFactor = sacredSlidePhysics(t)
      const u = THREE.MathUtils.lerp(0.30, 1.00, Math.min(1.0, slideFactor))

      sampleSplineInWorld(u, ringTargetPos, ringTargetQuat)

      // SLIDE — camera progressively zooms in as ring slides down finger (MOST IMPORTANT MOMENT)
      // Starts at align distance (6.0) and dollies in tight to HAND_CAM_Z_RING (5.6) at settle
      const camZSlideStart = isMobile ? 8.0 : 6.0
      const camZSlide = isMobile ? 7.5 : THREE.MathUtils.lerp(camZSlideStart, HAND_CALIBRATION.HAND_CAM_Z_RING, Math.min(1.0, t * 1.3))
      targetCamPos.set(
        0.0,
        THREE.MathUtils.lerp(wearWorldPos.y * 0.45, wearWorldPos.y * 0.35, Math.min(1.0, t * 1.2)),
        camZSlide
      )
      targetLookAt.set(
        isMobile ? 0.0 : wearWorldPos.x - 0.12,
        THREE.MathUtils.lerp(wearWorldPos.y * 0.7, wearWorldPos.y * 0.5, Math.min(1.0, t * 1.2)),
        0
      )

      targetRingOpacity = 1.0
      targetKeyIntensity = 2.2
      targetSpotIntensity = 2.2
      targetRimIntensity = 2.8

    } else if (p <= 0.77) {
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // 00.76 – 00.77: ⑤ SETTLE — spring correction, ring finds its home
      // Camera at medium-close: ring + finger clearly visible, whole hand in context
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      sampleSplineInWorld(1.0, ringTargetPos, ringTargetQuat)

      const camZSettle = isMobile ? 8.5 : HAND_CALIBRATION.HAND_CAM_Z_RING
      targetCamPos.set(0.0, wearWorldPos.y * 0.35, camZSettle)
      targetLookAt.set(
        isMobile ? 0.0 : wearWorldPos.x - 0.15,
        wearWorldPos.y * 0.5,
        0
      )
      targetRingOpacity = 1.0
      targetKeyIntensity = 2.2
      targetSpotIntensity = 2.2
      targetRimIntensity = 2.8

    } else if (p <= 0.82) {
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // 00.77 – 00.82: ⑥ 360° LIVING HAND & RING ORBIT 💍
      // The hand and ring rotate 360° together as a single physical entity!
      // Camera frames the ENTIRE HAND at ~68% viewport — luxury jewelry commercial.
      // Viewer can clearly understand: hand shape, finger, ring, rotation direction.
      // At 0° (dorsal): Diamond fully visible on outer side of finger facing camera.
      // At ~90°: Diamond gradually rotates to side profile.
      // At ~180° (palm side): Diamond setting rotates behind finger and is
      // naturally occluded by the finger flesh; only the smooth band is visible!
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      const t = Math.max(0, Math.min(1, (p - 0.77) / 0.05))

      // Ring stays anchored on finger and rigidly rotates with finger
      ringTargetPos.copy(fixedWearWorldPos)
      ringTargetQuat.multiplyQuaternions(tempSpinQuat, fixedWearWorldQuat)

      // Camera frames the FULL HAND at ~68% viewport
      const camZ360 = isMobile ? 12.0 : HAND_CALIBRATION.HAND_CAM_Z_FULL
      targetCamPos.set(
        0.0,
        HAND_CALIBRATION.HAND_FRAME_LOOK_CENTER[1] + THREE.MathUtils.lerp(0.0, 0.08, Math.min(1.0, t * 1.5)),
        camZ360
      )
      targetLookAt.set(
        isMobile ? 0.0 : HAND_CALIBRATION.HAND_FRAME_LOOK_CENTER[0],
        HAND_CALIBRATION.HAND_FRAME_LOOK_CENTER[1],
        HAND_CALIBRATION.HAND_FRAME_LOOK_CENTER[2]
      )

      targetRingOpacity = 1.0
      targetKeyIntensity = 1.8
      targetSpotIntensity = 1.6
      targetRimIntensity = 2.8

    } else if (p <= 0.88) {
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // 00.82 – 00.88: ⑦ THE SACRED UNTHREADING (Hand se nikalna) 💍✨
      // The ring reverses smoothly along the finger spline, glides over the knuckle,
      // and slides completely OFF the finger into free air.
      // Camera: starts at full-hand framing, then follows ring upward as hand sinks
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      const t = (p - 0.82) / 0.06
      const smoothT = t * t * (3 - 2 * t)

      // Use sampleSplineInWorld — same function as slide-in — for consistent dorsal orientation
      const uUnthread = THREE.MathUtils.lerp(1.0, 0.0, Math.min(1.0, smoothT * 1.15))
      sampleSplineInWorld(Math.max(0, Math.min(1, uUnthread)), ringTargetPos, ringTargetQuat)

      // Extra clearance beyond fingertip as smoothT -> 1.0 (ring floats above fingertip)
      if (smoothT > 0.78) {
        const exitBoost = (smoothT - 0.78) / 0.22
        scratchVecC.copy(fixedFingerWorldTan).multiplyScalar(exitBoost * 0.28)
        ringTargetPos.add(scratchVecC)
        // Gently tilt to hero beauty angle as ring exits
        scratchEuler.set(0.28, 0.42, 0.04)
        scratchQuatB.setFromEuler(scratchEuler)
        ringTargetQuat.slerp(scratchQuatB, exitBoost * 0.5)
      }

      // Camera: starts at ring close-up (matching settle), then pulls back to full-hand as ring exits
      const camZUnthread = THREE.MathUtils.lerp(
        isMobile ? 7.5 : HAND_CALIBRATION.HAND_CAM_Z_RING,
        isMobile ? 9.0 : HAND_CALIBRATION.HAND_CAM_Z_FULL,
        smoothT
      )
      const camXUnthread = isMobile
        ? THREE.MathUtils.lerp(0.0, ringTargetPos.x * 0.25, smoothT)
        : THREE.MathUtils.lerp(0.0, ringTargetPos.x - 0.1, smoothT)
      const camYUnthread = THREE.MathUtils.lerp(
        wearWorldPos.y * 0.35,
        ringTargetPos.y + 0.12,
        smoothT
      )
      targetCamPos.set(camXUnthread, camYUnthread, camZUnthread)

      const lookYUnthread = THREE.MathUtils.lerp(
        wearWorldPos.y * 0.5,
        ringTargetPos.y,
        smoothT
      )
      targetLookAt.set(
        isMobile ? 0.0 : THREE.MathUtils.lerp(HAND_CALIBRATION.HAND_FRAME_LOOK_CENTER[0], ringTargetPos.x, smoothT),
        lookYUnthread,
        0
      )

      targetRingOpacity = 1.0
      targetKeyIntensity = 2.4
      targetSpotIntensity = 2.2
      targetRimIntensity = 3.0

    } else if (p <= 0.95) {
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // 00.88 – 00.95: ⑧ THE CELESTIAL TRAVELING FLIGHT (Travel karti karti) 🌌💎
      // Ring takes majestic flight across 3D space along a sculptural spatial arc!
      // Continuous living tumble displays all 57 facets of the solitaire with rainbow dispersion.
      // The camera swoops and tracks alongside the traveling ring like a luxury film crane.
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      const t = (p - 0.88) / 0.07

      // Flight origin: exact exit point in free air
      const localTip = slideCurve.getPoint(0.0)
      scratchVecA
        .copy(localTip)
        .multiplyScalar(HAND_CALIBRATION.SCALE)
        .applyQuaternion(restHandQuat)
      const flightOrigin = scratchVecB.copy(restHandBasePos).add(scratchVecA)
      scratchVecC.copy(fixedFingerWorldTan).multiplyScalar(0.38)
      flightOrigin.add(scratchVecC)

      // Flight destination: approaching center horizon of carousel entrance
      const flightTargetX = 0.0
      const flightTargetY = 0.08
      const flightTargetZ = -0.35

      // 3D S-Arc trajectory across space
      const arcProgress = t
      const lateralArc = -Math.sin(arcProgress * Math.PI) * 0.48 + Math.sin(arcProgress * Math.PI * 2) * 0.15
      const liftArc = Math.sin(arcProgress * Math.PI) * 0.26 + Math.sin(time * 1.6) * 0.015
      const depthArc = Math.sin(arcProgress * Math.PI) * 0.52 // swoops forward close to camera then glides back

      ringTargetPos.set(
        THREE.MathUtils.lerp(flightOrigin.x, flightTargetX, arcProgress) + lateralArc,
        THREE.MathUtils.lerp(flightOrigin.y, flightTargetY, arcProgress) + liftArc,
        THREE.MathUtils.lerp(flightOrigin.z, flightTargetZ, arcProgress) + depthArc
      )

      // Continuous traveling pirouette and zero-g tumble revealing facets to lights
      const spinAngle = arcProgress * Math.PI * 1.8 + time * 0.35
      const pitchAngle = 0.28 + Math.sin(arcProgress * Math.PI * 2) * 0.18
      const rollAngle = Math.sin(arcProgress * Math.PI) * 0.16 + Math.cos(time * 0.8) * 0.04
      scratchEuler.set(pitchAngle, spinAngle, rollAngle)
      ringTargetQuat.setFromEuler(scratchEuler)

      // Cinematic Tracking Crane Camera
      targetCamPos.set(
        ringTargetPos.x * 0.45 + 0.12,
        ringTargetPos.y + 0.18,
        THREE.MathUtils.lerp(3.8, 2.8, Math.sin(arcProgress * Math.PI))
      )
      targetLookAt.set(ringTargetPos.x, ringTargetPos.y, ringTargetPos.z)

      targetRingOpacity = 1.0
      targetKeyIntensity = 3.4
      targetSpotIntensity = 3.2
      targetRimIntensity = 3.6 // Prismatic flare across pavilion and diamond crown

    } else {
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // 00.95 – 01.00: ⑨ THE THRESHOLD & HIGH LUXURY BEAUTY SHOWCASE 🪐👑
      // Magnificent 3/4 editorial posture: elevated diamond crown facing viewer,
      // twin pavé shoulders and sculpted milgrain equator catching radiant studio light.
      // Continuous physical transit into the Material Carousel below!
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      if (p < 0.975) {
        // Phase 9A: Center Stage Showcase (Magnificent 3/4 luxury posture)
        const tSettle = (p - 0.95) / 0.025
        const smoothSettle = tSettle * tSettle * (3 - 2 * tSettle)

        ringTargetPos.lerpVectors(
          scratchVecA.set(isMobile ? 0.0 : 0.08, 0.06, -0.28),
          scratchVecB.set(isMobile ? 0.0 : 0.08, 0.06, -0.12),
          smoothSettle
        )

        // Luxury 3/4 editorial beauty angle:
        // pitch ~0.26 tilts diamond crown forward into view; yaw ~0.42 displays prongs and pavé
        scratchEuler.set(0.26, 0.42, -0.05)
        ringTargetQuat.slerp(scratchQuatA.setFromEuler(scratchEuler), 0.22)

        targetCamPos.set(0.0, THREE.MathUtils.lerp(0.18, 0.20, smoothSettle), THREE.MathUtils.lerp(2.9, 2.75, smoothSettle))
        targetLookAt.set(isMobile ? 0.0 : 0.04, 0.04, 0.0)

        targetRingOpacity = 1.0
        targetKeyIntensity = 3.6
        targetSpotIntensity = 3.4
        targetRimIntensity = 3.8
      } else {
        // Phase 9B: Gentle Forward Glide & Seamless Section 02 Transition (0.975 -> 1.000)
        const tDive = (p - 0.975) / 0.025
        const smoothDive = tDive * tDive * (3 - 2 * tDive)

        // Gentle forward glide maintaining beauty orientation
        ringTargetPos.set(
          isMobile ? 0.0 : 0.08,
          THREE.MathUtils.lerp(0.06, 0.03, smoothDive),
          THREE.MathUtils.lerp(-0.12, 0.08, smoothDive)
        )

        scratchEuler.set(
          0.26 + smoothDive * 0.04,
          0.42 + smoothDive * 0.06,
          -0.05
        )
        ringTargetQuat.setFromEuler(scratchEuler)

        targetCamPos.set(0.0, THREE.MathUtils.lerp(0.20, 0.22, smoothDive), THREE.MathUtils.lerp(2.75, 2.90, smoothDive))
        targetLookAt.set(isMobile ? 0.0 : 0.04, 0.04, 0.0)

        // Soft optical dissolve as Section 01 completes into Material Study
        targetRingOpacity = p > 0.990 ? THREE.MathUtils.lerp(1.0, 0.0, (p - 0.990) / 0.010) : 1.0
        targetKeyIntensity = THREE.MathUtils.lerp(3.6, 2.2, smoothDive)
        targetSpotIntensity = THREE.MathUtils.lerp(3.4, 2.0, smoothDive)
        targetRimIntensity = THREE.MathUtils.lerp(3.8, 2.4, smoothDive)
      }
    }

    // ------------------------------------------------------------------------
    // 4. SMOOTH CAMERA & OBJECT INTERPOLATION (Law 01, Law 02, Component 03)
    // Both camera position AND lookAt are damped with CINEMATIC_MASS.heavy!
    // ------------------------------------------------------------------------
    dampVector3(currentCamPos.current, targetCamPos, CINEMATIC_MASS.heavy, dt)
    dampVector3(currentLookAt.current, targetLookAt, CINEMATIC_MASS.heavy, dt)
    currentRingOpacity.current = dampScalar(currentRingOpacity.current, targetRingOpacity, CINEMATIC_MASS.medium, dt)
    currentHandOpacity.current = dampScalar(currentHandOpacity.current, targetHandOpacity, CINEMATIC_MASS.medium, dt)

    // Subtle pointer parallax (LIGHT MASS)
    const parallaxTargetX = state.pointer.x * 0.06
    const parallaxTargetY = state.pointer.y * 0.06
    parallaxPos.current.x = dampScalar(parallaxPos.current.x, parallaxTargetX, CINEMATIC_MASS.light, dt)
    parallaxPos.current.y = dampScalar(parallaxPos.current.y, parallaxTargetY, CINEMATIC_MASS.light, dt)

    state.camera.position.set(
      currentCamPos.current.x + parallaxPos.current.x,
      currentCamPos.current.y + parallaxPos.current.y,
      currentCamPos.current.z
    )
    state.camera.lookAt(currentLookAt.current)

    // Update Ring Root (ScrollTransformGroup)
    // During 360° hand orbit, lock ring rotation 100% rigidly (1.0) to finger with zero delay
    // During slide / settle / unthreading the finger moves every frame — use tight tracking (0.42).
    // During celestial flight across space, use luxurious smooth inertia (0.16).
    // During descent into carousel, track scroll decisively (0.32).
    // During hero / anatomy / approach use smooth cinematic lerp (0.08).
    const isFingerTracking = p >= 0.69 && p < 0.88
    const isFlightPhase = p >= 0.88 && p <= 1.0
    const isDescentPhase = p >= 0.975
    const ringLerp = isWornSpin ? 1.0 : isFingerTracking ? 0.42 : isDescentPhase ? 0.32 : isFlightPhase ? 0.16 : 0.08

    if (ringRootRef.current) {
      ringRootRef.current.visible = (heroIntroReady || p > 0.005) && currentRingOpacity.current > 0.005
      const introScale = p <= 0.12 ? THREE.MathUtils.lerp(0.82, 1.0, introProgress) : 1.0
      const heroScale = isMobile ? HAND_CALIBRATION.HERO_RING_SCALE_MOBILE : HAND_CALIBRATION.HERO_RING_SCALE
      const wearScale = isMobile ? HAND_CALIBRATION.RING_PHYSICAL_SCALE_MOBILE : HAND_CALIBRATION.RING_PHYSICAL_SCALE

      // Dynamic scale curve: "ring badi kar but jab finger me jaye tab coti kar ke set kardena"
      let dynamicScale = heroScale
      if (p <= 0.32) {
        // Hero & Anatomy: Grand, bold, macro presentation
        dynamicScale = heroScale
      } else if (p <= 0.66) {
        // Approach: Ring smoothly contracts down as it approaches the fingertip
        const t = (p - 0.32) / 0.34
        const smoothT = t * t * (3 - 2 * t)
        dynamicScale = THREE.MathUtils.lerp(heroScale, wearScale, smoothT)
      } else if (p <= 0.82) {
        // Align, Slide, Settle & 360° Orbit: Exact snug anatomical fit on the ring finger (zero clipping)
        dynamicScale = wearScale
      } else if (p <= 0.92) {
        // Sacred Release & Celestial Flight: Expands back into space as hero jewel
        const t = (p - 0.82) / 0.10
        const smoothT = t * t * (3 - 2 * t)
        dynamicScale = THREE.MathUtils.lerp(wearScale, heroScale * 0.90, smoothT)
      } else {
        // Climax & Carousel descent
        dynamicScale = heroScale * 0.90
      }

      ringRootRef.current.scale.setScalar(dynamicScale * introScale)
      ringRootRef.current.position.lerp(ringTargetPos, ringLerp)
      ringRootRef.current.quaternion.slerp(ringTargetQuat, ringLerp)
    }

    // Update Ring Motion Group (Tactile bounded inspection in Chapter 09)
    if (ringMotionGroupRef.current) {
      if (p >= 0.945 && p <= 0.998) {
        ringMotionGroupRef.current.rotation.set(userRotRef.current.x, userRotRef.current.y, 0)
      } else {
        ringMotionGroupRef.current.rotation.set(0, 0, 0)
      }
    }

    // Update Ring Idle Group (Component 09: The Breathing Rule)
    if (ringIdleGroupRef.current) {
      // During active tactile slide & 360° worn orbit, zero out idle wobble relative to the finger
      const isSlideOrOrbit = (p >= 0.62 && p <= 0.78) || isWornSpin
      const idleIntensity = isSlideOrOrbit ? 0.0 : 1.0

      const ringIdleY = Math.sin(time * 0.75) * 0.005 * idleIntensity
      const ringIdleYaw = Math.sin(time * 0.42) * 0.0025 * idleIntensity
      const ringIdlePitch = Math.cos(time * 0.38) * 0.0018 * idleIntensity

      ringIdleGroupRef.current.position.set(0, ringIdleY, 0)
      ringIdleGroupRef.current.rotation.set(ringIdlePitch, ringIdleYaw, 0)
    }

    // Update Ring Materials Opacity & Depth
    const rOp = Math.max(0, Math.min(1, currentRingOpacity.current))
    clonedRingScene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh
        if (mesh.material) {
          const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
          mats.forEach((m) => {
            const mat = m as THREE.MeshStandardMaterial
            mat.opacity = rOp
            mat.visible = rOp > 0.005
            mat.depthWrite = rOp > 0.15
          })
        }
      }
    })

    // Update Hand Material Opacity & Depth (Writes depth to physically block diamond on palm side)
    const hOp = Math.max(0, Math.min(1, currentHandOpacity.current))
    clonedHandScene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh
        if (mesh.material) {
          const mat = mesh.material as THREE.MeshStandardMaterial
          mat.opacity = hOp
          mat.visible = hOp > 0.005
          mat.depthWrite = hOp > 0.15
        }
      }
    })

    // Update Lighting with Physical Inertia (Component 06)
    if (keyLightRef.current) {
      keyLightRef.current.intensity = dampScalar(
        keyLightRef.current.intensity,
        targetKeyIntensity,
        CINEMATIC_MASS.heavy,
        dt
      )
    }
    if (spotLightRef.current) {
      spotLightRef.current.intensity = dampScalar(
        spotLightRef.current.intensity,
        targetSpotIntensity,
        CINEMATIC_MASS.heavy,
        dt
      )
    }
    if (rimLightRef.current) {
      rimLightRef.current.intensity = dampScalar(
        rimLightRef.current.intensity,
        targetRimIntensity,
        CINEMATIC_MASS.heavy,
        dt
      )
    }
  })

  return (
    <>
      <ambientLight intensity={0.45} color="#201c18" />
      <directionalLight
        ref={keyLightRef}
        position={[4.5, 7.5, 6]}
        intensity={2.6}
        color="#fff2dc"
      />
      <spotLight
        ref={spotLightRef}
        position={[0.5, 7.0, 5.0]}
        intensity={2.8}
        color="#ffffff"
        angle={0.6}
        penumbra={0.85}
        distance={28}
      />
      {/* Warm fill from below — simulates ground bounce on skin */}
      <directionalLight position={[-6, -2, 4]} intensity={0.75} color="#f2e7d5" />
      {/* Warm subsurface back-light — simulates light transmission through skin tissue */}
      <pointLight position={[0.5, -1.5, -3.5]} intensity={1.1} color="#ff9966" distance={12} decay={2} />
      <spotLight
        ref={rimLightRef}
        position={[0, 6, -7]}
        intensity={2.6}
        color="#ddeeff"
        angle={0.8}
        penumbra={0.9}
      />
      <Environment preset="studio" environmentIntensity={1.25} />

      {/* =====================================================================
          3D HAND: ScrollTransformGroup -> MotionTransformGroup -> IdleTransformGroup
          renderOrder=2: hand skin renders AFTER ring metal (order=1) but BEFORE diamond (order=3).
          This ensures the hand's opaque skin fragments write to the depth buffer before the
          transmissive diamond is tested, causing natural physical occlusion on the palm side.
          ===================================================================== */}
      <group ref={handRootRef} position={[HAND_CALIBRATION.HAND_BASE_X_DESKTOP, -12.58 * HAND_CALIBRATION.SCALE, -0.2]} scale={HAND_CALIBRATION.SCALE} renderOrder={2}>
        <group ref={handMotionGroupRef}>
          <group ref={handIdleGroupRef}>
            <primitive object={clonedHandScene} position={[0, 0, 0]} />
          </group>
        </group>
      </group>

      {/* =====================================================================
          3D RING: ScrollTransformGroup -> MotionTransformGroup -> IdleTransformGroup
          ===================================================================== */}
      <group ref={ringRootRef} scale={HAND_CALIBRATION.RING_PHYSICAL_SCALE}>
        <group ref={ringMotionGroupRef}>
          <group ref={ringIdleGroupRef}>
            <primitive object={clonedRingScene} />
          </group>
        </group>
      </group>
    </>
  )
}

export default function RingCanvas({
  progress = 0,
  materialType = 'platinum',
  onDragStateChange,
  heroIntroReady = false,
}: RingCanvasProps) {
  const userRotRef = useRef({ x: 0, y: 0 })
  const velocityRef = useRef({ x: 0, y: 0 })
  const isDraggingRef = useRef(false)
  const lastPointerRef = useRef({ x: 0, y: 0 })
  const [isCursorGrabbing, setIsCursorGrabbing] = useState(false)
  const lastProgressRef = useRef(progress)

  // Scrolling immediately takes priority over tactile drag
  useEffect(() => {
    const diff = Math.abs(progress - lastProgressRef.current)
    if (diff > 0.002) {
      if (isDraggingRef.current) {
        isDraggingRef.current = false
        setIsCursorGrabbing(false)
        onDragStateChange?.(false)
      }
      userRotRef.current.x *= 0.82
      userRotRef.current.y *= 0.82
      velocityRef.current.x = 0
      velocityRef.current.y = 0
    }
    lastProgressRef.current = progress
  }, [progress, onDragStateChange])

  // Smooth return damping when inspection ends
  useEffect(() => {
    let animId: number
    const tick = () => {
      if (!isDraggingRef.current) {
        userRotRef.current.x += velocityRef.current.x
        userRotRef.current.y += velocityRef.current.y
        velocityRef.current.x *= 0.88
        velocityRef.current.y *= 0.88

        // Smoothly spring back to 0 (hero orientation)
        userRotRef.current.x *= 0.94
        userRotRef.current.y *= 0.94
      }
      animId = requestAnimationFrame(tick)
    }
    animId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(animId)
  }, [])

  // Bounded luxury inspection is active throughout Chapter 09 The Threshold
  const canDrag = progress >= 0.945 && progress <= 0.998

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!canDrag) return

    isDraggingRef.current = true
    setIsCursorGrabbing(true)
    lastPointerRef.current = { x: e.clientX, y: e.clientY }
    velocityRef.current = { x: 0, y: 0 }
    onDragStateChange?.(true)
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current || !canDrag) return
    const dx = e.clientX - lastPointerRef.current.x
    const dy = e.clientY - lastPointerRef.current.y
    lastPointerRef.current = { x: e.clientX, y: e.clientY }

    const speedX = dy * 0.0025
    const speedY = dx * 0.0035

    // Bounded Luxury Inspection:
    // Horizontal rotation limited to approximately ±45°
    // Vertical rotation limited to approximately ±15°
    userRotRef.current.x = Math.max(
      -HAND_CALIBRATION.BOUNDED_PITCH_MAX,
      Math.min(HAND_CALIBRATION.BOUNDED_PITCH_MAX, userRotRef.current.x + speedX)
    )
    userRotRef.current.y = Math.max(
      -HAND_CALIBRATION.BOUNDED_YAW_MAX,
      Math.min(HAND_CALIBRATION.BOUNDED_YAW_MAX, userRotRef.current.y + speedY)
    )
    velocityRef.current = { x: speedX * 0.4, y: speedY * 0.4 }
  }

  const handlePointerUp = () => {
    if (isDraggingRef.current) {
      isDraggingRef.current = false
      setIsCursorGrabbing(false)
      onDragStateChange?.(false)
    }
  }

  return (
    <div
      className={`signature-canvas-fullscreen ${
        canDrag ? (isCursorGrabbing ? 'is-grabbing' : 'is-grabbable') : ''
      }`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      style={{ touchAction: canDrag ? 'pan-y' : 'auto' }}
    >
      <Canvas
        camera={{ position: [0, 0.18, 1.40], fov: 28 }}
        dpr={[1, 1.5]}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance',
        }}
      >
        <Suspense fallback={null}>
          <CinematicScene
            progress={progress}
            materialType={materialType}
            userRotRef={userRotRef}
            heroIntroReady={heroIntroReady}
          />
        </Suspense>
      </Canvas>
    </div>
  )
}
