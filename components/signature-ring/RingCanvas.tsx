'use client'

import React, { Suspense, useRef, useMemo, useState, useEffect } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js'
import StudioEnvironment from '@/lib/StudioEnvironment'
import gsap from 'gsap'
import { CINEMATIC_MASS, dampScalar, dampVector3, sacredSlidePhysics, sacredUnthreadPhysics } from '@/lib/cinematic-motion'

export type RingMaterialType = 'champagne-gold' | 'platinum' | 'yellow-gold' | 'rose-gold'

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
  velocityRef,
  heroIntroReady = false,
}: {
  progress: number
  materialType?: RingMaterialType
  userRotRef: React.MutableRefObject<{ x: number; y: number }>
  velocityRef?: React.MutableRefObject<{ x: number; y: number }>
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

  // Physical mass damping state buffers (guaranteeing zero snapping or velocity spikes)
  const currentRingPos = useRef(new THREE.Vector3(0.18, 0, 0))
  const currentRingQuat = useRef(new THREE.Quaternion())
  const currentRingScale = useRef(HAND_CALIBRATION.HERO_RING_SCALE)
  const currentHandPos = useRef(new THREE.Vector3(HAND_CALIBRATION.HAND_BASE_X_DESKTOP, -10.0, -0.20))
  const currentHandQuat = useRef(new THREE.Quaternion().setFromEuler(new THREE.Euler(0.10, Math.PI - 0.15, -0.05, 'XYZ')))
  const isSceneInitialized = useRef(false)

  const { size } = useThree()

  // 3D continuous spline tracing the true curved centerline of the ring finger
  const slideCurve = useMemo(() => {
    const pts = HAND_CALIBRATION.FINGER_SPLINE_POINTS.map(
      ([x, y, z]) => new THREE.Vector3(x, y, z)
    )
    return new THREE.CatmullRomCurve3(pts, false, 'centripetal', 0.5)
  }, [])

  // Configure high-luxury PBR materials for the ring (Restoring classic Two-Tone 18K Gold & Sparkling Diamond architecture)
  useEffect(() => {
    clonedRingScene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh
        if (mesh.material) {
          const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
          mats.forEach((m) => {
            const mat = m as THREE.MeshStandardMaterial
            const matName = (mat.name || '').toLowerCase()
            const meshName = (mesh.name || '').toLowerCase()

            const isDiamond =
              matName.includes('material_2') ||
              matName.includes('diamond') ||
              meshName.includes('dobj') ||
              meshName.startsWith('dmesh')

            const isMilgrain =
              meshName.includes('circle006_1') ||
              matName.includes('white gold 2')

            const isProng =
              meshName.includes('prong') ||
              meshName.includes('circle001') ||
              meshName.includes('circle002')

            // Hardware depth layering: metal band is order 1, diamond is order 3
            mesh.renderOrder = isDiamond ? 3 : 1

            if (isDiamond) {
              // Scintillating diamond facet refraction & pristine specular brilliance (Matches Hero & Opening)
              mat.metalness = 0.02
              mat.roughness = 0.006
              mat.color = new THREE.Color('#ffffff')
              mat.emissive = new THREE.Color('#000000')
              mat.envMapIntensity = 2.6
              mat.depthWrite = true
              mat.depthTest = true
              mat.transparent = false
            } else if (isMilgrain) {
              // Central fluted / ribbed milgrain equator channel: Deep burnished antique gold with rich contrast
              if (materialType === 'platinum') {
                mat.color = new THREE.Color('#1e2024')
                mat.emissive = new THREE.Color('#0a0c0e')
                mat.metalness = 0.96
                mat.roughness = 0.22
                mat.envMapIntensity = 2.2
              } else if (materialType === 'yellow-gold') {
                mat.color = new THREE.Color('#b08828')
                mat.emissive = new THREE.Color('#1c1304')
                mat.metalness = 0.94
                mat.roughness = 0.24
                mat.envMapIntensity = 1.8
              } else if (materialType === 'rose-gold') {
                mat.color = new THREE.Color('#8c5040')
                mat.emissive = new THREE.Color('#1a0806')
                mat.metalness = 0.94
                mat.roughness = 0.24
                mat.envMapIntensity = 1.8
              } else {
                // Classic Iconic Two-Tone: Deep burnished 18K antique gold channel
                mat.color = new THREE.Color('#b89344')
                mat.emissive = new THREE.Color('#1c1304')
                mat.metalness = 0.94
                mat.roughness = 0.26
                mat.envMapIntensity = 1.6
              }
              mat.depthWrite = true
              mat.depthTest = true
              mat.transparent = false
            } else if (isProng) {
              // Pavé prong tracks & diamond crown prongs: Polished 18K White Gold / Platinum contrast
              mat.color = new THREE.Color(materialType === 'platinum' ? '#f5f4f0' : '#ebe7de')
              mat.metalness = 0.97
              mat.roughness = 0.10
              mat.emissive = new THREE.Color('#000000')
              mat.envMapIntensity = 2.2
              mat.depthWrite = true
              mat.depthTest = true
              mat.transparent = false
            } else {
              // Main ring band chassis & outer framing rims: High-polished 18K Champagne / Royal Gold
              if (materialType === 'platinum') {
                mat.color = new THREE.Color('#e2e6ec')
                mat.metalness = 0.98
                mat.roughness = 0.10
                mat.envMapIntensity = 2.8
              } else if (materialType === 'yellow-gold') {
                mat.color = new THREE.Color('#e8bf4c')
                mat.metalness = 0.96
                mat.roughness = 0.11
                mat.envMapIntensity = 2.4
              } else if (materialType === 'rose-gold') {
                mat.color = new THREE.Color('#e8b59e')
                mat.metalness = 0.96
                mat.roughness = 0.11
                mat.envMapIntensity = 2.4
              } else {
                // Classic Iconic Two-Tone: High-polished 18K Champagne / Royal Gold
                mat.color = new THREE.Color('#cfa856')
                mat.metalness = 0.96
                mat.roughness = 0.12
                mat.envMapIntensity = 2.0
              }
              mat.emissive = new THREE.Color('#000000')
              mat.depthWrite = true
              mat.depthTest = true
              mat.transparent = false
            }
            mat.needsUpdate = true
          })
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

  // Post-loader Hero Entrance Animation tracking — defaults to 1 so ring is immediately ready and visible
  const introAnim = useRef({ progress: 1 })
  useEffect(() => {
    if (heroIntroReady) {
      introAnim.current.progress = 1
    }
  }, [heroIntroReady])

  const isMobile = size.width < 768
  const handScale = isMobile ? HAND_CALIBRATION.SCALE_MOBILE : HAND_CALIBRATION.SCALE
  const handBaseX = isMobile ? HAND_CALIBRATION.HAND_BASE_X_MOBILE : HAND_CALIBRATION.HAND_BASE_X_DESKTOP

  // Precomputed resting wear anchor points for 360° hand rotation around stationary ring
  const restHandBasePos = useMemo(
    () => new THREE.Vector3(handBaseX, -12.58 * handScale, -0.20),
    [handBaseX, handScale]
  )
  const restHandQuat = useMemo(
    () => new THREE.Quaternion().setFromEuler(new THREE.Euler(0.10, Math.PI - 0.15, -0.05, 'XYZ')),
    []
  )
  const fixedWearWorldPos = useMemo(() => {
    const localP = slideCurve.getPoint(1.0)
    const offset = localP.clone().multiplyScalar(handScale).applyQuaternion(restHandQuat)
    return restHandBasePos.clone().add(offset)
  }, [restHandBasePos, restHandQuat, handScale, slideCurve])
  const fixedFingerWorldTan = useMemo(() => {
    const localT = slideCurve.getTangent(1.0).normalize()
    return localT.clone().applyQuaternion(restHandQuat).normalize()
  }, [restHandQuat, slideCurve])
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
  const fixedWearWorldQuatInv = useMemo(() => {
    return fixedWearWorldQuat.clone().invert()
  }, [fixedWearWorldQuat])
  const handToWearOffset = useMemo(() => {
    return restHandBasePos.clone().sub(fixedWearWorldPos)
  }, [restHandBasePos, fixedWearWorldPos])
  const spinFromRingQuat = useMemo(() => new THREE.Quaternion(), [])
  const tempOffset = useMemo(() => new THREE.Vector3(), [])
  const tempSpinQuat = useMemo(() => new THREE.Quaternion(), [])
  const flightOriginPos = useMemo(() => new THREE.Vector3(), [])
  const flightOriginQuat = useMemo(() => new THREE.Quaternion(), [])

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05)
    const p = Math.max(0, Math.min(1, progress))
    const time = state.clock.getElapsedTime()

    // Inertia decay & damping for tactile dragging (releases smoothly when user lets go)
    const isInteractiveDrag = (p >= 0.765 && p <= 0.835) || (p >= 0.960 && p <= 0.998)
    if (velocityRef) {
      if (isInteractiveDrag) {
        if (Math.abs(velocityRef.current.y) > 0.00003 || Math.abs(velocityRef.current.x) > 0.00003) {
          userRotRef.current.y += velocityRef.current.y
          userRotRef.current.x += velocityRef.current.x
          if (p <= 0.835) {
            userRotRef.current.x = Math.max(-0.28, Math.min(0.28, userRotRef.current.x))
          }
          velocityRef.current.y *= 0.92
          velocityRef.current.x *= 0.92
        }
      } else {
        // Gracefully restore manual rotation when outside interactive chapters
        userRotRef.current.x = dampScalar(userRotRef.current.x, 0, 24.0, dt)
        userRotRef.current.y = dampScalar(userRotRef.current.y, 0, 24.0, dt)
        velocityRef.current.x = 0
        velocityRef.current.y = 0
      }
    }

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
    let curHandBaseX = restingHandBaseX
    let handBaseY = restingHandBaseY
    let handBaseZ = -0.20
    let handRotX = 0.10
    let handRotY = Math.PI - 0.15 // Dorsal (back-of-hand) faces camera — flipped 180° from palm
    let handRotZ = -0.05

    if (p < 0.34) {
      targetHandOpacity = 0.0
      handBaseY = -10.0 // submerged far off screen
    } else if (p < 0.46) {
      // 0.34 -> 0.46: HAND EMERGES VIA PLATINUM RIM LIGHT SILHOUETTE (smooth 12% scroll window)
      const t = (p - 0.34) / 0.12
      const smoothT = t * t * (3 - 2 * t)
      targetHandOpacity = smoothT
      handBaseY = THREE.MathUtils.lerp(-7.5, restingHandBaseY, smoothT)
    } else if (p < 0.77) {
      // 0.46 -> 0.77: HAND FULLY PRESENT — stable dorsal pose during entire wearing sequence
      targetHandOpacity = 1.0
      handBaseY = restingHandBaseY
    } else if (p < 0.83) {
      // 0.77 -> 0.83: Ring worn on finger — 360° hand presentation showcase
      targetHandOpacity = 1.0
      handBaseY = restingHandBaseY
      handRotY = Math.PI - 0.15 // Dorsal facing camera
      handRotX = 0.10
      handRotZ = -0.05
    } else if (p < 0.890) {
      // 0.83 -> 0.890: THE SACRED UNTHREADING (Ring unthreads backward from finger base to tip & enters flight)
      // The hand remains rock solid at restingHandBaseY so the finger doesn't sink while ring is sliding!
      targetHandOpacity = 1.0
      handBaseY = restingHandBaseY
      handRotY = Math.PI - 0.15
      handRotX = 0.10
      handRotZ = -0.05
    } else if (p < 0.940) {
      // 0.890 -> 0.940: Ring has cleared fingertip and entered flight!
      // Hand now gently lowers and dissolves into the darkness
      const t = (p - 0.890) / 0.050
      const smoothT = t * t * (3 - 2 * t)
      targetHandOpacity = Math.max(0, 1.0 - smoothT)
      handBaseY = THREE.MathUtils.lerp(restingHandBaseY, -10.0, smoothT)
    } else {
      // 0.940 -> 1.00: Hand completely lowered and hidden
      targetHandOpacity = 0.0
      handBaseY = -10.0
    }

    const isWornSpin = p >= 0.77 && p <= 0.83
    // Hand remains steady and calm during approach, slide, 360 showcase, and unthreading!
    const isHandSteady = p >= 0.64 && p <= 0.890
    const currentElevation = isHandSteady ? 0 : wristElevation
    const currentTiltX = isHandSteady ? 0 : wristTiltX
    const currentTiltZ = isHandSteady ? 0 : wristTiltZ

    // Outside the 360° showcase, hand follows standard resting pose & scroll emergence
    // Silky-smooth responsive damping ensures zero jerks when entering/exiting 360° spin or unthreading
    if (!isWornSpin) {
      const targetHandPos = scratchVecA.set(curHandBaseX, handBaseY, handBaseZ)
      const handLambda = (p >= 0.83 && p <= 0.90) ? 24.0 : 8.5
      dampVector3(currentHandPos.current, targetHandPos, handLambda, dt)
      currentHandQuat.current.slerp(restHandQuat, 1.0 - Math.exp(-handLambda * dt))

      if (handRootRef.current) {
        handRootRef.current.position.copy(currentHandPos.current)
        handRootRef.current.quaternion.copy(currentHandQuat.current)
        handRootRef.current.scale.setScalar(handScale)
        handRootRef.current.visible = targetHandOpacity > 0.005
        handRootRef.current.updateMatrixWorld(true)
      }
    }

    // Hand Idle Group: pure micro-breathing & natural wrist elevation
    if (handIdleGroupRef.current) {
      handIdleGroupRef.current.position.set(0, currentElevation, 0)
      handIdleGroupRef.current.rotation.set(currentTiltX, 0, currentTiltZ)
      handIdleGroupRef.current.scale.setScalar(isHandSteady ? 1.0 : breathingScale)
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

    if (p <= 0.20) {
      // 00.00 – 00.20: STATE 01 — RING HERO (Horizontal architectural presentation: diamond solitaire & whole band)
      const t = p / 0.20
      targetCamPos.set(0, isMobile ? 0.08 : 0.18, isMobile ? 2.85 : 1.72)
      targetLookAt.set(0, isMobile ? -0.02 : 0.04, 0)

      if (p <= 0.14) {
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
        const centerT = (p - 0.14) / 0.06
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

      targetRingOpacity = 1.0
      targetKeyIntensity = 2.4
      targetSpotIntensity = 2.6
      targetRimIntensity = 2.0
    } else if (p <= 0.34) {
      // 00.20 – 00.34: RING ANATOMY / ARCHITECTURE (Horizontal centered inspection)
      const t = (p - 0.20) / 0.14
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
    } else if (p <= 0.46) {
      // 00.34 – 00.46: DARKNESS CHANGES & ASCENT (Camera pulls back smoothly to full hand)
      // Generous 12% scroll window eliminates any sudden upward velocity spike!
      const t = (p - 0.34) / 0.12
      const smoothT = t * t * (3 - 2 * t)
      const camZ = isMobile ? 8.5 : HAND_CALIBRATION.HAND_CAM_Z_FULL
      targetCamPos.set(
        0.0,
        THREE.MathUtils.lerp(0.18, HAND_CALIBRATION.HAND_FRAME_LOOK_CENTER[1], smoothT),
        THREE.MathUtils.lerp(isMobile ? 2.85 : 1.75, camZ, smoothT)
      )
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
      targetKeyIntensity = THREE.MathUtils.lerp(2.4, 1.4, smoothT)
      targetRimIntensity = THREE.MathUtils.lerp(2.0, 2.4, smoothT)
    } else if (p <= 0.56) {
      // 00.46 – 00.56: HAND REVEALED IN WARM CHAMPAGNE LIGHT (Ring hovers weightlessly above hand)
      const t = (p - 0.46) / 0.10
      const camZ = isMobile ? 8.5 : HAND_CALIBRATION.HAND_CAM_Z_FULL
      targetCamPos.set(0.0, HAND_CALIBRATION.HAND_FRAME_LOOK_CENTER[1], camZ)
      targetLookAt.set(
        isMobile ? 0.0 : HAND_CALIBRATION.HAND_FRAME_LOOK_CENTER[0],
        HAND_CALIBRATION.HAND_FRAME_LOOK_CENTER[1],
        HAND_CALIBRATION.HAND_FRAME_LOOK_CENTER[2]
      )
      ringTargetPos.copy(hoverWorldPos)
      ringTargetQuat.copy(hoverWorldQuat)
      targetRingOpacity = 1.0
      targetKeyIntensity = THREE.MathUtils.lerp(1.4, 1.8, t)
      targetRimIntensity = 2.4
    } else if (p <= 0.64) {
      // 00.56 – 00.64: THE GRACEFUL DESCENT (Ring glides softly toward fingertip)
      // Generous 8% scroll window eliminates sudden downward plunge!
      const t = (p - 0.56) / 0.08
      const smoothT = t * t * (3 - 2 * t)
      const u = smoothT * 0.30

      sampleSplineInWorld(u, ringTargetPos, ringTargetQuat)

      const camZStart = isMobile ? 8.5 : HAND_CALIBRATION.HAND_CAM_Z_FULL
      const camZEnd = isMobile ? 7.2 : 6.4
      targetCamPos.set(
        0.0,
        THREE.MathUtils.lerp(HAND_CALIBRATION.HAND_FRAME_LOOK_CENTER[1], wearWorldPos.y * 0.4, smoothT),
        THREE.MathUtils.lerp(camZStart, camZEnd, smoothT)
      )
      targetLookAt.set(
        isMobile ? 0.0 : THREE.MathUtils.lerp(HAND_CALIBRATION.HAND_FRAME_LOOK_CENTER[0], wearWorldPos.x - 0.12, smoothT),
        THREE.MathUtils.lerp(HAND_CALIBRATION.HAND_FRAME_LOOK_CENTER[1], wearWorldPos.y * 0.6, smoothT),
        0
      )
      targetRingOpacity = 1.0
      targetKeyIntensity = 1.8
      targetRimIntensity = 2.6
    } else if (p <= 0.68) {
      // 00.64 – 00.68: COAXIAL ALIGNMENT (Ring settles onto finger axis)
      const t = (p - 0.64) / 0.04
      const smoothT = t * t * (3 - 2 * t)

      sampleSplineInWorld(0.30, ringTargetPos, ringTargetQuat)

      const wobble = Math.sin((1.0 - smoothT) * Math.PI) * 0.06
      scratchEuler.set(wobble, 0, wobble * 0.5)
      scratchQuatA.setFromEuler(scratchEuler)
      ringTargetQuat.multiply(scratchQuatA)

      const camZAlign = isMobile ? 6.8 : 6.0
      targetCamPos.set(0.0, wearWorldPos.y * 0.45, camZAlign)
      targetLookAt.set(
        isMobile ? 0.0 : wearWorldPos.x - 0.12,
        wearWorldPos.y * 0.7,
        0
      )
      targetRingOpacity = 1.0
      targetKeyIntensity = 2.0
      targetSpotIntensity = 2.2
      targetRimIntensity = 2.6
    } else if (p <= 0.77) {
      // 00.68 – 00.77: THE SACRED SLIDE (Fluid continuous slide across knuckle)
      const t = (p - 0.68) / 0.09
      const slideFactor = sacredSlidePhysics(t)
      const u = THREE.MathUtils.lerp(0.30, 1.00, Math.min(1.0, slideFactor))

      sampleSplineInWorld(u, ringTargetPos, ringTargetQuat)

      const camZSlideStart = isMobile ? 6.8 : 6.0
      const camZSlide = isMobile ? 6.2 : THREE.MathUtils.lerp(camZSlideStart, HAND_CALIBRATION.HAND_CAM_Z_RING, Math.min(1.0, t * 1.2))
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
    } else if (p <= 0.83) {
      // 00.77 – 00.83: 360° LIVING SHOWCASE (Interactive & Scroll 360° Living Orbit)
      const t = (p - 0.77) / 0.06
      const smoothT = t * t * (3 - 2 * t)
      const scrollOrbitAngle = smoothT * Math.PI * 2

      // Combine user manual drag + scroll orbit
      // When approaching the end of chapter (smoothT > 0.88), gently taper drag offset into rest alignment
      const dragFade = smoothT > 0.88 ? 1.0 - (smoothT - 0.88) / 0.12 : 1.0
      const totalOrbitYaw = scrollOrbitAngle + userRotRef.current.y * dragFade
      const totalOrbitPitch = userRotRef.current.x * dragFade

      // Rotation around the ring wear pivot
      scratchEuler.set(totalOrbitPitch, totalOrbitYaw, 0, 'YXZ')
      tempSpinQuat.setFromEuler(scratchEuler)

      // Smoothly blend spin quat to absolute identity as 360° revolution completes to prevent angle discontinuity
      if (smoothT > 0.90) {
        const blendToRest = (smoothT - 0.90) / 0.10
        const smoothBlend = blendToRest * blendToRest * (3 - 2 * blendToRest)
        scratchQuatA.identity()
        tempSpinQuat.slerp(scratchQuatA, smoothBlend)
      }
      if (smoothT >= 0.999) {
        tempSpinQuat.identity()
      }

      // Ring stays anchored at the wear center, rotating with tempSpinQuat
      ringTargetPos.copy(fixedWearWorldPos)
      ringTargetQuat.multiplyQuaternions(tempSpinQuat, fixedWearWorldQuat)

      const camZ360 = isMobile ? 8.0 : 6.8
      targetCamPos.set(
        isMobile ? 0.0 : -0.10,
        THREE.MathUtils.lerp(wearWorldPos.y * 0.42, wearWorldPos.y * 0.38, smoothT),
        camZ360
      )
      targetLookAt.set(
        isMobile ? 0.0 : wearWorldPos.x * 0.5,
        wearWorldPos.y * 0.55,
        0
      )
      targetRingOpacity = 1.0
      targetKeyIntensity = 2.4
      targetSpotIntensity = 2.4
      targetRimIntensity = 3.0
    } else if (p <= 0.90) {
      // 00.83 – 00.90: THE SACRED UNTHREADING (Continuous anatomical unthreading from finger base into free space)
      const t = Math.max(0, Math.min(1, (p - 0.83) / 0.07))
      const u = sacredUnthreadPhysics(t)

      // 1. Sample exact continuous 3D finger spline trajectory
      sampleSplineInWorld(u, scratchVecA, scratchQuatA)

      const livingSpinRate = 0.85
      const livingSpin = time * livingSpinRate

      // Centered spatial flight destination at Chapter 08 entry (p = 0.90)
      const centerFlightX = isMobile ? 0.0 : 0.04
      const centerFlightY = 0.06 + Math.sin(time * 1.5) * 0.025
      const centerFlightZ = -0.06
      const targetSpatialPos = scratchVecB.set(centerFlightX, centerFlightY, centerFlightZ)

      // Target beauty presentation orientation at Chapter 08 entry (upright turntable)
      const totalYaw0 = livingSpin + userRotRef.current.y
      const pitch0 = 0.28 + Math.sin(totalYaw0) * 0.035 + Math.sin(time * 1.2) * 0.02 + userRotRef.current.x
      const roll0 = -Math.cos(totalYaw0) * 0.035
      scratchEuler.set(pitch0, totalYaw0, roll0, 'YXZ')
      scratchQuatB.setFromEuler(scratchEuler)

      // Fingertip is cleared at t ~ 0.65 (u ~ 0.31).
      // - For t <= 0.65: Ring is strictly guided along finger cylinder (100% coaxial alignment, zero skin clipping)
      // - For t > 0.65: Ring has cleared the fingertip! Generously and smoothly blends into center flight & upright 360° spin
      const clearanceThreshold = 0.65
      if (t <= clearanceThreshold) {
        ringTargetPos.copy(scratchVecA)
        ringTargetQuat.copy(scratchQuatA)
      } else {
        const blend = (t - clearanceThreshold) / (1.0 - clearanceThreshold)
        const smoothBlend = blend * blend * (3 - 2 * blend)
        ringTargetPos.lerpVectors(scratchVecA, targetSpatialPos, smoothBlend)
        ringTargetQuat.slerpQuaternions(scratchQuatA, scratchQuatB, smoothBlend)
      }

      const smoothT = t * t * (3 - 2 * t)

      // Cinematic crane camera: seamless continuation from Chapter 06 (camZ 6.8 -> 3.2)
      // Cranes softly upward and tracks the ring as it slips off the fingertip into space
      const camZStart = isMobile ? 8.0 : 6.8
      const camZEnd = isMobile ? 4.2 : 3.2
      const camZUnthread = THREE.MathUtils.lerp(camZStart, camZEnd, smoothT)

      targetCamPos.set(
        isMobile ? 0.0 : THREE.MathUtils.lerp(-0.10, 0.0, smoothT),
        THREE.MathUtils.lerp(wearWorldPos.y * 0.38, 0.16, smoothT),
        camZUnthread
      )
      targetLookAt.set(
        isMobile ? 0.0 : THREE.MathUtils.lerp(wearWorldPos.x * 0.5, 0.04, smoothT),
        THREE.MathUtils.lerp(wearWorldPos.y * 0.55, 0.06, smoothT),
        0
      )
      targetRingOpacity = 1.0
      targetKeyIntensity = 2.8
      targetSpotIntensity = 2.8
      targetRimIntensity = 3.2
    } else if (p <= 0.96) {
      // 00.90 – 00.96: THE CELESTIAL TRAVELING FLIGHT (360° Continuous Living Turntable & Spatial Flight)
      const t = (p - 0.90) / 0.06
      const smoothT = t * t * (3 - 2 * t)

      const livingSpinRate = 0.85
      const livingSpin = time * livingSpinRate

      // Centered spatial station with weightless zero-g levitation bob
      const flightTargetX = isMobile ? 0.0 : 0.04
      const flightTargetY = 0.06 + Math.sin(time * 1.5) * 0.025
      const flightTargetZ = -0.06

      ringTargetPos.set(flightTargetX, flightTargetY, flightTargetZ)

      // FULL 360° CONTINUOUS ROTATION:
      // 1. Continuous living spin (keeps rotating smoothly 360° even when scrolling stops)
      // 2. Full 360° scroll-driven revolution across Chapter 08
      // 3. Tactile 360° user drag rotation with inertial physics momentum
      const scrollSpin = smoothT * Math.PI * 2
      const totalYaw = livingSpin + scrollSpin + userRotRef.current.y

      // Upright luxury presentation angle: diamond crown proudly elevated,
      // subtle organic zero-g breathing pitch & roll synchronized to 360° yaw
      const flightPitch = 0.28 + Math.sin(totalYaw) * 0.035 + Math.sin(time * 1.2) * 0.02 + userRotRef.current.x
      const flightRoll = -Math.cos(totalYaw) * 0.035

      scratchEuler.set(flightPitch, totalYaw, flightRoll, 'YXZ')
      ringTargetQuat.setFromEuler(scratchEuler)

      const camZFlight = THREE.MathUtils.lerp(
        isMobile ? 4.2 : 3.2,
        isMobile ? 3.6 : 2.85,
        smoothT
      )
      targetCamPos.set(
        0.0,
        0.16,
        camZFlight
      )
      targetLookAt.set(isMobile ? 0.0 : 0.04, 0.06, 0.0)

      targetRingOpacity = 1.0
      targetKeyIntensity = 3.8
      targetSpotIntensity = 3.8
      targetRimIntensity = 4.2
    } else {
      // 00.96 – 01.00: THE THRESHOLD & HIGH LUXURY BEAUTY SHOWCASE (Continues 360° Showcase until Carousel)
      const t = (p - 0.96) / 0.04
      const smoothT = Math.min(1.0, Math.max(0, t))
      const smoothTQuad = smoothT * smoothT * (3 - 2 * smoothT)

      const livingSpinRate = 0.85
      const livingSpin = time * livingSpinRate

      const heroX = isMobile ? 0.0 : 0.04
      const heroY = THREE.MathUtils.lerp(0.06, 0.04, smoothTQuad) + Math.sin(time * 1.4) * 0.015
      const heroZ = THREE.MathUtils.lerp(-0.06, -0.08, smoothTQuad)

      ringTargetPos.set(heroX, heroY, heroZ)

      // Seamless continuation of 360° spin into threshold before material carousel
      const totalYaw9 = livingSpin + (Math.PI * 2) + (smoothTQuad * Math.PI) + userRotRef.current.y
      const heroPitch = 0.26 + Math.sin(totalYaw9) * 0.03 + userRotRef.current.x
      const heroRoll = -Math.cos(totalYaw9) * 0.03

      scratchEuler.set(heroPitch, totalYaw9, heroRoll, 'YXZ')
      ringTargetQuat.setFromEuler(scratchEuler)

      const camZMaster = THREE.MathUtils.lerp(isMobile ? 3.6 : 2.85, isMobile ? 3.4 : 2.75, smoothTQuad)
      targetCamPos.set(0.0, THREE.MathUtils.lerp(0.16, 0.20, smoothTQuad), camZMaster)
      targetLookAt.set(isMobile ? 0.0 : 0.04, 0.04, 0.0)

      targetRingOpacity = p > 0.994 ? THREE.MathUtils.lerp(1.0, 0.0, (p - 0.994) / 0.006) : 1.0
      targetKeyIntensity = THREE.MathUtils.lerp(3.8, 2.8, smoothTQuad)
      targetSpotIntensity = THREE.MathUtils.lerp(3.8, 2.6, smoothTQuad)
      targetRimIntensity = THREE.MathUtils.lerp(4.2, 3.0, smoothTQuad)
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

    // Dynamic scale calculation: macro during hero, snug on finger, heroic during flight
    const introScale = p <= 0.14 ? THREE.MathUtils.lerp(0.82, 1.0, introProgress) : 1.0
    const heroScale = isMobile ? HAND_CALIBRATION.HERO_RING_SCALE_MOBILE : HAND_CALIBRATION.HERO_RING_SCALE
    const wearScale = isMobile ? HAND_CALIBRATION.RING_PHYSICAL_SCALE_MOBILE : HAND_CALIBRATION.RING_PHYSICAL_SCALE

    let dynamicScale = heroScale
    if (p <= 0.34) {
      dynamicScale = heroScale
    } else if (p <= 0.64) {
      const t = (p - 0.34) / 0.30
      const smoothT = t * t * (3 - 2 * t)
      dynamicScale = THREE.MathUtils.lerp(heroScale, wearScale, smoothT)
    } else if (p <= 0.83) {
      dynamicScale = wearScale
    } else if (p <= 0.90) {
      // Unthreading from finger: maintain exact snug physical scale
      dynamicScale = wearScale
    } else if (p <= 0.96) {
      // Celestial flight: smoothly expand from wearScale to heroScale!
      const t = (p - 0.90) / 0.06
      const smoothT = t * t * (3 - 2 * t)
      dynamicScale = THREE.MathUtils.lerp(wearScale, heroScale, smoothT)
    } else {
      dynamicScale = heroScale
    }

    // Initialize physical state buffers on first frame to prevent startup pop
    if (!isSceneInitialized.current) {
      currentRingPos.current.copy(ringTargetPos)
      currentRingQuat.current.copy(ringTargetQuat)
      currentRingScale.current = dynamicScale * introScale
      currentHandPos.current.copy(restHandBasePos)
      isSceneInitialized.current = true
    }

    // Physical mass damping: frame-rate independent, eliminating sudden snaps or speed bursts
    // High-responsiveness touch tracking maintained throughout slide, 360 orbit, unthreading, and 360 spatial flight
    const isTouchTracking = p >= 0.68 && p <= 0.90
    const isInteractiveSpatial = p >= 0.898 && p <= 0.998
    const posLambda = isTouchTracking ? 24.0 : 8.5
    const rotLambda = (isTouchTracking || isInteractiveSpatial) ? 22.0 : 8.5

    // Apply inertia velocity to userRotRef and smoothly damp with physical deceleration
    if (velocityRef?.current) {
      userRotRef.current.x += velocityRef.current.x
      userRotRef.current.y += velocityRef.current.y
      velocityRef.current.x *= 0.92
      velocityRef.current.y *= 0.92
    }

    dampVector3(currentRingPos.current, ringTargetPos, posLambda, dt)

    const rotDamp = 1.0 - Math.exp(-rotLambda * dt)
    currentRingQuat.current.slerp(ringTargetQuat, rotDamp)

    currentRingScale.current = dampScalar(currentRingScale.current, dynamicScale * introScale, 8.0, dt)

    if (ringRootRef.current) {
      ringRootRef.current.visible = currentRingOpacity.current > 0.005
      ringRootRef.current.scale.setScalar(currentRingScale.current)
      ringRootRef.current.position.copy(currentRingPos.current)
      ringRootRef.current.quaternion.copy(currentRingQuat.current)
    }

    // Synchronize Hand during 360° showcase around the ring wear pivot
    if (isWornSpin) {
      // Extract exact spin orientation of the ring
      spinFromRingQuat.multiplyQuaternions(currentRingQuat.current, fixedWearWorldQuatInv)

      // Rigid body transformation: Hand Base revolves around currentRingPos
      currentHandPos.current
        .copy(currentRingPos.current)
        .add(tempOffset.copy(handToWearOffset).applyQuaternion(spinFromRingQuat))

      // Hand orientation matches the spin
      currentHandQuat.current.multiplyQuaternions(spinFromRingQuat, restHandQuat)

      if (handRootRef.current) {
        handRootRef.current.position.copy(currentHandPos.current)
        handRootRef.current.quaternion.copy(currentHandQuat.current)
        handRootRef.current.scale.setScalar(handScale)
        handRootRef.current.visible = currentHandOpacity.current > 0.005
        handRootRef.current.updateMatrixWorld(true)
      }
    }

    // Update Ring Motion Group (Tactile userRotRef is already integrated directly into ringTargetQuat)
    if (ringMotionGroupRef.current) {
      ringMotionGroupRef.current.rotation.set(0, 0, 0)
    }

    // Update Ring Idle Group (Component 09: The Breathing Rule)
    if (ringIdleGroupRef.current) {
      // During active tactile slide, 360° worn orbit & unthreading, zero out idle wobble relative to the finger
      const isSlideOrOrbit = p >= 0.64 && p <= 0.90
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
            mat.depthWrite = rOp > 0.85
            mat.transparent = rOp < 0.99
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
      <StudioEnvironment intensity={1.25} />

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
  materialType = 'champagne-gold',
  onDragStateChange,
  heroIntroReady = false,
}: RingCanvasProps) {
  const userRotRef = useRef({ x: 0, y: 0 })
  const velocityRef = useRef({ x: 0, y: 0 })
  const isDraggingRef = useRef(false)
  const lastPointerRef = useRef({ x: 0, y: 0 })
  const [isCursorGrabbing, setIsCursorGrabbing] = useState(false)
  const lastProgressRef = useRef(progress)

  // Scrolling takes priority when exiting interactive chapters
  useEffect(() => {
    const diff = Math.abs(progress - lastProgressRef.current)
    const isInsideWornChapter = progress >= 0.76 && progress <= 0.835
    const isInsideSpatialChapter = progress >= 0.898 && progress <= 0.998

    const thresholdDiff = (isInsideWornChapter || isInsideSpatialChapter) ? 0.025 : 0.002
    if (diff > thresholdDiff) {
      if (isDraggingRef.current) {
        isDraggingRef.current = false
        setIsCursorGrabbing(false)
        onDragStateChange?.(false)
      }
      if (!isInsideWornChapter && !isInsideSpatialChapter) {
        userRotRef.current.x *= 0.82
        userRotRef.current.y *= 0.82
        velocityRef.current.x = 0
        velocityRef.current.y = 0
      }
    }
    lastProgressRef.current = progress
  }, [progress, onDragStateChange])

  // Drag interaction is active for Chapter 06 (360° Hand+Ring Orbit) AND Chapter 08 & 09 (Spatial Flight & Threshold)
  const isWornOrbit = progress >= 0.765 && progress <= 0.835
  const isSpatialInspection = progress >= 0.898 && progress <= 0.998
  const canDrag = isWornOrbit || isSpatialInspection

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

    if (isWornOrbit) {
      // 360° Living Showcase: unconstrained continuous 360° rotation around the finger
      const speedY = dx * 0.0055
      const speedX = dy * 0.0028

      userRotRef.current.y += speedY
      userRotRef.current.x = Math.max(
        -0.28,
        Math.min(0.28, userRotRef.current.x + speedX)
      )
      velocityRef.current = { x: speedX * 0.35, y: speedY * 0.60 }
    } else if (isSpatialInspection) {
      // 360° Spatial Flight & Masterpiece Showcase: unconstrained continuous 360° turntable spin
      const speedY = dx * 0.0065
      const speedX = dy * 0.0030

      userRotRef.current.y += speedY
      userRotRef.current.x = Math.max(
        -0.45,
        Math.min(0.45, userRotRef.current.x + speedX)
      )
      velocityRef.current = { x: speedX * 0.35, y: speedY * 0.60 }
    }
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
        dpr={typeof window !== 'undefined' && window.innerWidth < 768 ? [1, 1.25] : [1, 1.5]}
        frameloop="always"
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
            velocityRef={velocityRef}
            heroIntroReady={heroIntroReady}
          />
        </Suspense>
      </Canvas>
    </div>
  )
}
