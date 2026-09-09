'use client'

import React, { Suspense, useRef, useEffect, useState, useMemo } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import gsap from 'gsap'

const MODEL_PATH = '/models/doji-diamond-ring.glb'
useGLTF.preload(MODEL_PATH)

interface OpeningSequenceProps {
  onComplete: () => void
  onReveal?: () => void
}

interface BeautyRingStageProps {
  separationProgressRef: React.MutableRefObject<number>
  gleamRef: React.MutableRefObject<number>
  entranceRef: React.MutableRefObject<number>
  onReady: () => void
}

/* 
 * cloneModelWithClipping:
 * Deep-clones the GLTF hierarchy and duplicates materials so each half
 * possesses its own independent clipping plane, with DoubleSide rendering
 * to ensure zero hollow/broken geometry artifacts.
 */
function cloneModelWithClipping(source: THREE.Group, plane: THREE.Plane) {
  const model = clone(source)
  model.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      const mesh = child as THREE.Mesh
      if (mesh.material) {
        if (Array.isArray(mesh.material)) {
          mesh.material = mesh.material.map((mat) => {
            const m = mat.clone()
            m.clippingPlanes = [plane]
            m.clipShadows = true
            m.side = THREE.DoubleSide
            return m
          })
        } else {
          const m = mesh.material.clone()
          m.clippingPlanes = [plane]
          m.clipShadows = true
          m.side = THREE.DoubleSide
          mesh.material = m
        }
      }
    }
  })
  return model
}

/*
 * BeautyRingStage:
 * 1. Locks the authentic horizontal front elevation (Image 2 reference):
 *    rotation: [0, 0, 0], position: [0, 0, 0]
 *    - Center solitaire diamond crown faces straight forward into the camera
 *    - Dual pavé bands arc horizontally left-to-right
 *    - Dark ribbed titanium channel runs along the exact horizontal equator
 *    - Telephoto framing (fov: 18, distance: 20) eliminates wide-angle distortion
 *    - Responsive scale spans 94% of viewport width across desktop and mobile
 * 2. Prepares two complementary halves:
 *    - Upper half: clipped at screen equator Y=0, moves UP along screen Y
 *    - Lower half: clipped at screen equator Y=0, moves DOWN along screen Y
 * 3. At time t = 0: Both halves align with zero gap, reconstructing the 100% complete ring.
 */
function BeautyRingStage({
  separationProgressRef,
  gleamRef,
  entranceRef,
  onReady,
}: BeautyRingStageProps) {
  const { scene } = useGLTF(MODEL_PATH)
  const spotLightRef = useRef<THREE.SpotLight>(null)
  const sweepLightRef = useRef<THREE.PointLight>(null)
  const upperGroupRef = useRef<THREE.Group>(null)
  const lowerGroupRef = useRef<THREE.Group>(null)
  const readySent = useRef(false)
  const startTimeRef = useRef(Date.now())
  const { gl, size, scene: rootScene, camera } = useThree()

  // Enable local clipping on the WebGL renderer
  useEffect(() => {
    gl.localClippingEnabled = true
  }, [gl])

  // Instant offline RoomEnvironment attached to rootScene for metallic & facet luster (0 network requests)
  useEffect(() => {
    const pmremGenerator = new THREE.PMREMGenerator(gl)
    pmremGenerator.compileEquirectangularShader()
    const roomEnv = new RoomEnvironment()
    const envTexture = pmremGenerator.fromScene(roomEnv).texture
    const prevEnv = rootScene.environment
    rootScene.environment = envTexture

    return () => {
      rootScene.environment = prevEnv
      pmremGenerator.dispose()
      roomEnv.dispose()
    }
  }, [gl, rootScene])

  // Calibrate PBR luxury materials: Prestigious Two-Tone 18K Champagne Gold & Platinum Diamond architecture
  useMemo(() => {
    scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh
        if (mesh.material) {
          const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
          mats.forEach((m) => {
            const mat = m as THREE.MeshStandardMaterial
            const matName = (mat.name || '').toLowerCase()
            const meshName = (mesh.name || '').toLowerCase()

            if (meshName.includes('circle006_1') || matName.includes('white gold 2')) {
              // Central fluted / ribbed milgrain equator channel: Deep burnished 18K antique gold with rich contrast
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
              // Solitaire diamond & pavé diamonds: Realistic diamond facet refraction (zero blown-out glow)
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

  // Responsive scale ensuring the ring spans ~94% of viewport width (FULL WIDTH across screen)
  const aspect = size.width / size.height
  const responsiveScale = useMemo(() => {
    // Visible world height at Z=0 for fov=18 and camera distance=20: ~6.335
    const visibleHeight = 2 * Math.tan(((18 * Math.PI) / 180) / 2) * 20
    const visibleWidth = visibleHeight * aspect
    // The ring local width is 0.1936 units.
    // Target 94% on desktop/landscape, 92% on mobile/portrait
    const targetFraction = aspect >= 1.0 ? 0.94 : 0.92
    return (targetFraction * visibleWidth) / 0.1936
  }, [aspect])

  // Create clipping planes in screen/world space passing through visual equator Y=0
  const upperPlane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), [])
  const lowerPlane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, -1, 0), 0), [])

  // Generate upper and lower cloned models with their own independent clipping planes
  const upperModel = useMemo(() => cloneModelWithClipping(scene, upperPlane), [scene, upperPlane])
  const lowerModel = useMemo(() => cloneModelWithClipping(scene, lowerPlane), [scene, lowerPlane])

  useFrame(() => {
    if (!readySent.current) {
      readySent.current = true
      onReady()
    }

    const elapsed = (Date.now() - startTimeRef.current) * 0.001

    // 0. Cinematic Smooth Arrival (camera push-in, scale expansion & floating alignment)
    const entrance = entranceRef && entranceRef.current !== undefined ? entranceRef.current : 1.0
    const entranceScaleMultiplier = THREE.MathUtils.lerp(0.76, 1.0, entrance)
    const currentScale = responsiveScale * entranceScaleMultiplier
    const entranceCamZ = THREE.MathUtils.lerp(26.5, 20.0, entrance)

    // Floating angle settling smoothly into dead-center horizontal front elevation
    const entranceRotX = THREE.MathUtils.lerp(0.14, 0.0, entrance)
    const entranceRotY = THREE.MathUtils.lerp(-0.08, 0.0, entrance)

    // Light reveal bloom as ring emerges from dark velvet space
    const lightReveal = Math.max(0.08, entrance)

    // 1. Dynamic caustics light sweep across the 94vw pavé diamond span
    if (sweepLightRef.current) {
      const sweepX = Math.sin(elapsed * 1.8) * 8.5
      sweepLightRef.current.position.x = sweepX
      sweepLightRef.current.position.y = Math.cos(elapsed * 1.2) * 0.5
      sweepLightRef.current.intensity = 1.6 * lightReveal
    }

    // 2. Diamond flare pulsation (calibrated luxury specular glint - subtle & smooth)
    if (spotLightRef.current) {
      const base = 1.8
      const pulse = Math.sin(Date.now() * 0.003) * 0.08
      const extra = (gleamRef.current || 0) * 0.2
      spotLightRef.current.intensity = (base + pulse + extra) * lightReveal
    }

    // 3. Cinematic separation & 3D Camera Depth Push-in:
    // progress: 0.0 (fully joined) -> 1.0 (fully parted)
    const progress = separationProgressRef.current || 0
    const yShift = progress * 4.6

    // Smooth camera dolly forward as the vault opens
    camera.position.z = entranceCamZ - progress * 2.0

    if (upperGroupRef.current) {
      upperGroupRef.current.scale.setScalar(currentScale)
      upperGroupRef.current.position.y = yShift
      upperGroupRef.current.rotation.x = entranceRotX - progress * 0.04
      upperGroupRef.current.rotation.y = entranceRotY
      upperPlane.constant = -yShift
    }
    if (lowerGroupRef.current) {
      lowerGroupRef.current.scale.setScalar(currentScale)
      lowerGroupRef.current.position.y = -yShift
      lowerGroupRef.current.rotation.x = entranceRotX + progress * 0.04
      lowerGroupRef.current.rotation.y = entranceRotY
      lowerPlane.constant = -yShift
    }
  })

  return (
    <>
      <ambientLight intensity={0.75} color="#faf6ee" />
      <directionalLight position={[0, 8, 12]} intensity={1.8} color="#fffcf5" />
      <spotLight
        ref={spotLightRef}
        position={[0, 0, 18]}
        intensity={2.0}
        color="#ffffff"
        angle={0.45}
        penumbra={0.7}
        distance={35}
      />
      {/* Dynamic travelling sweep light catching pavé diamond facets with subtle golden warmth */}
      <pointLight
        ref={sweepLightRef}
        position={[-8, 0, 12]}
        intensity={1.6}
        distance={22}
        color="#ffe8be"
      />
      <directionalLight position={[-10, 2, 8]} intensity={1.2} color="#fcefd7" />
      <directionalLight position={[10, 2, 8]} intensity={1.2} color="#fcefd7" />
      <directionalLight position={[0, 4, -10]} intensity={1.0} color="#dbe5f0" />

      {/* 
        Upper Complementary Half:
        - Emerges smoothly scaling 0.76 -> 1.00 (spans 94vw)
        - Dead-centered at screen equator Y=0
        - Glides smoothly UP (+Y) with micro-tilt on separation
      */}
      <group ref={upperGroupRef} position={[0, 0, 0]}>
        <primitive object={upperModel} />
      </group>

      {/* 
        Lower Complementary Half:
        - Emerges smoothly scaling 0.76 -> 1.00 (spans 94vw)
        - Dead-centered at screen equator Y=0
        - Glides smoothly DOWN (-Y) with micro-tilt on separation
      */}
      <group ref={lowerGroupRef} position={[0, 0, 0]}>
        <primitive object={lowerModel} />
      </group>
    </>
  )
}

export default function OpeningSequence({ onComplete, onReveal }: OpeningSequenceProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasWrapRef = useRef<HTMLDivElement>(null)
  const seamGlowRef = useRef<HTMLDivElement>(null)
  const seamBloomRef = useRef<HTMLDivElement>(null)
  const brandMarkRef = useRef<HTMLDivElement>(null)
  const starFlareRef = useRef<HTMLDivElement>(null)
  const curtainRef = useRef<HTMLDivElement>(null)
  const separationProgressRef = useRef(0)
  const gleamRef = useRef(0)
  const entranceRef = useRef(0)
  const [modelReady, setModelReady] = useState(false)
  const [mounted, setMounted] = useState(true)
  const hasStartedRef = useRef(false)
  const onCompleteRef = useRef(onComplete)
  onCompleteRef.current = onComplete
  const onRevealRef = useRef(onReveal)
  onRevealRef.current = onReveal

  // Prevent any browser scrollbar or scrolling during the opening presentation
  useEffect(() => {
    if (mounted) {
      document.documentElement.style.overflow = 'hidden'
      document.body.style.overflow = 'hidden'
      document.documentElement.style.scrollbarWidth = 'none'
      document.body.style.scrollbarWidth = 'none'
    } else {
      document.documentElement.style.overflow = ''
      document.body.style.overflow = ''
      document.documentElement.style.scrollbarWidth = ''
      document.body.style.scrollbarWidth = ''
    }
    return () => {
      document.documentElement.style.overflow = ''
      document.body.style.overflow = ''
      document.documentElement.style.scrollbarWidth = ''
      document.body.style.scrollbarWidth = ''
    }
  }, [mounted])

  const handleModelReady = () => {
    setModelReady(true)
  }

  // Safety fallback: ensure website reveals even if client WebGL is unavailable
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!modelReady) {
        setModelReady(true)
      }
    }, 3500)
    return () => clearTimeout(timer)
  }, [modelReady])

  useEffect(() => {
    if (!modelReady || hasStartedRef.current) return
    hasStartedRef.current = true

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReduced) {
      setMounted(false)
      onRevealRef.current?.()
      onCompleteRef.current()
      return
    }

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        onComplete: () => {
          setMounted(false)
          onCompleteRef.current()
        },
      })

      // Frame 01: 0.0s – 1.6s: Complete ring emerges smoothly out of dark velvety space
      // Blur dissolves, scale expands 76% -> 100%, camera pulls in 26.5 -> 20.0
      tl.fromTo(
        canvasWrapRef.current,
        { opacity: 0, filter: 'blur(14px)' },
        { opacity: 1, filter: 'blur(0px)', duration: 1.5, ease: 'power2.out' },
        0
      )
      tl.fromTo(
        entranceRef,
        { current: 0 },
        { current: 1, duration: 1.6, ease: 'power3.out' },
        0
      )

      // Frame 02: 1.1s – 2.4s: Soft Anamorphic Diamond Shimmer (Silky smooth bloom in & out)
      tl.fromTo(
        starFlareRef.current,
        { opacity: 0, scale: 0.35, filter: 'blur(4px)' },
        { opacity: 0.8, scale: 1.0, filter: 'blur(0px)', duration: 1.1, ease: 'power2.out' },
        1.1
      )

      // Gentle specular gleam rise & fall (subtle & organic, no harsh spike)
      tl.to(
        gleamRef,
        { current: 0.8, duration: 1.0, ease: 'power2.out' },
        1.1
      )
      tl.to(
        gleamRef,
        { current: 0.1, duration: 1.0, ease: 'power2.inOut' },
        2.1
      )

      // Silky soft dissolve of diamond shimmer (gentle lens dispersion instead of abrupt flash cut)
      tl.to(
        starFlareRef.current,
        { opacity: 0, scale: 1.2, filter: 'blur(6px)', duration: 0.85, ease: 'power2.out' },
        2.0
      )

      // Frame 03: 1.9s – 2.6s: Soft equator light whisper along seam
      tl.fromTo(
        seamGlowRef.current,
        { opacity: 0, scaleX: 0.05 },
        { opacity: 0.8, scaleX: 1.0, duration: 0.65, ease: 'power2.out' },
        1.9
      )
      tl.fromTo(
        seamBloomRef.current,
        { opacity: 0, scaleX: 0.1 },
        { opacity: 0.7, scaleX: 1.0, duration: 0.7, ease: 'power2.out' },
        1.95
      )

      // Frame 04: 2.3s – 4.0s: The Main Parting ("bilkul center se cut honi chhiye")
      // Upper half glides smoothly UP, Lower half glides smoothly DOWN
      tl.to(
        separationProgressRef,
        {
          current: 1.0,
          duration: 1.7,
          ease: 'power3.inOut',
        },
        2.3
      )

      // Seam glow gently melts away as gap opens
      tl.to(
        [seamGlowRef.current, seamBloomRef.current],
        { opacity: 0, duration: 0.7, ease: 'power2.inOut' },
        2.4
      )

      // Brand insignia shines through the opening aperture (stays visible for a generous, luxurious moment)
      tl.fromTo(
        brandMarkRef.current,
        { opacity: 0, scale: 0.94 },
        { opacity: 1.0, scale: 1.0, duration: 0.8, ease: 'power2.out' },
        2.4
      )

      // Frame 05: 4.2s – 5.0s: Curtain, brand insignia & ring halves dissolve smoothly into the hero section
      tl.to(
        curtainRef.current,
        { opacity: 0, duration: 0.8, ease: 'power2.inOut' },
        4.2
      )
      // Trigger hero ring entrance as curtain dissolves
      tl.call(() => {
        onRevealRef.current?.()
      }, undefined, 4.4)
      tl.to(
        brandMarkRef.current,
        { opacity: 0, scale: 1.04, duration: 0.7, ease: 'power2.inOut' },
        4.3
      )

      // Ring halves smoothly exit bounds as hero emerges
      tl.to(
        canvasWrapRef.current,
        { opacity: 0, duration: 0.7, ease: 'power2.inOut' },
        4.3
      )
      tl.to(
        containerRef.current,
        { opacity: 0, duration: 0.7, ease: 'power2.inOut' },
        4.4
      )
      tl.call(() => {
        setMounted(false)
        onCompleteRef.current?.()
      }, undefined, 5.1)
    }, containerRef)

    return () => {
      ctx.revert()
    }
  }, [modelReady])

  if (!mounted) return null

  return (
    <aside
      ref={containerRef}
      className="opening-cinema-stage"
      aria-label="Aurelle Opening Presentation"
    >
      {/* Dark luxury curtain backdrop */}
      <div ref={curtainRef} className="opening-curtain-backdrop" />

      {/* Brand Insignia that glows through the parting aperture */}
      <div ref={brandMarkRef} className="opening-brand-mark" aria-hidden="true">
        <span className="opening-brand-title">A U R E L L E</span>
        <span className="opening-brand-sub">HIGH JEWELLERY · PARIS</span>
      </div>

      {/* 
        Full-screen Canvas:
        - Contains the complete 3D ring initially in horizontal beauty front elevation (Image 2 style)
        - Sized to span ~94% of viewport width across the screen (FULL WIDTH)
        - Parted into upper and lower complementary halves along screen equator Y=0
        - Telephoto framing (fov: 18, distance: 20) eliminates wide-angle distortion
      */}
      <div ref={canvasWrapRef} className="opening-canvas-wrap">
        <Canvas
          camera={{ position: [0, 0, 20], fov: 18 }}
          dpr={[1, 1.5]}
          gl={{
            antialias: true,
            alpha: true,
            powerPreference: 'high-performance',
          }}
        >
          <Suspense fallback={null}>
            <BeautyRingStage
              separationProgressRef={separationProgressRef}
              gleamRef={gleamRef}
              entranceRef={entranceRef}
              onReady={handleModelReady}
            />
          </Suspense>
        </Canvas>
      </div>

      {/* Anamorphic Solitaire Diamond Star Flare */}
      <div ref={starFlareRef} className="opening-diamond-flare" aria-hidden="true">
        <div className="opening-flare-core" />
        <div className="opening-flare-ray-h" />
        <div className="opening-flare-ray-v" />
        <div className="opening-flare-ray-diag" />
        <div className="opening-flare-ray-diag2" />
      </div>

      {/* Soft Seam Bloom behind the cut */}
      <div ref={seamBloomRef} className="opening-seam-bloom" aria-hidden="true" />

      {/* Horizontal Seam Glow Slit along screen equator */}
      <div ref={seamGlowRef} className="opening-seam-glow" aria-hidden="true" />
    </aside>
  )
}


