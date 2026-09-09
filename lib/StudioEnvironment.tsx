'use client'

import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { useThree } from '@react-three/fiber'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'

interface StudioEnvironmentProps {
  intensity?: number
}

/**
 * 100% Offline, Zero-Network Procedural Studio Environment.
 * Eliminates all network dependencies (such as raw.githack.com which returns HTTP 403).
 * Provides instantaneous realistic studio lighting and reflections for diamonds and metals.
 */
export function StudioEnvironment({ intensity = 1.2 }: StudioEnvironmentProps) {
  const { gl, scene } = useThree()
  const renderTargetRef = useRef<THREE.WebGLRenderTarget | null>(null)

  useEffect(() => {
    let active = true
    const pmremGenerator = new THREE.PMREMGenerator(gl)
    pmremGenerator.compileEquirectangularShader()
    const roomEnv = new RoomEnvironment()
    const renderTarget = pmremGenerator.fromScene(roomEnv)

    if (active) {
      renderTargetRef.current = renderTarget
      scene.environment = renderTarget.texture
      scene.environmentIntensity = intensity
    }

    return () => {
      active = false
      if (scene.environment === renderTarget.texture) {
        scene.environment = null
      }
      renderTarget.dispose()
      roomEnv.dispose()
      pmremGenerator.dispose()
      renderTargetRef.current = null
    }
  }, [gl, scene])

  useEffect(() => {
    scene.environmentIntensity = intensity
  }, [scene, intensity])

  return null
}

export default StudioEnvironment
