'use client'

import React, { useMemo, useRef, useState, useEffect, Suspense } from 'react'
import * as THREE from 'three'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import StudioEnvironment from '@/lib/StudioEnvironment'
import MaterialRing, { RingTransformState } from './MaterialRing'
import { PreciousMetal, PRECIOUS_METALS } from './glbMaterialClassifier'
import { materialStore, useMaterialStore } from './useMaterialStore'
import { CINEMATIC_MASS, dampScalar, dampVector3, dampColor } from '@/lib/cinematic-motion'

const MODEL_PATH = '/models/doji-diamond-ring.glb'
useGLTF.preload(MODEL_PATH)

interface MaterialRingSceneProps {
  progress: number
  onMetalChange?: (metal: PreciousMetal) => void
}

const METALS: PreciousMetal[] = ['platinum', 'yellow-gold', 'rose-gold', 'champagne-gold']

const METAL_COLORS: Record<PreciousMetal, { key: THREE.Color; rim: THREE.Color; ambient: THREE.Color }> = {
  platinum: {
    key: new THREE.Color(PRECIOUS_METALS.platinum.keyLightColor),
    rim: new THREE.Color(PRECIOUS_METALS.platinum.rimLightColor),
    ambient: new THREE.Color(PRECIOUS_METALS.platinum.ambientColor),
  },
  'yellow-gold': {
    key: new THREE.Color(PRECIOUS_METALS['yellow-gold'].keyLightColor),
    rim: new THREE.Color(PRECIOUS_METALS['yellow-gold'].rimLightColor),
    ambient: new THREE.Color(PRECIOUS_METALS['yellow-gold'].ambientColor),
  },
  'rose-gold': {
    key: new THREE.Color(PRECIOUS_METALS['rose-gold'].keyLightColor),
    rim: new THREE.Color(PRECIOUS_METALS['rose-gold'].rimLightColor),
    ambient: new THREE.Color(PRECIOUS_METALS['rose-gold'].ambientColor),
  },
  'champagne-gold': {
    key: new THREE.Color(PRECIOUS_METALS['champagne-gold'].keyLightColor),
    rim: new THREE.Color(PRECIOUS_METALS['champagne-gold'].rimLightColor),
    ambient: new THREE.Color(PRECIOUS_METALS['champagne-gold'].ambientColor),
  },
}

type InteractionMode = 'scroll' | 'drag' | 'click'

/**
 * SpatialJewelleryUniverse:
 * Renders all FOUR real 3D Doji Diamond Rings simultaneously in a sculptural
 * amphitheatre constellation orbit.
 *
 * At all times, multiple rings exist in perspective (Hero, Left Near, Right Near, Back Elevated).
 * The camera participates with lateral drift, dolly movement, and luxury parallax.
 */
function SpatialJewelleryUniverse({
  progress,
  onMetalChange,
  dragOffsetRef,
  interactionModeRef,
}: {
  progress: number
  onMetalChange?: (metal: PreciousMetal) => void
  dragOffsetRef: React.MutableRefObject<number>
  interactionModeRef: React.MutableRefObject<InteractionMode>
}) {
  const gltf = useGLTF(MODEL_PATH)
  const { size } = useThree()
  const isMobile = size.width < 768

  const { selectedMaterial } = useMaterialStore()

  // Studio light refs
  const keyLightRef = useRef<THREE.DirectionalLight>(null)
  const spotLightRef = useRef<THREE.SpotLight>(null)
  const rimLightRef = useRef<THREE.SpotLight>(null)
  const ambientLightRef = useRef<THREE.AmbientLight>(null)

  // Continuous carousel orbital angle
  const currentTheta = useRef(0)
  const targetTheta = useRef(0)
  const lastActiveMetal = useRef<PreciousMetal>('platinum')

  // Smooth camera position & lookAt buffers with physical inertia
  const currentCamPos = useRef(new THREE.Vector3(0, 0.28, 4.2))
  const targetCamPos = useRef(new THREE.Vector3(0, 0.28, 4.2))
  const currentLookAt = useRef(new THREE.Vector3(0, 0.08, 0))
  const targetLookAt = useRef(new THREE.Vector3(0, 0.08, 0))

  // Map scroll progress to target orbital angle with continuous silky-smooth Hermite interpolation:
  // 0.08 – 0.88: Continuous organic glide across Platinum -> Yellow Gold -> Rose Gold -> Champagne Gold
  // 0.88 – 0.96: Material Choice ("Yours, in your metal.")
  // 0.96 – 1.00: Smooth unpin continuity
  useEffect(() => {
    if (interactionModeRef.current === 'drag') return

    let targetIdx = 0
    if (progress < 0.08) {
      targetIdx = 0
    } else if (progress <= 0.88) {
      // Continuous smooth hermite spline across the 4 metals (0 -> 1 -> 2 -> 3)
      const pNorm = (progress - 0.08) / 0.80
      const rawStation = pNorm * 3
      const baseStation = Math.floor(rawStation)
      const fraction = rawStation - baseStation
      // Smooth hermite ease: natural deceleration at each station, smooth acceleration between
      const smoothFraction = fraction * fraction * (3 - 2 * fraction)
      targetIdx = Math.min(3, baseStation + smoothFraction)
    } else {
      // Material choice: hold on user's selected metal
      const selIdx = METALS.indexOf(selectedMaterial)
      targetIdx = selIdx !== -1 ? selIdx : 3
    }

    targetTheta.current = -targetIdx * (Math.PI / 2)
  }, [progress, selectedMaterial, interactionModeRef])

  // When user selects a material via UI or 3D click, animate smoothly to that metal
  useEffect(() => {
    const idx = METALS.indexOf(selectedMaterial)
    if (idx !== -1) {
      interactionModeRef.current = 'click'
      const current = targetTheta.current
      const baseTarget = -idx * (Math.PI / 2)
      const diff = Math.round((current - baseTarget) / (2 * Math.PI))
      targetTheta.current = baseTarget + diff * (2 * Math.PI)
    }
  }, [selectedMaterial, interactionModeRef])

  // Spatial Orbital Dimensions:
  // Wide amphitheatre layout where Left, Right, and Back Elevated rings are visible with heroic presence
  const Rx = isMobile ? 1.85 : 2.65 // Horizontal orbital radius
  const Rz = 1.30 // Depth radius
  const Z_CENTER = -0.85 // Orbit center in world space
  const FRONT_SCALE = isMobile ? 2.5 : 3.35 // Hero ring commanding luxury scale
  const BACK_SCALE = isMobile ? 1.35 : 1.65 // Distant ring scale

  // Pre-allocated ring states buffer to avoid GC pauses with individual visibility and opacity
  const ringStates = useMemo<RingTransformState[]>(() => {
    return METALS.map((_, i) => ({
      pos: [0, 0, 0],
      rot: [0.26, 0.42, -0.05],
      scale: FRONT_SCALE,
      opacity: 1.0,
      visible: true,
      isFocused: i === 0,
    }))
  }, [FRONT_SCALE])

  const [, setActiveState] = useState<PreciousMetal>('platinum')

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05)
    const isMobile = state.size.width < 768

    // 1. Smoothly damp carousel angle toward target + drag with luxury sculpture inertia (Component 07)
    const target = targetTheta.current + dragOffsetRef.current
    currentTheta.current = dampScalar(
      currentTheta.current,
      target,
      CINEMATIC_MASS.heavy,
      dt
    )

    const theta = currentTheta.current

    // 2. Timeline Phase Factors:
    // Arrival: progress in [0, 0.12]
    // Constellation emergence: progress in [0.08, 0.24]
    // Material choice constellation: progress in [0.90, 0.96]
    // Continuity exit: progress in [0.96, 1.00]
    const emergenceFactor =
      progress <= 0.08
        ? 0.0
        : progress >= 0.24
        ? 1.0
        : THREE.MathUtils.smoothstep(progress, 0.08, 0.24)

    const choiceFactor =
      progress < 0.90
        ? 0.0
        : progress > 0.96
        ? 1.0
        : THREE.MathUtils.smoothstep(progress, 0.90, 0.96)

    const exitFactor =
      progress < 0.96
        ? 0.0
        : THREE.MathUtils.smoothstep(progress, 0.96, 1.0)

    // Dynamic radius: wider in arrival and choice stages
    const currRx = THREE.MathUtils.lerp(
      Rx * 1.35,
      Rx * THREE.MathUtils.lerp(1.0, 1.15, choiceFactor),
      emergenceFactor
    )
    const currRz = THREE.MathUtils.lerp(
      Rz * 1.35,
      Rz * THREE.MathUtils.lerp(1.0, 1.10, choiceFactor),
      emergenceFactor
    )

    // 3. Compute 3D transforms for all 4 rings simultaneously in physical space
    // Ring 0 (Platinum) arrives seamlessly from incoming flight trajectory
    // Rings 1, 2, 3 blossom out in a prismatic radial bloom from behind the hero ring
    const arrivalT = THREE.MathUtils.smoothstep(progress, 0.0, 0.18)
    const constellationBloom = THREE.MathUtils.smoothstep(progress, 0.08, 0.24)

    let maxCos = -999
    let closestIdx = 0

    METALS.forEach((metal, i) => {
      const angle = theta + i * (Math.PI / 2)
      const cosVal = Math.cos(angle)
      const sinVal = Math.sin(angle)

      if (cosVal > maxCos) {
        maxCos = cosVal
        closestIdx = i
      }

      // Depth factor: 1.0 = front hero, 0.0 = deep background
      const depthFactor = (cosVal + 1) / 2

      // Base physical coordinates on 3D curved elliptical orbit
      const baseOrbitX = sinVal * currRx
      const baseOrbitZ = cosVal * currRz + Z_CENTER
      const baseOrbitY = THREE.MathUtils.lerp(0.36, 0.04, depthFactor)
      const baseOrbitScale = THREE.MathUtils.lerp(BACK_SCALE, FRONT_SCALE, depthFactor)
      const baseOrbitOp = THREE.MathUtils.lerp(0.50, 1.0, depthFactor)

      let x = baseOrbitX
      let y = baseOrbitY
      let z = baseOrbitZ
      let s = baseOrbitScale
      let op = baseOrbitOp
      let isVisible = true

      if (i === 0) {
        // RING 0 (PLATINUM — THE HERO RING THAT JUST TRAVELED FROM SIGNATURE SECTION):
        // Always safely framed within the canvas viewport — ZERO clipping at top boundary!
        if (progress < 0.22) {
          z = THREE.MathUtils.lerp(baseOrbitZ + 0.06, baseOrbitZ, arrivalT)
          y = THREE.MathUtils.lerp(baseOrbitY + 0.02, baseOrbitY, arrivalT)
          op = THREE.MathUtils.lerp(0.90, 1.0, arrivalT)
          s = FRONT_SCALE
          isVisible = true
        } else {
          // Post-arrival: Ring 0 joins orbital rotation naturally
          x = baseOrbitX
          y = baseOrbitY
          z = baseOrbitZ
          s = baseOrbitScale
          op = baseOrbitOp
          isVisible = true
        }
      } else {
        // RINGS 1, 2, 3 (YELLOW GOLD, ROSE GOLD, CHAMPAGNE GOLD):
        // Fade in gracefully at their respective orbital stations (never converging to center X=0)
        x = baseOrbitX
        z = baseOrbitZ
        y = baseOrbitY
        s = baseOrbitScale
        op = THREE.MathUtils.lerp(0.0, baseOrbitOp, constellationBloom)
        isVisible = constellationBloom > 0.08 && op > 0.05
      }

      // ━━━ REAR SIGHTLINE REFINEMENT ━━━
      // Smooth continuous depth fading — ZERO sudden popping or disappearing rings
      if (depthFactor < 0.58) {
        const corridorLimit = isMobile ? 0.75 : 0.95
        const edgeFade = THREE.MathUtils.smoothstep(Math.abs(x), corridorLimit * 0.35, corridorLimit + 0.55)
        op *= edgeFade
        if (op <= 0.01) {
          isVisible = false
          op = 0.0
        }
      }

      // During arrival phase (progress < 0.12), non-hero rings are hidden
      if (progress < 0.12 && i !== 0) {
        isVisible = false
        op = 0.0
      }

      // In exit phase (progress > 0.96): dissolve non-hero rings, while keeping hero ring gracefully softly visible
      // into Atelier so there is never an awkward pitch-black empty void
      if (exitFactor > 0.001) {
        if (i !== closestIdx) {
          op = THREE.MathUtils.lerp(op, 0.0, exitFactor * 1.5)
        } else {
          op = THREE.MathUtils.lerp(op, 0.45, exitFactor)
        }
        if (op < 0.01) {
          isVisible = false
          op = 0.0
        }
      }

      // Magnificent 3/4 luxury editorial perspective (Hero & Chapter 09 signature posture):
      // - Tilted forward ~15° (rotX ~0.26) displaying elevated solitaire crown and sculpted band in perspective
      // - 3/4 beauty yaw angle (rotY ~0.42) displaying 4 cathedral prongs, twin pavé shoulders, and precious metal body
      // - Subtle dynamic poise (rotZ ~ -0.05)
      let rotX = 0.26
      let rotY = 0.42 - sinVal * 0.20
      let rotZ = -0.05 + sinVal * 0.04

      // For Ring 0 during incoming arrival:
      if (i === 0 && arrivalT < 0.999) {
        rotX = 0.26
        rotY = THREE.MathUtils.lerp(0.38, 0.42, arrivalT)
        rotZ = -0.05
      }

      ringStates[i].pos[0] = x
      ringStates[i].pos[1] = y
      ringStates[i].pos[2] = z
      ringStates[i].rot[0] = rotX
      ringStates[i].rot[1] = rotY
      ringStates[i].rot[2] = rotZ
      ringStates[i].scale = s
      ringStates[i].opacity = op
      ringStates[i].visible = isVisible
      ringStates[i].isFocused = depthFactor > 0.88
    })

    // Active metal synchronization with arrival hysteresis:
    // Only switch to incoming ring once it actually arrives on center stage (maxCos >= 0.80)
    // or when the currently active ring has clearly departed (cosActive < 0.50), preventing
    // premature naming changes before the physical ring reaches the pedestal!
    const currentActiveIdx = METALS.indexOf(lastActiveMetal.current)
    const angleActive = theta + currentActiveIdx * (Math.PI / 2)
    const cosActive = Math.cos(angleActive)

    let activeIdx = currentActiveIdx
    if (maxCos >= 0.80 || cosActive < 0.50) {
      activeIdx = closestIdx
    }

    const currentActiveMetal = METALS[activeIdx]
    if (currentActiveMetal !== lastActiveMetal.current) {
      lastActiveMetal.current = currentActiveMetal
      setActiveState(currentActiveMetal)
      materialStore.setSelectedMaterial(currentActiveMetal)
      onMetalChange?.(currentActiveMetal)
    }

    // 4. Dynamic Lighting World matching active precious metal (Component 06: Physical Lighting Inertia)
    const colors = METAL_COLORS[currentActiveMetal]
    if (keyLightRef.current) {
      dampColor(keyLightRef.current.color, colors.key, CINEMATIC_MASS.heavy, dt)
      const targetKeyInt = THREE.MathUtils.lerp(1.4, 2.8, Math.min(1, emergenceFactor * 1.2))
      keyLightRef.current.intensity = dampScalar(
        keyLightRef.current.intensity,
        targetKeyInt,
        CINEMATIC_MASS.heavy,
        dt
      )
    }
    if (rimLightRef.current) {
      dampColor(rimLightRef.current.color, colors.rim, CINEMATIC_MASS.heavy, dt)
    }
    if (ambientLightRef.current) {
      dampColor(ambientLightRef.current.color, colors.ambient, CINEMATIC_MASS.superHeavy, dt)
    }

    // 5. Cinematic Camera Participation (Law 01, Law 02, Component 03):
    // Lateral drift opposite to rotation, subtle elevation, and damped dolly
    const camX = -0.12 * Math.sin(theta) + state.pointer.x * 0.08
    const camY = THREE.MathUtils.lerp(0.24, 0.34, choiceFactor) + state.pointer.y * 0.06
    const baseCamZ = isMobile ? 3.85 : 3.05
    const camZ =
      progress < 0.18
        ? THREE.MathUtils.lerp(isMobile ? 4.35 : 3.7, baseCamZ, progress / 0.18)
        : progress > 0.90 && progress <= 0.96
        ? THREE.MathUtils.lerp(baseCamZ, isMobile ? 4.05 : 3.25, choiceFactor)
        : baseCamZ

    targetCamPos.current.set(camX, camY, camZ)
    dampVector3(currentCamPos.current, targetCamPos.current, CINEMATIC_MASS.heavy, dt)

    targetLookAt.current.set(camX * 0.22, THREE.MathUtils.lerp(0.24, 0.08, arrivalT), 0)
    dampVector3(currentLookAt.current, targetLookAt.current, CINEMATIC_MASS.heavy, dt)

    state.camera.position.copy(currentCamPos.current)
    state.camera.lookAt(currentLookAt.current)
  })

  return (
    <>
      <fog attach="fog" args={['#050608', 3.8, 10.5]} />
      <ambientLight ref={ambientLightRef} intensity={0.65} color="#05080E" />
      <directionalLight
        ref={keyLightRef}
        position={[4.5, 7.5, 6]}
        intensity={2.8}
        color="#EAF2FF"
      />
      <spotLight
        ref={spotLightRef}
        position={[0, 6.5, 4.5]}
        intensity={2.8}
        color="#ffffff"
        angle={0.65}
        penumbra={0.85}
        distance={28}
      />
      <spotLight
        ref={rimLightRef}
        position={[0, 5, -6]}
        intensity={2.6}
        color="#D0E4FF"
        angle={0.8}
        penumbra={0.9}
      />
      {/* Warm ground bounce fill */}
      <directionalLight position={[-4, -3, 3]} intensity={0.8} color="#f0e6d6" />
      <StudioEnvironment intensity={1.35} />

      {/* ALL 4 REAL 3D RINGS RENDERED SIMULTANEOUSLY IN PHYSICAL SPACE */}
      {METALS.map((metal, i) => (
        <MaterialRing
          key={metal}
          sourceScene={gltf.scene}
          metal={metal}
          transformState={ringStates[i]}
          onClick={() => {
            interactionModeRef.current = 'click'
            materialStore.setSelectedMaterial(metal)
          }}
        />
      ))}
    </>
  )
}

export default function MaterialRingScene({
  progress,
  onMetalChange,
}: MaterialRingSceneProps) {
  const dragOffsetRef = useRef(0)
  const isDragging = useRef(false)
  const startX = useRef(0)
  const startOffset = useRef(0)
  const interactionModeRef = useRef<InteractionMode>('scroll')

  // Interactive horizontal drag rotation across the 3D canvas
  const handlePointerDown = (e: React.PointerEvent) => {
    isDragging.current = true
    interactionModeRef.current = 'drag'
    startX.current = e.clientX
    startOffset.current = dragOffsetRef.current
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging.current) return
    const dx = e.clientX - startX.current
    // Drag rotation sensitivity with inertia
    dragOffsetRef.current = startOffset.current + dx * 0.0045
  }

  const handlePointerUp = () => {
    if (!isDragging.current) return
    isDragging.current = false
  }

  return (
    <div
      className="material-canvas-container"
      style={{
        width: '100%',
        height: '100%',
        position: 'absolute',
        inset: 0,
        touchAction: 'pan-y',
        cursor: 'grab',
        zIndex: 1,
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      <Canvas
        camera={{ position: [0, 0.28, 4.2], fov: 40, near: 0.1, far: 50 }}
        dpr={typeof window !== 'undefined' && window.innerWidth < 768 ? [1, 1.25] : [1, 1.5]}
        frameloop="always"
        gl={{
          antialias: true,
          powerPreference: 'high-performance',
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.15,
        }}
      >
        <Suspense fallback={null}>
          <SpatialJewelleryUniverse
            progress={progress}
            onMetalChange={onMetalChange}
            dragOffsetRef={dragOffsetRef}
            interactionModeRef={interactionModeRef}
          />
        </Suspense>
      </Canvas>
    </div>
  )
}
