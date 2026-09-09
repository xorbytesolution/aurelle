'use client'

import React from 'react'
import { PreciousMetal, PRECIOUS_METALS } from './glbMaterialClassifier'
import { materialStore, useMaterialStore } from './useMaterialStore'

interface MaterialCarouselUIProps {
  progress: number
  activeMetal: PreciousMetal
  onSelectMetal: (metal: PreciousMetal) => void
}

const METAL_LIST: { id: PreciousMetal; num: string; name: string }[] = [
  { id: 'platinum', num: '01', name: 'PLATINUM 950' },
  { id: 'yellow-gold', num: '02', name: '18K YELLOW GOLD' },
  { id: 'rose-gold', num: '03', name: '18K ROSE GOLD' },
  { id: 'champagne-gold', num: '04', name: 'CHAMPAGNE GOLD' },
]

export default function MaterialCarouselUI({
  progress,
  activeMetal,
  onSelectMetal,
}: MaterialCarouselUIProps) {
  const { selectedMaterial } = useMaterialStore()
  const spec = PRECIOUS_METALS[activeMetal]
  const selectedSpec = PRECIOUS_METALS[selectedMaterial]

  // Timeline UI phases matching calibrated luxury stages:
  // 0.00 – 0.12: ARRIVAL (header fades in)
  // 0.12 – 0.90: SPATIAL ORBIT & ACTIVE DOSSIER (Platinum -> Yellow Gold -> Rose Gold -> Champagne Gold)
  // 0.90 – 0.96: MATERIAL CHOICE ("Yours, in your metal." + "EXPLORE THE COLLECTION ↓")
  // 0.96 – 1.00: CONTINUITY EXIT
  const isArrival = progress < 0.10
  const isChoicePhase = progress >= 0.90 && progress < 0.96
  const isExitPhase = progress >= 0.96

  const currentIndex = METAL_LIST.findIndex((m) => m.id === activeMetal)

  const handleCtaClick = () => {
    const nextSection = document.getElementById('craft') || document.querySelector('.craft-story')
    if (nextSection) {
      nextSection.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <div className="material-ui-overlay">
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          TOP LEFT EDITORIAL HEADER (Static, subtle, zero ring collision)
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <header className="material-header-block">
        <span className="material-eyebrow">AURELLE · SPATIAL MATERIAL STUDY</span>
        <h2 className="material-headline">
          One Silhouette.<br />
          <em>Four Realities.</em>
        </h2>
      </header>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          RIGHT SIDE: MINIMAL TYPOGRAPHIC MATERIAL NAV RAIL
          Active gets bright text, metallic glow, longer rule
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <nav
        className="material-nav-rail"
        style={{
          opacity: isExitPhase ? 0 : 1,
          pointerEvents: isExitPhase ? 'none' : 'auto',
          transition: 'opacity 0.6s ease',
        }}
        aria-label="Precious metal orbit selector"
      >
        {METAL_LIST.map((m) => {
          const isActive = activeMetal === m.id
          return (
            <button
              key={m.id}
              className={`metal-rail-item ${isActive ? 'is-active' : ''}`}
              onClick={() => {
                materialStore.setSelectedMaterial(m.id)
                onSelectMetal(m.id)
              }}
              type="button"
            >
              <span className="rail-item-num">{m.num}</span>
              <span className="rail-item-name">{m.name}</span>
              <span className="rail-item-rule" />
            </button>
          )
        })}
      </nav>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          BOTTOM CENTER: METALLURGY DOSSIER (Cleanly below the hero ring)
          Staggered luxury editorial typography
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div
        className="material-dossier-panel"
        style={{
          opacity: !isChoicePhase && !isExitPhase ? 1 : 0,
          transform: !isChoicePhase && !isExitPhase ? 'translate(-50%, 0)' : 'translate(-50%, 20px)',
          pointerEvents: !isChoicePhase && !isExitPhase ? 'auto' : 'none',
          transition: 'all 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        <div className="dossier-stagger-mood">
          <span className="dossier-mood-quote">“{spec.mood}”</span>
        </div>

        <div className="dossier-index-track">
          <span className="dossier-index-num">{spec.label.split(' / ')[0]}</span>
          <span className="dossier-sep">/</span>
          <span className="dossier-total">04</span>
        </div>

        <h3 className="dossier-metal-name">{spec.name}</h3>

        <p className="dossier-description">{spec.description}</p>

        <div className="dossier-specs-row">
          <span className="spec-pill">{spec.purity}</span>
          <span className="spec-bullet">·</span>
          <span className="spec-pill">Density · {spec.density}</span>
        </div>

        {/* Minimalist 4-station progress track: 01 ───── 02 ───── 03 ───── 04 */}
        <div className="dossier-track-container" aria-label="Constellation progress">
          {METAL_LIST.map((m, idx) => {
            const isPassed = idx <= currentIndex
            const isCurr = idx === currentIndex
            return (
              <React.Fragment key={m.id}>
                <button
                  type="button"
                  className={`track-node ${isCurr ? 'is-current' : isPassed ? 'is-passed' : ''}`}
                  onClick={() => {
                    materialStore.setSelectedMaterial(m.id)
                    onSelectMetal(m.id)
                  }}
                  title={m.name}
                >
                  <span className="node-dot" />
                  <span className="node-num">{m.num}</span>
                </button>
                {idx < METAL_LIST.length - 1 && (
                  <div className={`track-connector ${idx < currentIndex ? 'is-active' : ''}`} />
                )}
              </React.Fragment>
            )
          })}
        </div>

        <div className="dossier-scroll-prompt">
          <span className="prompt-arrow">←</span>
          <span className="prompt-text">DRAG OR SCROLL TO ROTATE CONSTELLATION</span>
          <span className="prompt-arrow">→</span>
        </div>
      </div>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          STAGE 0.75 - 0.90: MATERIAL CHOICE CARD
          "Yours, in your metal." + "EXPLORE THE COLLECTION ↓"
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div
        className="material-choice-card"
        style={{
          opacity: isChoicePhase ? 1 : 0,
          transform: isChoicePhase ? 'translate(-50%, 0)' : 'translate(-50%, 24px)',
          pointerEvents: isChoicePhase ? 'auto' : 'none',
          transition: 'all 0.7s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        <span className="choice-eyebrow">AURELLE · HAUTE JOAILLERIE</span>
        <h3 className="choice-title">
          Yours,<br />
          <em>in your metal.</em>
        </h3>
        <p className="choice-subtext">
          Currently configured in <strong>{selectedSpec.name}</strong>. Four distinct realities, one sculptural soul.
        </p>

        <button
          type="button"
          className="choice-cta-btn"
          onClick={handleCtaClick}
        >
          <span>EXPLORE THE COLLECTION</span>
          <span className="cta-arrow">↓</span>
        </button>
      </div>
    </div>
  )
}
