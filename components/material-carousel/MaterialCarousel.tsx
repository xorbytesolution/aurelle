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
        end: '+=5000px',
        scrub: 1.4,
        anticipatePin: 1,
        onUpdate: (self) => {
          const p = Math.max(0, Math.min(1, self.progress))
          setProgress(p)

          // Synchronize active metal naming so the name changes ONLY when the incoming ring
          // actually arrives at the center stage, never prematurely!
          // 0.00 – 0.36: Platinum 950 (Hold 0.12 - 0.28, transit to Yellow Gold 0.28 - 0.38)
          // 0.36 – 0.58: 18K Yellow Gold (Hold 0.38 - 0.50, transit to Rose Gold 0.50 - 0.60)
          // 0.58 – 0.80: 18K Rose Gold (Hold 0.60 - 0.72, transit to Champagne Gold 0.72 - 0.82)
          // 0.80 – 1.00: Champagne Gold (Hold 0.82 - 0.90, Choice & Exit 0.90 - 1.00)
          if (p < 0.36) {
            setActiveMetal('platinum')
          } else if (p < 0.58) {
            setActiveMetal('yellow-gold')
          } else if (p < 0.80) {
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

    // Smoothly scroll window to the exact centered hold progress for this metal
    if (containerRef.current) {
      const targetP =
        metal === 'platinum' ? 0.20 : metal === 'yellow-gold' ? 0.44 : metal === 'rose-gold' ? 0.66 : 0.86

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
