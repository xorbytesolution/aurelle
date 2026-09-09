'use client'

import React, { useRef, useState, useEffect } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import MaterialRingScene from './MaterialRingScene'
import MaterialCarouselUI from './MaterialCarouselUI'
import { PreciousMetal } from './glbMaterialClassifier'
import { materialStore, useMaterialStore } from './useMaterialStore'

gsap.registerPlugin(ScrollTrigger)

export default function MaterialCarousel() {
  const containerRef = useRef<HTMLDivElement>(null)
  const pinRef = useRef<HTMLDivElement>(null)
  const [progress, setProgress] = useState(0)
  const [activeMetal, setActiveMetal] = useState<PreciousMetal>('platinum')
  const { selectedMaterial } = useMaterialStore()

  useEffect(() => {
    if (!containerRef.current || !pinRef.current) return

    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: containerRef.current,
        pin: pinRef.current,
        start: 'top top',
        end: '+=3800px',
        scrub: 1.0,
        anticipatePin: 1,
        onUpdate: (self) => {
          const p = Math.max(0, Math.min(1, self.progress))
          setProgress(p)

          // Smoothly synchronize active metal name across the continuous orbit
          // 0: Platinum, 1: Yellow Gold, 2: Rose Gold, 3: Champagne Gold
          const normP = Math.max(0, Math.min(1, (p - 0.08) / 0.78))
          const approxIdx = Math.round(normP * 3)
          if (approxIdx <= 0) {
            setActiveMetal('platinum')
          } else if (approxIdx === 1) {
            setActiveMetal('yellow-gold')
          } else if (approxIdx === 2) {
            setActiveMetal('rose-gold')
          } else {
            setActiveMetal('champagne-gold')
          }
        },
      })
    }, containerRef)

    return () => ctx.revert()
  }, [])

  const handleSelectMetal = (metal: PreciousMetal) => {
    setActiveMetal(metal)
    materialStore.setSelectedMaterial(metal)

    // Smoothly scroll window to the exact centered station for this metal
    if (containerRef.current) {
      const targetP =
        metal === 'platinum' ? 0.12 : metal === 'yellow-gold' ? 0.36 : metal === 'rose-gold' ? 0.62 : 0.86

      const trigger = ScrollTrigger.getAll().find(
        (st) => st.trigger === containerRef.current
      )
      if (trigger) {
        const targetScroll = trigger.start + targetP * (trigger.end - trigger.start)
        window.scrollTo({
          top: targetScroll,
          behavior: 'smooth',
        })
      }
    }
  }

  return (
    <section
      ref={containerRef}
      id="materials"
      className="material-carousel-container"
      aria-label="Aurelle 3D Spatial Material Study"
      style={{ position: 'relative', width: '100%', background: '#050505' }}
    >
      <div
        ref={pinRef}
        className="material-pin-stage"
        style={{
          position: 'relative',
          width: '100vw',
          height: '100vh',
          overflow: 'hidden',
          background: 'radial-gradient(ellipse 80% 80% at 50% 40%, #0d1014 0%, #050505 100%)',
        }}
      >
        {/* 3D WebGL Spatial Jewellery Universe Scene */}
        <MaterialRingScene
          progress={progress}
          onMetalChange={(m) => setActiveMetal(m)}
        />

        {/* Minimalist Editorial Luxury UI Layer */}
        <MaterialCarouselUI
          progress={progress}
          activeMetal={activeMetal}
          onSelectMetal={handleSelectMetal}
        />
      </div>
    </section>
  )
}
