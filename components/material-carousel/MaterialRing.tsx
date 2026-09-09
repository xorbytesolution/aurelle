'use client'

import React, { useMemo, useRef, useEffect } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js'
import { PreciousMetal, applyMaterialToRing } from './glbMaterialClassifier'

interface MaterialRingProps {
  sourceScene: THREE.Group
  metal: PreciousMetal
  opacity?: number
  position?: [number, number, number]
  rotation?: [number, number, number]
  scale?: number
  isFocused?: boolean
  onClick?: () => void
}

/**
 * Optical Diamond Sparkle Flare that glints when crown facets face the camera.
 */
function RingSparkleFlare({
  scale = 0.45,
  opacity = 1.0,
}: {
  scale?: number
  opacity?: number
}) {
  const meshRef = useRef<THREE.Group>(null)
  const worldPos = useRef(new THREE.Vector3())
  const lightVec = useMemo(() => new THREE.Vector3(4.5, 7.5, 6).normalize(), [])
  const normalVec = useMemo(() => new THREE.Vector3(0, 0.8, 0.6).normalize(), [])

  useFrame(({ camera, clock }) => {
    if (!meshRef.current) return
    meshRef.current.quaternion.copy(camera.quaternion)
    meshRef.current.getWorldPosition(worldPos.current)
    const camDir = new THREE.Vector3().subVectors(camera.position, worldPos.current).normalize()
    const reflectDir = lightVec.clone().negate().reflect(normalVec)
    const dot = Math.max(0, camDir.dot(reflectDir))

    let glint = 0
    if (dot > 0.82) {
      glint = Math.pow((dot - 0.82) / 0.18, 2.5)
    }
    const pulse = Math.sin(clock.getElapsedTime() * 2.2) * 0.15 + 0.85
    const finalOpacity = Math.min(1, glint * pulse * opacity)

    meshRef.current.children.forEach((child) => {
      const mesh = child as THREE.Mesh
      if (mesh.material) {
        const mat = mesh.material as THREE.MeshBasicMaterial
        mat.opacity = finalOpacity
        mat.visible = finalOpacity > 0.01
      }
    })
  })

  return (
    <group ref={meshRef} position={[0, 0.005, 0.106]} scale={scale}>
      <mesh>
        <planeGeometry args={[0.045, 0.85]} />
        <meshBasicMaterial
          color="#ffffff"
          transparent
          opacity={0}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      <mesh>
        <planeGeometry args={[0.85, 0.045]} />
        <meshBasicMaterial
          color="#ffffff"
          transparent
          opacity={0}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      <mesh>
        <circleGeometry args={[0.08, 16]} />
        <meshBasicMaterial
          color="#f4f8ff"
          transparent
          opacity={0}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </group>
  )
}

export interface RingTransformState {
  pos: [number, number, number]
  rot: [number, number, number]
  scale: number
  opacity: number
  visible: boolean
  isFocused: boolean
}

interface MaterialRingProps {
  sourceScene: THREE.Group
  metal: PreciousMetal
  transformState: RingTransformState
  onClick?: () => void
}

export default function MaterialRing({
  sourceScene,
  metal,
  transformState,
  onClick,
}: MaterialRingProps) {
  const stationGroupRef = useRef<THREE.Group>(null)
  const motionGroupRef = useRef<THREE.Group>(null)
  const idleGroupRef = useRef<THREE.Group>(null)
  const lastOpacity = useRef(-1)

  // Clone hierarchy using SkeletonUtils, keeping buffer geometries 100% SHARED in GPU memory,
  // but cloning materials so overrides never mutate the shared sourceScene or other ring components
  const clonedScene = useMemo(() => {
    const cloned = SkeletonUtils.clone(sourceScene)
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

    // Compute bounding box and center geometry at local origin (0, 0, 0)
    cloned.updateMatrixWorld(true)
    const box = new THREE.Box3().setFromObject(cloned)
    const center = box.getCenter(new THREE.Vector3())
    cloned.position.sub(center)

    return cloned
  }, [sourceScene])

  // Apply custom PBR metal and diamond shaders dynamically
  useEffect(() => {
    applyMaterialToRing(clonedScene, metal, transformState.opacity)
    lastOpacity.current = transformState.opacity
  }, [clonedScene, metal, transformState.opacity])

  // Individual micro-motion characteristics per metal (Component 09: The Breathing Rule):
  // - Platinum: slow clockwise rotation
  // - Yellow Gold: slightly faster rotation
  // - Rose Gold: slow counter rotation
  // - Champagne Gold: almost stationary with gentle breathing
  const motionConfig = useMemo(() => {
    switch (metal) {
      case 'platinum':
        return { speedY: 0.10, ampY: 0.016, freqY: 0.85, phase: 0.0, yawAmp: 0.08, yawFreq: 0.40 }
      case 'yellow-gold':
        return { speedY: 0.16, ampY: 0.020, freqY: 0.95, phase: 1.8, yawAmp: 0.10, yawFreq: 0.48 }
      case 'rose-gold':
        return { speedY: -0.09, ampY: 0.015, freqY: 0.75, phase: 3.5, yawAmp: 0.07, yawFreq: 0.36 }
      case 'champagne-gold':
        return { speedY: 0.05, ampY: 0.012, freqY: 0.65, phase: 5.2, yawAmp: 0.05, yawFreq: 0.30 }
    }
  }, [metal])

  // Subtle procedural luxury breathing and micro-motion isolated in idleGroupRef
  useFrame((state) => {
    const time = state.clock.getElapsedTime()
    const { speedY, ampY, freqY, phase, yawAmp, yawFreq } = motionConfig

    const isVis = transformState.visible && transformState.opacity > 0.02

    // 1. Orbital Station Transform (controlled by constellation math)
    if (stationGroupRef.current) {
      stationGroupRef.current.visible = isVis

      if (isVis) {
        stationGroupRef.current.position.set(
          transformState.pos[0],
          transformState.pos[1],
          transformState.pos[2]
        )
        stationGroupRef.current.rotation.set(
          transformState.rot[0],
          transformState.rot[1],
          transformState.rot[2]
        )
        stationGroupRef.current.scale.setScalar(transformState.scale)
      } else {
        stationGroupRef.current.position.set(0, -999, 0)
      }
    }

    if (isVis) {
      // 2. Idle Micro-Motion Transform (completely isolated, zero fighting)
      if (idleGroupRef.current) {
        const isFocused = transformState.isFocused
        const floatingElevation = Math.sin(time * freqY + phase) * (isFocused ? ampY : ampY * 0.6)
        const independentYaw = isFocused
          ? Math.sin(time * yawFreq + phase) * yawAmp + Math.sin(time * 0.18) * 0.04
          : Math.sin(time * (speedY * 0.8) + phase) * 0.06

        idleGroupRef.current.position.set(0, floatingElevation, 0)
        idleGroupRef.current.rotation.set(0, independentYaw, 0)
      }

      // 3. Dynamic material opacity update if opacity changed
      if (Math.abs(transformState.opacity - lastOpacity.current) > 0.01) {
        lastOpacity.current = transformState.opacity
        const op = transformState.opacity
        clonedScene.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh
            if (mesh.material) {
              const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
              mats.forEach((m) => {
                const mat = m as THREE.MeshStandardMaterial
                mat.transparent = op < 0.999
                mat.opacity = op
              })
            }
          }
        })
      }
    }
  })

  return (
    <group
      ref={stationGroupRef}
      onClick={(e) => {
        e.stopPropagation()
        onClick?.()
      }}
      onPointerOver={() => {
        if (onClick) document.body.style.cursor = 'pointer'
      }}
      onPointerOut={() => {
        document.body.style.cursor = 'auto'
      }}
    >
      <group ref={motionGroupRef}>
        <group ref={idleGroupRef}>
          <primitive object={clonedScene} />
          <RingSparkleFlare opacity={transformState.isFocused ? 1.0 : transformState.opacity * 0.5} />
        </group>
      </group>
    </group>
  )
}
