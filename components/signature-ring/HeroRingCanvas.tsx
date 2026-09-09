'use client'

import React, { Suspense, useRef, useMemo, useEffect } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useGLTF, Center, Environment } from '@react-three/drei'
import * as THREE from 'three'
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js'

const MODEL_PATH = '/models/doji-diamond-ring.glb'
useGLTF.preload(MODEL_PATH)

function HeroRingScene() {
  const { scene } = useGLTF(MODEL_PATH)
  const clonedScene = useMemo(() => SkeletonUtils.clone(scene), [scene])
  const groupRef = useRef<THREE.Group>(null)
  const spotLightRef = useRef<THREE.SpotLight>(null)
  const { size } = useThree()
  const isMobile = size.width < 768

  // Calibrate PBR luxury materials: Two-Tone 18K Champagne Gold & Platinum Diamond architecture
  useMemo(() => {
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
              // Central fluted / ribbed milgrain equator channel: Deep burnished 18K antique gold
              mat.metalness = 0.94
              mat.roughness = 0.26
              mat.color = new THREE.Color('#b89344')
              mat.emissive = new THREE.Color('#1c1304')
              mat.envMapIntensity = 1.6
            } else if (
              meshName.includes('circle006') ||
              (meshName.includes('circle') && !meshName.includes('circle001') && !meshName.includes('circle002'))
            ) {
              // Main ring band chassis & outer framing rims: High-polished 18K Champagne / Royal Gold
              mat.metalness = 0.96
              mat.roughness = 0.12
              mat.color = new THREE.Color('#cfa856')
              mat.emissive = new THREE.Color('#000000')
              mat.envMapIntensity = 2.0
            } else if (meshName.includes('prong') || meshName.includes('circle001') || meshName.includes('circle002')) {
              // Pavé prong tracks & diamond crown prongs: Polished 18K White Gold / Platinum contrast
              mat.metalness = 0.97
              mat.roughness = 0.10
              mat.color = new THREE.Color('#ebe7de')
              mat.emissive = new THREE.Color('#000000')
              mat.envMapIntensity = 2.2
            } else if (matName.includes('material_2') || matName.includes('diamond') || meshName.includes('dobj')) {
              // Solitaire diamond & pavé diamonds: Realistic diamond facet refraction
              mat.metalness = 0.02
              mat.roughness = 0.006
              mat.color = new THREE.Color('#ffffff')
              mat.emissive = new THREE.Color('#000000')
              mat.envMapIntensity = 2.4
            }
            mat.needsUpdate = true
          })
        }
      }
    })
  }, [scene])

  const mouseRef = useRef({ x: 0, y: 0 })

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      mouseRef.current.x = (e.clientX / window.innerWidth) * 2 - 1
      mouseRef.current.y = -(e.clientY / window.innerHeight) * 2 + 1
    }
    window.addEventListener('mousemove', handleMove, { passive: true })
    return () => window.removeEventListener('mousemove', handleMove)
  }, [])

  useFrame(({ clock }) => {
    const elapsed = clock.getElapsedTime()
    if (!groupRef.current) return

    // Subtle physical floating breathing motion
    const floatY = Math.sin(elapsed * 1.4) * 0.08
    const floatRotZ = Math.sin(elapsed * 0.9) * 0.03

    // Gentle pointer micro-interaction
    const mx = mouseRef.current.x
    const my = mouseRef.current.y

    const targetX = (isMobile ? 0 : 0.85) + mx * 0.35
    const targetY = (isMobile ? -0.4 : 0.05) + floatY + my * 0.25

    groupRef.current.position.x = THREE.MathUtils.lerp(groupRef.current.position.x, targetX, 0.05)
    groupRef.current.position.y = THREE.MathUtils.lerp(groupRef.current.position.y, targetY, 0.05)

    // Base rotation: upright 3/4 front elevation
    const baseRotX = -Math.PI / 2 + 0.32
    const baseRotY = 0.42

    groupRef.current.rotation.x = THREE.MathUtils.lerp(
      groupRef.current.rotation.x,
      baseRotX - my * 0.2,
      0.05
    )
    groupRef.current.rotation.y = THREE.MathUtils.lerp(
      groupRef.current.rotation.y,
      baseRotY + mx * 0.35,
      0.05
    )
    groupRef.current.rotation.z = floatRotZ

    // Specular pulsation
    if (spotLightRef.current) {
      spotLightRef.current.intensity = 2.2 + Math.sin(elapsed * 2.0) * 0.25
    }
  })

  const responsiveScale = isMobile ? 18 : 25

  return (
    <>
      <ambientLight intensity={0.9} color="#faf7f0" />
      <directionalLight position={[4.5, 7.5, 6]} intensity={2.2} color="#fffcf5" />
      <spotLight
        ref={spotLightRef}
        position={[0.5, 6.5, 4.5]}
        intensity={2.4}
        color="#ffffff"
        angle={0.55}
        penumbra={0.75}
        distance={24}
      />
      <directionalLight position={[-6, -2, 4]} intensity={1.2} color="#f2e7d5" />
      <spotLight
        position={[0, 6, -7]}
        intensity={2.4}
        color="#eaf3ff"
        angle={0.8}
        penumbra={0.9}
      />
      <Environment preset="studio" environmentIntensity={0.85} />

      <group ref={groupRef} scale={responsiveScale} position={[isMobile ? 0 : 0.85, isMobile ? -0.4 : 0.05, 0]}>
        <Center>
          <primitive object={clonedScene} />
        </Center>
      </group>
    </>
  )
}

export default function HeroRingCanvas() {
  return (
    <div className="hero-ring-canvas-container" aria-hidden="true">
      <Canvas
        camera={{ position: [0, 0.2, 12.0], fov: 28 }}
        dpr={[1, 1.5]}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance',
        }}
      >
        <Suspense fallback={null}>
          <HeroRingScene />
        </Suspense>
      </Canvas>
    </div>
  )
}
