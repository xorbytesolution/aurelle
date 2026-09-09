'use client'

import React, { Suspense, useRef, useMemo, useState, useEffect } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { useGLTF, Center, Environment } from '@react-three/drei'
import * as THREE from 'three'
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js'

const MODEL_PATH = '/models/doji-diamond-ring.glb'
useGLTF.preload(MODEL_PATH)

interface Collection3DViewerProps {
  activeChapter: number // 0: Lumière (Platinum), 1: Nocturne (Champagne), 2: Élan (Yellow Gold)
}

function CollectionRing({ activeChapter, isMacroZoom }: { activeChapter: number; isMacroZoom: boolean }) {
  const { scene } = useGLTF(MODEL_PATH)
  const groupRef = useRef<THREE.Group>(null)
  const spotLightRef = useRef<THREE.SpotLight>(null)

  // Clone scene with unique material instances so we can color-grade each chapter dynamically
  const clonedScene = useMemo(() => {
    const cloned = SkeletonUtils.clone(scene)
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
  }, [scene])

  // Configure high-luxury PBR materials tailored to each chapter
  useEffect(() => {
    let metalColor = '#f0eee9' // Chapter 0: Platinum 950
    let milgrainColor = '#242422'
    let metalness = 0.98
    let roughness = 0.08

    if (activeChapter === 1) {
      // Chapter 1: 18K Champagne Gold
      metalColor = '#decba4'
      milgrainColor = '#6e5a38'
      metalness = 0.96
      roughness = 0.12
    } else if (activeChapter === 2) {
      // Chapter 2: 18K Yellow Gold
      metalColor = '#e8c46c'
      milgrainColor = '#806220'
      metalness = 0.96
      roughness = 0.10
    }

    clonedScene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh
        if (mesh.material) {
          const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
          mats.forEach((m) => {
            const mat = m as THREE.MeshStandardMaterial
            const matName = (mat.name || '').toLowerCase()
            const meshName = (mesh.name || '').toLowerCase()

            if (meshName.includes('circle006_1') || matName.includes('white gold 2')) {
              mat.color = new THREE.Color(milgrainColor)
              mat.metalness = 0.95
              mat.roughness = 0.22
              mat.envMapIntensity = 1.6
            } else if (
              meshName.includes('circle006') ||
              (meshName.includes('circle') && !meshName.includes('circle001') && !meshName.includes('circle002'))
            ) {
              mat.color = new THREE.Color(metalColor)
              mat.metalness = metalness
              mat.roughness = roughness
              mat.envMapIntensity = 2.4
            } else if (meshName.includes('prong') || meshName.includes('circle001') || meshName.includes('circle002')) {
              // Platinum prongs across all chapters for optimal diamond white fire
              mat.color = new THREE.Color('#f5f4f0')
              mat.metalness = 0.98
              mat.roughness = 0.08
              mat.envMapIntensity = 2.5
            } else if (matName.includes('material_2') || matName.includes('diamond') || meshName.includes('dobj')) {
              // Real diamond dispersion and refraction
              mat.color = new THREE.Color('#ffffff')
              mat.metalness = 0.02
              mat.roughness = 0.005
              mat.envMapIntensity = 3.2
            }
            mat.needsUpdate = true
          })
        }
      }
    })
  }, [clonedScene, activeChapter])

  // Mouse drag & tactile inspection buffer
  const rotTarget = useRef({ x: -0.22, y: 0.35 })
  const rotCurrent = useRef({ x: -0.22, y: 0.35 })

  useFrame(({ clock, pointer }) => {
    if (!groupRef.current) return
    const elapsed = clock.getElapsedTime()

    // Gentle micro-breathing when not dragging
    const idleY = Math.sin(elapsed * 0.85) * 0.06
    const idleRoll = Math.cos(elapsed * 0.6) * 0.025

    // Pointer-driven soft parallax
    rotTarget.current.y = 0.35 + pointer.x * 0.45
    rotTarget.current.x = -0.22 - pointer.y * 0.35

    // Smooth inertia damping
    rotCurrent.current.x += (rotTarget.current.x - rotCurrent.current.x) * 0.08
    rotCurrent.current.y += (rotTarget.current.y - rotCurrent.current.y) * 0.08

    groupRef.current.rotation.x = rotCurrent.current.x
    groupRef.current.rotation.y = rotCurrent.current.y
    groupRef.current.rotation.z = idleRoll
    groupRef.current.position.y = idleY

    // Specular pulse on spot light
    if (spotLightRef.current) {
      spotLightRef.current.intensity = 2.6 + Math.sin(elapsed * 1.8) * 0.3
    }
  })

  // Telephoto scale: fits elegantly into collections card
  const scale = isMacroZoom ? 5.2 : 3.4

  return (
    <>
      <ambientLight intensity={0.8} color="#fcf9f2" />
      <directionalLight position={[5, 8, 6]} intensity={2.6} color="#ffffff" />
      <directionalLight position={[-6, -2, 4]} intensity={1.1} color="#f4ebd9" />
      <spotLight
        ref={spotLightRef}
        position={[0, 6, 5]}
        intensity={2.8}
        color="#ffffff"
        angle={0.6}
        penumbra={0.8}
        distance={24}
      />
      <spotLight position={[0, 5, -6]} intensity={2.2} color="#dbe7ff" angle={0.8} penumbra={0.9} />
      <Environment preset="studio" environmentIntensity={1.3} />

      <group ref={groupRef} scale={scale} position={[0, 0, 0]}>
        <Center>
          <primitive object={clonedScene} />
        </Center>
      </group>
    </>
  )
}

export default function Collection3DViewer({ activeChapter }: Collection3DViewerProps) {
  const [isMacroZoom, setIsMacroZoom] = useState(false)

  return (
    <div
      className="collection-3d-container"
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        minHeight: '480px',
        background: 'radial-gradient(ellipse 70% 70% at 50% 45%, #121417 0%, #050608 100%)',
        borderRadius: '4px',
        overflow: 'hidden',
        border: '1px solid rgba(255, 255, 255, 0.08)',
      }}
    >
      <Canvas
        camera={{ position: [0, 0.12, 1.85], fov: 32 }}
        dpr={[1, 2]}
        gl={{
          antialias: true,
          powerPreference: 'high-performance',
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.2,
        }}
      >
        <Suspense fallback={null}>
          <CollectionRing activeChapter={activeChapter} isMacroZoom={isMacroZoom} />
        </Suspense>
      </Canvas>

      {/* Luxury 3D Telemetry HUD Overlay */}
      <div
        style={{
          position: 'absolute',
          top: '20px',
          left: '24px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          pointerEvents: 'none',
        }}
      >
        <span
          style={{
            fontSize: '9px',
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: 'var(--gold, #d4af37)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <span style={{ fontSize: '11px' }}>✦</span> Real-Time 3D Masterwork
        </span>
      </div>

      {/* Responsive Controls Bar */}
      <div
        style={{
          position: 'absolute',
          bottom: '16px',
          left: '16px',
          right: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '10px',
          zIndex: 5,
        }}
      >
        <span
          style={{
            pointerEvents: 'none',
            fontSize: '9px',
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: 'rgba(238, 233, 223, 0.45)',
          }}
        >
          ✦ 360° Real-Time PBR
        </span>

        <button
          type="button"
          onClick={() => setIsMacroZoom((prev) => !prev)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '7px 16px',
            borderRadius: '999px',
            border: '1px solid rgba(212, 175, 55, 0.35)',
            background: isMacroZoom ? 'rgba(212, 175, 55, 0.22)' : 'rgba(10, 10, 10, 0.75)',
            backdropFilter: 'blur(12px)',
            color: isMacroZoom ? '#ffffff' : 'rgba(238, 233, 223, 0.85)',
            fontFamily: 'inherit',
            fontSize: '9px',
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
          }}
        >
          <span>{isMacroZoom ? '⊖ Normal' : '⊕ 100× Macro'}</span>
        </button>
      </div>
    </div>
  )
}
