'use client'

import React, { useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import type { RingMaterialType } from './RingCanvas'

const RingCanvas = dynamic(() => import('./RingCanvas'), {
  ssr: false,
})

interface SignatureSectionProps {
  heroIntroReady?: boolean
}

export default function SignatureSection({ heroIntroReady = false }: SignatureSectionProps) {
  const sectionRef = useRef<HTMLElement>(null)
  const flashRef = useRef<HTMLDivElement>(null)
  const canvasWrapRef = useRef<HTMLDivElement>(null)
  const orbitRef = useRef<HTMLDivElement>(null)

  const [scrollProgress, setScrollProgress] = useState(0)
  const [selectedMaterial, setSelectedMaterial] = useState<RingMaterialType>('champagne-gold')
  const [isDragging, setIsDragging] = useState(false)

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger)

    const ctx = gsap.context(() => {
      if (!sectionRef.current) return

      // SVG Callouts elements
      const callout1Line = document.querySelector<SVGPathElement>('.callout-path-1')
      const callout1Dot = document.querySelector<SVGCircleElement>('.callout-dot-1')
      const callout1Text = document.querySelector<HTMLElement>('.label-solitaire')

      const callout2Line = document.querySelector<SVGPathElement>('.callout-path-2')
      const callout2Dot = document.querySelector<SVGCircleElement>('.callout-dot-2')
      const callout2Text = document.querySelector<HTMLElement>('.label-pave')

      const callout3Line = document.querySelector<SVGPathElement>('.callout-path-3')
      const callout3Dot = document.querySelector<SVGCircleElement>('.callout-dot-3')
      const callout3Text = document.querySelector<HTMLElement>('.label-gold')

      const callout4Line = document.querySelector<SVGPathElement>('.callout-path-4')
      const callout4Dot = document.querySelector<SVGCircleElement>('.callout-dot-4')
      const callout4Text = document.querySelector<HTMLElement>('.label-prongs')

      const allLines = [callout1Line, callout2Line, callout3Line, callout4Line].filter(Boolean) as SVGPathElement[]
      const allDots = [callout1Dot, callout2Dot, callout3Dot, callout4Dot].filter(Boolean) as SVGCircleElement[]
      const allTexts = [callout1Text, callout2Text, callout3Text, callout4Text].filter(Boolean) as HTMLElement[]

      // Strictly hide all callout containers outside Chapter 02
      gsap.set('.cinema-svg-callouts', { autoAlpha: 0 })
      gsap.set('.callout-labels-container', { autoAlpha: 0 })

      allLines.forEach((p) => {
        const len = p.getTotalLength?.() || 350
        gsap.set(p, { strokeDasharray: len, strokeDashoffset: len })
      })
      allDots.forEach((d) => gsap.set(d, { scale: 0, transformOrigin: '50% 50%', autoAlpha: 0 }))
      allTexts.forEach((t) => gsap.set(t, { autoAlpha: 0, y: 10 }))

      if (flashRef.current) gsap.set(flashRef.current, { autoAlpha: 0 })
      if (orbitRef.current) gsap.set(orbitRef.current, { autoAlpha: 0, scale: 0.88 })

      const stageUIs = gsap.utils.toArray<HTMLElement>('.cinema-stage-ui')
      stageUIs.forEach((ui, i) => {
        gsap.set(ui, { autoAlpha: i === 0 ? 1 : 0, y: i === 0 ? 0 : 20 })
      })

      // Master continuous 0.00 -> 1.00 scroll timeline
      // Scrub 0.9 eliminates delayed rubber-band catch-up surges while Three.js provides velvety mass damping
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top top',
          end: () => (window.innerWidth < 768 ? '+=6000' : '+=9500'),
          scrub: 0.9,
          pin: true,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          onUpdate: (self) => {
            setScrollProgress(self.progress)
          },
        },
      })

      // Staggered Editorial Reveal (Component 08: Temporal Layering)
      // Eyebrow -> Headline (+12px drift) -> Subtext (+8px drift) -> Right details
      const enterStage = (selector: string, atTime: number, dur = 0.04) => {
        tl.to(selector, { autoAlpha: 1, duration: 0.005 }, atTime)
        tl.fromTo(`${selector} .stage-eyebrow`, { autoAlpha: 0 }, { autoAlpha: 1, duration: dur * 0.7, ease: 'power1.out' }, atTime)
        tl.fromTo(`${selector} .stage-headline-clean, ${selector} .stage-headline`, { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: dur, ease: 'power2.out' }, atTime + 0.004)
        tl.fromTo(`${selector} .stage-subtext`, { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0, duration: dur * 0.9, ease: 'power2.out' }, atTime + 0.008)
        tl.fromTo(`${selector} .stage-right-block`, { autoAlpha: 0, y: 6 }, { autoAlpha: 1, y: 0, duration: dur * 0.85, ease: 'power1.out' }, atTime + 0.010)
      }

      // Gentle Upward Editorial Dissolve (overlapping with incoming stage)
      const exitStage = (selector: string, atTime: number, dur = 0.035) => {
        tl.to(`${selector} .stage-eyebrow, ${selector} .stage-subtext, ${selector} .stage-right-block`, { autoAlpha: 0, duration: dur * 0.75, ease: 'power1.in' }, atTime)
        tl.to(`${selector} .stage-headline-clean, ${selector} .stage-headline`, { autoAlpha: 0, y: -10, duration: dur, ease: 'power1.in' }, atTime + 0.004)
        tl.to(selector, { autoAlpha: 0, duration: 0.005 }, atTime + dur)
      }

      /* =======================================================================
         0.00 -> 0.05 : BLACK VOID
         0.05 -> 0.20 : RING HERO
         ======================================================================= */
      // Hero headline gently dissolves out
      exitStage('.stage-ui-hero', 0.06, 0.08)

      /* =======================================================================
         0.20 -> 0.34 : ANATOMY (Sequential Callouts: 1 at a time)
         ======================================================================= */
      enterStage('.stage-ui-anatomy', 0.20, 0.045)
      // Reveal SVG container only during anatomy
      tl.to(['.cinema-svg-callouts', '.callout-labels-container'], { autoAlpha: 1, duration: 0.02 }, 0.20)

      // Callout 1: Solitaire (0.20 -> 0.235)
      if (callout1Line) tl.to(callout1Line, { strokeDashoffset: 0, duration: 0.025, ease: 'power2.out' }, 0.20)
      if (callout1Dot) tl.to(callout1Dot, { scale: 1, autoAlpha: 1, duration: 0.02, ease: 'back.out(2)' }, 0.20)
      if (callout1Text) tl.to(callout1Text, { autoAlpha: 1, y: 0, duration: 0.025, ease: 'power2.out' }, 0.205)
      if (callout1Text) tl.to(callout1Text, { autoAlpha: 0, y: -8, duration: 0.018, ease: 'power2.in' }, 0.235)
      if (callout1Line) tl.to(callout1Line, { strokeDashoffset: callout1Line.getTotalLength?.() || 350, duration: 0.018, ease: 'power2.in' }, 0.235)
      if (callout1Dot) tl.to(callout1Dot, { scale: 0, autoAlpha: 0, duration: 0.018 }, 0.235)

      // Callout 2: Pavé (0.235 -> 0.270)
      if (callout2Line) tl.to(callout2Line, { strokeDashoffset: 0, duration: 0.025, ease: 'power2.out' }, 0.235)
      if (callout2Dot) tl.to(callout2Dot, { scale: 1, autoAlpha: 1, duration: 0.02, ease: 'back.out(2)' }, 0.235)
      if (callout2Text) tl.to(callout2Text, { autoAlpha: 1, y: 0, duration: 0.025, ease: 'power2.out' }, 0.240)
      if (callout2Text) tl.to(callout2Text, { autoAlpha: 0, y: -8, duration: 0.018, ease: 'power2.in' }, 0.270)
      if (callout2Line) tl.to(callout2Line, { strokeDashoffset: callout2Line.getTotalLength?.() || 350, duration: 0.018, ease: 'power2.in' }, 0.270)
      if (callout2Dot) tl.to(callout2Dot, { scale: 0, autoAlpha: 0, duration: 0.018 }, 0.270)

      // Callout 3: 18K Gold (0.270 -> 0.305)
      if (callout3Line) tl.to(callout3Line, { strokeDashoffset: 0, duration: 0.025, ease: 'power2.out' }, 0.270)
      if (callout3Dot) tl.to(callout3Dot, { scale: 1, autoAlpha: 1, duration: 0.02, ease: 'back.out(2)' }, 0.270)
      if (callout3Text) tl.to(callout3Text, { autoAlpha: 1, y: 0, duration: 0.025, ease: 'power2.out' }, 0.275)
      if (callout3Text) tl.to(callout3Text, { autoAlpha: 0, y: -8, duration: 0.018, ease: 'power2.in' }, 0.305)
      if (callout3Line) tl.to(callout3Line, { strokeDashoffset: callout3Line.getTotalLength?.() || 350, duration: 0.018, ease: 'power2.in' }, 0.305)
      if (callout3Dot) tl.to(callout3Dot, { scale: 0, autoAlpha: 0, duration: 0.018 }, 0.305)

      // Callout 4: Prongs / Cathedral (0.305 -> 0.340)
      if (callout4Line) tl.to(callout4Line, { strokeDashoffset: 0, duration: 0.025, ease: 'power2.out' }, 0.305)
      if (callout4Dot) tl.to(callout4Dot, { scale: 1, autoAlpha: 1, duration: 0.02, ease: 'back.out(2)' }, 0.305)
      if (callout4Text) tl.to(callout4Text, { autoAlpha: 1, y: 0, duration: 0.025, ease: 'power2.out' }, 0.310)
      if (callout4Text) tl.to(callout4Text, { autoAlpha: 0, y: -8, duration: 0.018, ease: 'power2.in' }, 0.338)
      if (callout4Line) tl.to(callout4Line, { strokeDashoffset: callout4Line.getTotalLength?.() || 350, duration: 0.018, ease: 'power2.in' }, 0.338)
      if (callout4Dot) tl.to(callout4Dot, { scale: 0, autoAlpha: 0, duration: 0.018 }, 0.338)

      // Ensure SVG container is 100% hidden at end of anatomy
      tl.to(['.cinema-svg-callouts', '.callout-labels-container'], { autoAlpha: 0, duration: 0.018 }, 0.338)
      exitStage('.stage-ui-anatomy', 0.33, 0.03)

      /* =======================================================================
         0.34 -> 0.46 : SILHOUETTE EMERGES (Smooth 12% scroll window)
         ======================================================================= */
      enterStage('.stage-ui-silhouette', 0.36, 0.04)
      exitStage('.stage-ui-silhouette', 0.43, 0.025)

      /* =======================================================================
         0.46 -> 0.56 : THE TOUCH / LIVING HAND
         ======================================================================= */
      enterStage('.stage-ui-hand', 0.47, 0.04)
      exitStage('.stage-ui-hand', 0.535, 0.025)

      /* =======================================================================
         0.56 -> 0.64 : THE APPROACH (Smooth 8% scroll window)
         ======================================================================= */
      enterStage('.stage-ui-approach', 0.57, 0.04)
      exitStage('.stage-ui-approach', 0.635, 0.025)

      /* =======================================================================
         0.68 -> 0.77 : THE SACRED SLIDE — CONTINUOUS LUXURY EMBRACE 💍
         ======================================================================= */
      enterStage('.stage-ui-embrace', 0.685, 0.04)
      exitStage('.stage-ui-embrace', 0.745, 0.025)

      /* =======================================================================
         0.77 -> 0.83 : 360° LIVING SHOWCASE (Hand & Ring in Dorsal Alignment)
         ======================================================================= */
      enterStage('.stage-ui-orbit', 0.775, 0.03)
      exitStage('.stage-ui-orbit', 0.815, 0.015)

      /* =======================================================================
         0.83 -> 0.90 : THE SACRED UNTHREADING (Smooth, fluid slide off the finger)
         ======================================================================= */
      enterStage('.stage-ui-proximity', 0.835, 0.03)
      exitStage('.stage-ui-proximity', 0.885, 0.015)

      /* =======================================================================
         0.90 -> 0.96 : THE CELESTIAL TRAVELING FLIGHT (Dynamic zero-g flight)
         ======================================================================= */
      enterStage('.stage-ui-macro', 0.905, 0.03)
      exitStage('.stage-ui-macro', 0.948, 0.012)

      /* =======================================================================
         0.960 -> 1.000 : THE THRESHOLD / TRANSIT INTO MATERIAL STUDY
         ======================================================================= */
      enterStage('.stage-ui-masterpiece', 0.960, 0.025)
      exitStage('.stage-ui-masterpiece', 0.996, 0.003)
      if (canvasWrapRef.current) {
        tl.to(canvasWrapRef.current, { autoAlpha: 0, duration: 0.002, ease: 'power1.in' }, 0.999)
      }
    }, sectionRef)

    return () => ctx.revert()
  }, [])

  return (
    <section
      ref={sectionRef}
      className="signature-cinema-story section-dark"
      id="signature-piece"
      aria-label="Aurelle Signature Piece — Continuous Cinematic 3D Journey"
    >
      {/* Specular Flash Bloom Portal */}
      <div className="cinema-specular-flash" ref={flashRef} aria-hidden="true" />

      {/* 3D WebGL Canvas Layer (Unified Hand + Ring Scene) */}
      <div className="signature-canvas-wrap" ref={canvasWrapRef}>
        <RingCanvas
          progress={scrollProgress}
          materialType={selectedMaterial}
          onDragStateChange={setIsDragging}
          heroIntroReady={heroIntroReady}
        />
      </div>

      {/* Atmospheric Soft Noir Vignette */}
      <div className="cinema-atmospheric-vignette" aria-hidden="true" />

      {/* =======================================================================
          DYNAMIC SVG LUXURY TECHNICAL ANNOTATION CALLOUTS (0.18 - 0.32)
          ======================================================================= */}
      <svg className="cinema-svg-callouts" viewBox="0 0 1000 1000" preserveAspectRatio="none" aria-hidden="true">
        {/* 01: Solitaire Crown */}
        <g className="callout-group group-solitaire">
          <path className="callout-path callout-path-1" d="M 625 415 L 690 270 L 775 270" fill="none" />
          <circle className="callout-dot callout-dot-1" cx="625" cy="415" r="4" />
        </g>
        {/* 02: Dual Eternity Pavé */}
        <g className="callout-group group-pave">
          <path className="callout-path callout-path-2" d="M 460 540 L 340 620 L 190 620" fill="none" />
          <circle className="callout-dot callout-dot-2" cx="460" cy="540" r="4" />
        </g>
        {/* 03: 18K White Gold Chassis */}
        <g className="callout-group group-gold">
          <path className="callout-path callout-path-3" d="M 545 530 L 670 630 L 800 630" fill="none" />
          <circle className="callout-dot callout-dot-3" cx="545" cy="530" r="4" />
        </g>
        {/* 04: Cathedral Prongs */}
        <g className="callout-group group-prongs">
          <path className="callout-path callout-path-4" d="M 475 390 L 350 300 L 210 300" fill="none" />
          <circle className="callout-dot callout-dot-4" cx="475" cy="390" r="4" />
        </g>
      </svg>

      {/* HTML Labels for Callouts positioned via percentage coordinates */}
      <div className="callout-labels-container" aria-hidden="true">
        <div className="callout-label label-solitaire">
          <span className="callout-num">01</span>
          <span className="callout-title">SOLITAIRE CROWN</span>
          <span className="callout-spec">1.5ct Brilliant Cut · F / VVS1</span>
        </div>
        <div className="callout-label label-pave">
          <span className="callout-num">02</span>
          <span className="callout-title">DUAL ETERNITY PAVÉ</span>
          <span className="callout-spec">Twin Hand-Set Rows · 0.8ct</span>
        </div>
        <div className="callout-label label-gold">
          <span className="callout-num">03</span>
          <span className="callout-title">18K CHAMPAGNE GOLD</span>
          <span className="callout-spec">Sculpted Milgrain Equator</span>
        </div>
        <div className="callout-label label-prongs">
          <span className="callout-num">04</span>
          <span className="callout-title">CATHEDRAL PRONGS</span>
          <span className="callout-spec">Four-Prong Floating Elevation</span>
        </div>
      </div>

      {/* =======================================================================
          EDITORIAL CINEMATIC UI STAGES (Synchronized to 0.00 -> 1.00 Timeline)
          ======================================================================= */}
      <div className="cinema-editorial-ui">
        {/* 0.00 - 0.05: HERO TITLE */}
        <div className="cinema-stage-ui stage-ui-hero">
          <div className="stage-left-block">
            <span className="stage-eyebrow gold">Haute Joaillerie / Paris</span>
            <h1 className="stage-headline">
              The Doji<br />
              <em>Solitaire</em>
            </h1>
            <p className="stage-subtext">Sculpted in 18K Champagne Gold · 1.5ct Brilliant Diamond</p>
          </div>
          <div className="stage-right-block right-aligned">
            <div className="stage-step-num">00</div>
            <div className="stage-scroll-prompt">
              <span>Scroll to enter film</span>
              <div className="scroll-pill-indicator">
                <span className="scroll-pill-dash" />
              </div>
            </div>
          </div>
        </div>

        {/* 0.18 - 0.32: ANATOMY */}
        <div className="cinema-stage-ui stage-ui-anatomy">
          <div className="stage-left-block">
            <span className="stage-eyebrow gold">01 / Architecture</span>
            <h2 className="stage-headline-clean">
              Sacred<br />
              Geometry
            </h2>
            <p className="stage-subtext">Engineered for infinite internal scintillation.</p>
          </div>
        </div>

        {/* 0.38 - 0.48: SILHOUETTE EMERGES */}
        <div className="cinema-stage-ui stage-ui-silhouette">
          <div className="stage-left-block">
            <span className="stage-eyebrow gold">02 / The Silhouette</span>
            <h2 className="stage-headline-clean">
              Form<br />
              in Shadow
            </h2>
            <p className="stage-subtext">A platinum rim light reveals the hand in darkness.</p>
          </div>
        </div>

        {/* 0.48 - 0.58: THE TOUCH / LIVING HAND */}
        <div className="cinema-stage-ui stage-ui-hand">
          <div className="stage-left-block">
            <span className="stage-eyebrow gold">03 / The Living Hand</span>
            <h2 className="stage-headline-clean">
              Poetry<br />
              in <em>Motion</em>
            </h2>
          </div>
          <div className="stage-right-block right-aligned">
            <p className="stage-right-eyebrow">
              Subtle Grace<br />Awakening
            </p>
            <span className="stage-right-rule" />
          </div>
        </div>

        {/* 0.58 - 0.66: THE APPROACH */}
        <div className="cinema-stage-ui stage-ui-approach">
          <div className="stage-left-block">
            <span className="stage-eyebrow gold">04 / The Approach</span>
            <h2 className="stage-headline-clean">
              Drawn by<br />
              <em>Grace</em>
            </h2>
            <p className="stage-subtext">Ring descending along the finger axis. A moment of pure intention.</p>
          </div>
        </div>

        {/* 0.66 - 0.74: THE EMBRACE / CONTINUOUS SLIDE 💍 */}
        <div className="cinema-stage-ui stage-ui-embrace">
          <div className="stage-left-block">
            <span className="stage-eyebrow gold">05 / The Union</span>
            <h2 className="stage-headline-clean">
              The Sacred<br />
              <em>Embrace</em>
            </h2>
          </div>
          <div className="stage-right-block right-aligned">
            <p className="stage-right-eyebrow">
              Worn Against<br />the Skin
            </p>
            <span className="stage-right-rule" />
          </div>
        </div>

        {/* 0.78 - 0.84: 360° LIVING SHOWCASE */}
        <div className="cinema-stage-ui stage-ui-orbit">
          <div className="stage-left-block">
            <span className="stage-eyebrow gold">06 / 360° Living Showcase</span>
            <h2 className="stage-headline-clean">
              Sculpted<br />
              <em>Harmony</em>
            </h2>
            <p className="stage-subtext">The hand orbits 360° in living light while the diamond remains anchored in timeless poise.</p>
          </div>
          <div className="stage-right-block right-aligned">
            <p className="stage-right-eyebrow">
              360° Living<br />Showcase
            </p>
            <span className="stage-right-rule" />
            <div className="stage-inspection-hint" aria-hidden="true">
              <span className="hint-sparkle">✦</span>
              <span>Drag to rotate 360° · Scroll to release</span>
            </div>
          </div>
        </div>

        {/* 0.82 - 0.88: THE SACRED RELEASE */}
        <div className="cinema-stage-ui stage-ui-proximity">
          <div className="stage-left-block">
            <span className="stage-eyebrow gold">07 / The Sacred Release</span>
            <h2 className="stage-headline-clean">
              Ascending<br />
              <em>Weightless</em>
            </h2>
            <p className="stage-subtext">The ring unthreads gracefully off the finger, taking flight into pure space.</p>
          </div>
          <div className="stage-right-block right-aligned">
            <p className="stage-right-eyebrow">
              Liberation<br />into Light
            </p>
            <span className="stage-right-rule" />
          </div>
        </div>

        {/* 0.88 - 0.95: CELESTIAL TRANSIT */}
        <div className="cinema-stage-ui stage-ui-macro">
          <div className="stage-left-block">
            <span className="stage-eyebrow gold">08 / Celestial Transit</span>
            <h2 className="stage-headline-clean">
              In Pure<br />
              <em>Flight</em>
            </h2>
            <p className="stage-subtext">57 brilliant facets dancing in spatial zero gravity toward the constellation.</p>
          </div>
          <div className="stage-right-block right-aligned">
            <p className="stage-right-eyebrow">
              Spatial Flight<br />57 Facets
            </p>
            <span className="stage-right-rule" />
            <div className="stage-inspection-hint" aria-hidden="true" style={{ marginTop: '0.75rem' }}>
              <span className="hint-sparkle">✦</span>
              <span>360° Living Orbit · Drag to rotate</span>
            </div>
          </div>
        </div>

        {/* 0.95 - 1.00: THE THRESHOLD */}
        <div className="cinema-stage-ui stage-ui-masterpiece">
          <div className="stage-left-block">
            <span className="stage-eyebrow gold">09 / The Threshold</span>
            <h2 className="stage-headline-clean">
              The Aurelle<br />
              <em>Doji</em>
            </h2>
            <p className="stage-subtext">
              1.5ct Solitaire · Descending into the Spatial Constellation
            </p>

            <div className="stage-cta-group">
              <a href="#materials" className="cinema-explore-btn">
                <span>ENTER MATERIAL STUDY</span>
                <span className="btn-arrow">↓</span>
              </a>
              <a href="#atelier" className="cinema-secondary-btn">
                <span>DISCOVER ATELIER</span>
              </a>
            </div>
          </div>

          <div className="stage-right-block right-aligned">
            <div className="stage-climax-copy">
              <p className="stage-right-eyebrow">
                Timeless<br />by Design
              </p>
              <p className="stage-right-eyebrow sub-eyebrow">
                Yours<br />by Story
              </p>
              <span className="stage-right-rule" />
            </div>

            <div className="stage-inspection-hint" aria-hidden="true">
              <span className="hint-sparkle">✦</span>
              <span>360° Spatial Showcase · Drag to rotate</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
