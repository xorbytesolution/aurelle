'use client'

import React, { useEffect, useRef, useState, useCallback } from 'react'
import Image from 'next/image'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from '@studio-freight/lenis'
import dynamic from 'next/dynamic'
import SignatureSection from '@/components/signature-ring/SignatureSection'
import OpeningSequence from '@/components/opening-sequence/OpeningSequence'
import MaterialCarousel from '@/components/material-carousel/MaterialCarousel'

const Collection3DViewer = dynamic(
  () => import('@/components/collections/Collection3DViewer'),
  { ssr: false }
)

gsap.registerPlugin(ScrollTrigger)

const collections = [
  {
    number: '01',
    chapter: 'Chapter I',
    title: 'Lumière',
    subtitle: 'The Solitaire Doji. Light, held still in 18K white gold and pure platinum 950.',
    image: '/images/aurelle-masterwork.jpg',
    metalTag: 'Platinum 950 & 18K White Gold',
    diamondTag: '1.50ct Solitaire · VVS1 / F',
    facets: '57 Brilliant Facets · Triple Ex',
    provenance: 'Place Vendôme Master Atelier',
  },
  {
    number: '02',
    chapter: 'Chapter II',
    title: 'Nocturne',
    subtitle: 'For the hours after dark. Deep pavé luster set in warm 18K champagne gold.',
    image: '/images/aurelle-hero.png',
    metalTag: '18K Champagne Gold',
    diamondTag: '0.85ct Micro-Pavé Eternity',
    facets: 'Full Cut French Bead Setting',
    provenance: 'Mayfair High Jewellery Vault',
  },
  {
    number: '03',
    chapter: 'Chapter III',
    title: 'Élan',
    subtitle: 'A study in architectural sculpture, organic curves, and timeless movement.',
    image: '/images/aurelle-craft.png',
    metalTag: 'Recycled 18K Yellow Gold',
    diamondTag: 'South Sea Pearl & Diamonds',
    facets: 'Cabochon & Brilliant Drop',
    provenance: 'Ginza Haute Joaillerie Studio',
  },
]

const pieces = [
  {
    id: 'AUR-SOL-01',
    name: 'Solitaire No. 01 — Doji',
    category: 'solitaire',
    detail: '18k white gold · 1.5ct solitaire · pavé twin bands',
    price: '€ 4,800',
    carat: '1.50 ct',
    clarity: 'VVS1 / F Color',
    cut: 'Round Brilliant (57 Facets)',
    metal: '18K White Gold & Platinum 950',
    purity: 'Pt 950 / Au 750',
    gia: 'GIA #74829104',
    image: '/images/aurelle-masterwork.jpg',
  },
  {
    id: 'AUR-SER-02',
    name: 'The Serein Band',
    category: 'band',
    detail: '18k champagne gold · 0.8ct pavé eternity',
    price: '€ 3,250',
    carat: '0.85 ct Total',
    clarity: 'VS1 / E-F Color',
    cut: 'Micro-Brilliant Pavé',
    metal: '18K Champagne Gold',
    purity: 'Au 750',
    gia: 'GIA #61940283',
    image: '/images/aurelle-hero.png',
  },
  {
    id: 'AUR-AUB-03',
    name: 'Aube Pendant',
    category: 'pendant',
    detail: 'Recycled 18k gold · South Sea freshwater pearl',
    price: '€ 2,100',
    carat: '0.35 ct Diamond Accent',
    clarity: 'Lustrous Natural Pearl',
    cut: 'Cabochon & Brilliant Drop',
    metal: 'Recycled 18K Yellow Gold',
    purity: 'Au 750 Bullion',
    gia: 'GIA #55021948',
    image: '/images/aurelle-craft.png',
  },
  {
    id: 'AUR-VEN-04',
    name: 'Vendôme Cuff',
    category: 'band',
    detail: 'Solid 18k white gold · pavé brilliant-cut diamonds',
    price: '€ 6,400',
    carat: '1.80 ct Total',
    clarity: 'VVS2 / G Color',
    cut: 'Geometric Pavé Setting',
    metal: 'Solid 18K White Gold',
    purity: 'Au 750 Solid',
    gia: 'GIA #88204917',
    image: '/images/aurelle-stage-crafted.jpg',
  },
  {
    id: 'AUR-NOC-05',
    name: 'Nocturne Solitaire',
    category: 'solitaire',
    detail: '2.4ct emerald cut · Platinum 950 · bespoke facet',
    price: '€ 14,200',
    carat: '2.40 ct Solitaire',
    clarity: 'IF / D Flawless',
    cut: 'Step-Cut Emerald Facet',
    metal: 'Pure Platinum 950',
    purity: 'Pt 950 Pure',
    gia: 'GIA #90348122',
    image: '/images/aurelle-stage-polished.jpg',
  },
]

const craftStages = [
  {
    num: '01',
    phase: 'Phase 01 — Conception',
    title: 'Designed.',
    caption: 'Conceived in raw charcoal and light. Architectural balance meets quiet desire.',
    image: '/images/aurelle-stage-designed.jpg',
    temp: '21°C Studio',
    hours: '120h Drafting',
    hallmark: 'PARIS ARCHIVE ✦ EST. 1892',
    detail: 'Hand-rendered in 1:1 gouache scale with diamond pavilion geometry maps.',
  },
  {
    num: '02',
    phase: 'Phase 02 — Metallurgy',
    title: 'Crafted.',
    caption: 'Recycled 18-karat gold forged and sculpted by hand at our Parisian workbench.',
    image: '/images/aurelle-stage-crafted.jpg',
    temp: '1,064°C Crucible',
    hours: '84h Master Smithing',
    hallmark: 'AU750 / PT950 CERTIFIED',
    detail: 'Induction-cast precious bullion cold-worked to tensile ring perfection.',
  },
  {
    num: '03',
    phase: 'Phase 03 — Lapidary',
    title: 'Polished.',
    caption: 'Hand-burnished to mirror brilliance, catching every fracture of ambient light.',
    image: '/images/aurelle-stage-polished.jpg',
    temp: '32°C Lapidary',
    hours: '60h Walnut Shell Burnish',
    hallmark: 'TÊTE D\'AIGLE HALLMARK',
    detail: 'Progressive diamond compound mirror polish down to 0.25-micron grain.',
  },
  {
    num: '04',
    phase: 'Phase 04 — Masterwork',
    title: 'Perfected.',
    caption: 'Individually numbered and hallmarked. The Doji Diamond Ring, crafted to outlive lifetimes.',
    image: '/images/aurelle-masterwork.jpg',
    temp: '19°C Safe Vault',
    hours: 'Final Sign-off',
    hallmark: 'GIA ✦ BESPOKE CREST',
    detail: 'Triple Excellent cut grading with laser-inscribed provenance hallmark.',
  },
]

const galleryExhibits = [
  {
    id: 1,
    badge: 'Exhibit 01 / Pavilion Macro',
    title: '57-Facet Light Dispersion',
    subtitle: 'Pure internal refraction captured under 100x gemmological illumination.',
    image: '/images/aurelle-masterwork.jpg',
    aspect: 'gallery-tall',
    specs: {
      cut: 'Round Brilliant (Ideal)',
      crownAngle: '34.5° Optimum',
      pavilionDepth: '43.1% Critical Angle',
      lightReturn: '99.8% Dispersion Index',
      polish: 'Mirror Grade Haute Joaillerie',
    },
  },
  {
    id: 2,
    badge: 'Exhibit 02 / Chiaroscuro Forge',
    title: 'Atelier Metallurgy',
    subtitle: 'Hand chiseled and burnished at our historic Place Vendôme studio workbench.',
    image: '/images/aurelle-stage-crafted.jpg',
    aspect: 'gallery-dark',
    specs: {
      alloy: 'Au750 / Pt950 Certified',
      tensileStrength: '480 MPa Cold Forged',
      finish: 'Walnut Shell Mirror Polish',
      hallmark: 'French State Eagle Head',
      artisan: 'Master Goldsmith Signature',
    },
  },
  {
    id: 3,
    badge: 'Exhibit 03 / Nocturne Alignment',
    title: 'Micro-Pavé Constellation',
    subtitle: '108 calibrated brilliant diamonds aligned under microscope with zero gap.',
    image: '/images/aurelle-hero.png',
    aspect: 'gallery-wide',
    specs: {
      gemCount: '108 Micro-Brilliants',
      setting: 'French Bead Micro-Pavé',
      colorGrade: 'D-F Colorless Assorted',
      clarityGrade: 'VVS1 Flawless Eye Clean',
      metal: '18K Champagne Gold Alloy',
    },
  },
]

const boutiques = [
  {
    city: 'Paris Vendôme',
    address: '14 Place Vendôme, 75001 Paris',
    hours: 'Mon–Sat, 10:00–19:00',
    tz: 'Europe/Paris',
    coords: '48.8675° N, 2.3294° E',
  },
  {
    city: 'London Bond St',
    address: '28 Old Bond Street, Mayfair, London',
    hours: 'Mon–Sat, 10:00–18:30',
    tz: 'Europe/London',
    coords: '51.5090° N, 0.1415° W',
  },
  {
    city: 'New York Madison',
    address: '680 Madison Avenue, New York, NY',
    hours: 'Mon–Sat, 11:00–19:00',
    tz: 'America/New_York',
    coords: '40.7648° N, 73.9712° W',
  },
  {
    city: 'Tokyo Ginza',
    address: '5-7-2 Ginza, Chuo-ku, Tokyo',
    hours: 'Daily, 11:00–20:00',
    tz: 'Asia/Tokyo',
    coords: '35.6712° N, 139.7650° E',
  },
]

export default function Page() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [saved, setSaved] = useState<number | null>(null)
  const [activeCollection, setActiveCollection] = useState(0)
  const [hoveredPiece, setHoveredPiece] = useState<(typeof pieces)[0] | null>(null)

  // Interactive Catalog Filter
  const [catalogCategory, setCatalogCategory] = useState<'all' | 'solitaire' | 'band' | 'pendant'>('all')

  // Interactive Exhibition Lightbox
  const [activeExhibitModal, setActiveExhibitModal] = useState<number | null>(null)

  // Collections Interactive Diamond Loupe
  const [loupeState, setLoupeState] = useState({
    visible: false,
    x: 0,
    y: 0,
    percentX: 50,
    percentY: 50,
  })

  // Manifesto Spotlight Cursor Tracker
  const [manifestoSpotlight, setManifestoSpotlight] = useState({ x: 500, y: 300 })

  // Boutique World Clocks
  const [clockTimes, setClockTimes] = useState({
    paris: '--:--',
    london: '--:--',
    newyork: '--:--',
    tokyo: '--:--',
  })

  // Interactive Quick View Drawer & Bespoke Salon states
  const [selectedPieceModal, setSelectedPieceModal] = useState<(typeof pieces)[0] | null>(null)
  const [selectedBoutique, setSelectedBoutique] = useState('Paris Vendôme')
  const [bookingExperience, setBookingExperience] = useState('Bespoke Solitaire Commission')
  const [bookingSubmitted, setBookingSubmitted] = useState(false)
  const [reservationCode, setReservationCode] = useState('AUR-PAR-8921')
  const [bookingForm, setBookingForm] = useState({
    name: '',
    email: '',
    date: '',
    guests: '1 Guest',
    notes: '',
  })
  const [heroIntroReady, setHeroIntroReady] = useState(false)
  const [navScrolled, setNavScrolled] = useState(false)

  const root = useRef<HTMLElement>(null)
  const cursor = useRef<HTMLDivElement>(null)
  const pieceCursorRef = useRef<HTMLDivElement>(null)

  // Navbar scroll-shrink: add `is-scrolled` class after 60px
  useEffect(() => {
    const onScroll = () => setNavScrolled(window.scrollY > 60)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Live World Clocks Update
  useEffect(() => {
    const updateClocks = () => {
      const now = new Date()
      const formatTime = (tz: string) => {
        try {
          return new Intl.DateTimeFormat('en-GB', {
            hour: '2-digit',
            minute: '2-digit',
            timeZone: tz,
            hour12: false,
          }).format(now)
        } catch {
          return '12:00'
        }
      }
      setClockTimes({
        paris: formatTime('Europe/Paris'),
        london: formatTime('Europe/London'),
        newyork: formatTime('America/New_York'),
        tokyo: formatTime('Asia/Tokyo'),
      })
    }
    updateClocks()
    const timer = setInterval(updateClocks, 10000)
    return () => clearInterval(timer)
  }, [])

  const handleOpeningReveal = useCallback(() => {
    setHeroIntroReady((prev) => (prev ? prev : true))
  }, [])

  const handleOpeningComplete = useCallback(() => {
    setHeroIntroReady((prev) => (prev ? prev : true))
    gsap.fromTo(
      '.site-header',
      { y: -20, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.9, ease: 'power3.out' }
    )
    gsap.fromTo(
      '.stage-ui-hero',
      { y: 24, opacity: 0, filter: 'blur(8px)' },
      { y: 0, opacity: 1, filter: 'blur(0px)', duration: 1.1, ease: 'power3.out' }
    )
    requestAnimationFrame(() => ScrollTrigger.refresh())
  }, [])

  useEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReduced) return
    const ctx = gsap.context(() => {
      const lenis = new Lenis({
        duration: 1.15,
        easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        smoothWheel: true,
        wheelMultiplier: 0.95,
        touchMultiplier: 1.5,
      })
      const syncScrollTrigger = () => ScrollTrigger.update()
      const raf = (time: number) => lenis.raf(time * 1000)
      lenis.on('scroll', syncScrollTrigger)
      gsap.ticker.add(raf)
      gsap.ticker.lagSmoothing(0)

      // Dynamic Chapter Atmospheric Palette Transitions (Dark Luxury Film Continuity)
      const chapters = [
        { trigger: '.signature-cinema-story', bg: '#040404' },
        { trigger: '.material-carousel-container', bg: '#050505' },
        { trigger: '.craft-story', bg: '#080807' },
        { trigger: '.manifesto', bg: '#090908' },
        { trigger: '.collections', bg: '#0d0c0b' },
        { trigger: '.interlude', bg: '#060605' },
        { trigger: '.gallery', bg: '#080807' },
        { trigger: '.pieces', bg: '#0c0b0a' },
        { trigger: '.private-salon', bg: '#090908' },
        { trigger: '.footer', bg: '#060605' },
      ]
      chapters.forEach(({ trigger, bg }) => {
        ScrollTrigger.create({
          trigger,
          start: 'top 55%',
          end: 'bottom 45%',
          onEnter: () => gsap.to('.aurelle-site', { backgroundColor: bg, duration: 1.2, ease: 'power2.out' }),
          onEnterBack: () => gsap.to('.aurelle-site', { backgroundColor: bg, duration: 1.2, ease: 'power2.out' }),
        })
      })

      // Manifesto Word-by-Word Scroll Progression
      gsap.fromTo(
        '.manifesto-word',
        { opacity: 0.16, color: '#686560' },
        {
          opacity: 1,
          color: '#eee9df',
          stagger: 0.04,
          ease: 'none',
          scrollTrigger: {
            trigger: '.manifesto',
            start: 'top 75%',
            end: 'bottom 45%',
            scrub: true,
          },
        }
      )
      gsap.to('.vertical-note', {
        yPercent: -35,
        ease: 'none',
        scrollTrigger: {
          trigger: '.manifesto',
          start: 'top bottom',
          end: 'bottom top',
          scrub: true,
        },
      })

      // Collections Living Scroll Parallax
      gsap.fromTo(
        '.collection-image',
        { yPercent: -8, scale: 1.06 },
        {
          yPercent: 8,
          scale: 1,
          ease: 'none',
          scrollTrigger: {
            trigger: '.collections',
            start: 'top bottom',
            end: 'bottom top',
            scrub: true,
          },
        }
      )

      // Interlude Quote Lettering
      gsap.fromTo(
        '.interlude p',
        { y: 50, opacity: 0, letterSpacing: '-0.02em' },
        {
          y: 0,
          opacity: 1,
          letterSpacing: '0.01em',
          duration: 1.2,
          ease: 'power3.out',
          scrollTrigger: { trigger: '.interlude', start: 'top 75%', once: true },
        }
      )

      // Section 02: The Atelier Living Film Movement
      const craftStory = document.querySelector<HTMLElement>('.craft-story')
      if (craftStory) {
        const slides = gsap.utils.toArray<HTMLElement>('.craft-slide')
        const frames = gsap.utils.toArray<HTMLElement>('.craft-frame')
        const counterTrack = document.querySelector<HTMLElement>('.craft-counter-track')
        const progressBar = document.querySelector<HTMLElement>('.craft-story-progress')

        slides.forEach((slide, i) => {
          gsap.set(slide, { autoAlpha: i === 0 ? 1 : 0, y: i === 0 ? 0 : 36 })
        })
        frames.forEach((frame, i) => {
          gsap.set(frame, { autoAlpha: i === 0 ? 1 : 0, scale: i === 0 ? 1 : 1.08 })
        })
        if (counterTrack) gsap.set(counterTrack, { yPercent: 0 })
        if (progressBar) gsap.set(progressBar, { scaleX: 0 })

        const mm = gsap.matchMedia()

        mm.add('(min-width: 769px)', () => {
          const storyTimeline = gsap.timeline({
            scrollTrigger: {
              trigger: craftStory,
              start: 'top top',
              end: '+=1500',
              scrub: 1.0,
              pin: true,
              anticipatePin: 1,
              invalidateOnRefresh: true,
            },
          })

          storyTimeline.to(progressBar, { scaleX: 1, ease: 'none', duration: 3 }, 0)

          // Step 1 to Step 2
          storyTimeline.to('.craft-frame-0 .craft-image', { scale: 1.06, xPercent: -1.5, ease: 'none', duration: 1 }, 0)
          storyTimeline.to(slides[0], { autoAlpha: 0, y: -16, duration: 0.45, ease: 'power2.inOut' }, 0.25)
          storyTimeline.to(frames[0], { autoAlpha: 0, scale: 1.04, duration: 0.65, ease: 'power2.inOut' }, 0.2)
          storyTimeline.to(frames[1], { autoAlpha: 1, scale: 1, duration: 0.65, ease: 'power2.out' }, 0.35)
          storyTimeline.to(slides[1], { autoAlpha: 1, y: 0, duration: 0.5, ease: 'power2.out' }, 0.45)
          if (counterTrack) storyTimeline.to(counterTrack, { yPercent: -25, duration: 0.4, ease: 'power2.inOut' }, 0.35)

          // Step 2 to Step 3
          storyTimeline.to('.craft-frame-1 .craft-image', { scale: 1.06, xPercent: 1.5, ease: 'none', duration: 1 }, 0.35)
          storyTimeline.to(slides[1], { autoAlpha: 0, y: -16, duration: 0.45, ease: 'power2.inOut' }, 1.25)
          storyTimeline.to(frames[1], { autoAlpha: 0, scale: 1.04, duration: 0.65, ease: 'power2.inOut' }, 1.2)
          storyTimeline.to(frames[2], { autoAlpha: 1, scale: 1, duration: 0.65, ease: 'power2.out' }, 1.35)
          storyTimeline.to(slides[2], { autoAlpha: 1, y: 0, duration: 0.5, ease: 'power2.out' }, 1.45)
          if (counterTrack) storyTimeline.to(counterTrack, { yPercent: -50, duration: 0.4, ease: 'power2.inOut' }, 1.35)

          // Step 3 to Step 4
          storyTimeline.to('.craft-frame-2 .craft-image', { scale: 1.06, xPercent: -1.5, ease: 'none', duration: 1 }, 1.35)
          storyTimeline.to(slides[2], { autoAlpha: 0, y: -16, duration: 0.45, ease: 'power2.inOut' }, 2.25)
          storyTimeline.to(frames[2], { autoAlpha: 0, scale: 1.04, duration: 0.65, ease: 'power2.inOut' }, 2.2)
          storyTimeline.to(frames[3], { autoAlpha: 1, scale: 1, duration: 0.65, ease: 'power2.out' }, 2.35)
          storyTimeline.to(slides[3], { autoAlpha: 1, y: 0, duration: 0.5, ease: 'power2.out' }, 2.45)
          if (counterTrack) storyTimeline.to(counterTrack, { yPercent: -75, duration: 0.4, ease: 'power2.inOut' }, 2.35)
          storyTimeline.to('.craft-frame-3 .craft-image', { scale: 1.06, xPercent: 1.2, ease: 'none', duration: 1 }, 2.35)
        })

        mm.add('(max-width: 768px)', () => {
          const storyTimelineMobile = gsap.timeline({
            scrollTrigger: {
              trigger: craftStory,
              start: 'top top',
              end: '+=1000',
              scrub: 0.8,
              pin: true,
              anticipatePin: 1,
              invalidateOnRefresh: true,
            },
          })

          storyTimelineMobile.to(progressBar, { scaleX: 1, ease: 'none', duration: 3 }, 0)
          storyTimelineMobile.to(slides[0], { autoAlpha: 0, y: -12, duration: 0.45 }, 0.25)
          storyTimelineMobile.to(frames[0], { autoAlpha: 0, duration: 0.55 }, 0.2)
          storyTimelineMobile.to(frames[1], { autoAlpha: 1, duration: 0.55 }, 0.35)
          storyTimelineMobile.to(slides[1], { autoAlpha: 1, y: 0, duration: 0.5 }, 0.45)
          if (counterTrack) storyTimelineMobile.to(counterTrack, { yPercent: -25, duration: 0.4 }, 0.35)

          storyTimelineMobile.to(slides[1], { autoAlpha: 0, y: -12, duration: 0.45 }, 1.25)
          storyTimelineMobile.to(frames[1], { autoAlpha: 0, duration: 0.55 }, 1.2)
          storyTimelineMobile.to(frames[2], { autoAlpha: 1, duration: 0.55 }, 1.35)
          storyTimelineMobile.to(slides[2], { autoAlpha: 1, y: 0, duration: 0.5 }, 1.45)
          if (counterTrack) storyTimelineMobile.to(counterTrack, { yPercent: -50, duration: 0.4 }, 1.35)

          storyTimelineMobile.to(slides[2], { autoAlpha: 0, y: -12, duration: 0.45 }, 2.25)
          storyTimelineMobile.to(frames[2], { autoAlpha: 0, duration: 0.55 }, 2.2)
          storyTimelineMobile.to(frames[3], { autoAlpha: 1, duration: 0.55 }, 2.35)
          storyTimelineMobile.to(slides[3], { autoAlpha: 1, y: 0, duration: 0.5 }, 2.45)
          if (counterTrack) storyTimelineMobile.to(counterTrack, { yPercent: -75, duration: 0.4 }, 2.35)
        })
      }

      // Section 05: Gallery Differential Parallax
      gsap.to('.gallery-tall', {
        yPercent: -18,
        ease: 'none',
        scrollTrigger: {
          trigger: '.gallery',
          start: 'top bottom',
          end: 'bottom top',
          scrub: true,
        },
      })
      gsap.to('.gallery-wide', {
        yPercent: 16,
        ease: 'none',
        scrollTrigger: {
          trigger: '.gallery',
          start: 'top bottom',
          end: 'bottom top',
          scrub: true,
        },
      })

      // Section 06: Signatures Heading Reveal
      gsap.from('.pieces-heading > *', {
        y: 40,
        opacity: 0,
        stagger: 0.12,
        duration: 0.85,
        ease: 'power3.out',
        scrollTrigger: { trigger: '.pieces-heading', start: 'top 85%', once: true },
      })

      // Section 07: Private Salon Reveal
      gsap.from('.salon-container > *', {
        y: 40,
        opacity: 0,
        stagger: 0.15,
        duration: 0.9,
        ease: 'power3.out',
        scrollTrigger: { trigger: '.private-salon', start: 'top 75%', once: true },
      })

      requestAnimationFrame(() => ScrollTrigger.refresh())

      const moveCursor = (event: MouseEvent) => {
        if (!cursor.current) return
        gsap.to(cursor.current, { x: event.clientX, y: event.clientY, duration: 0.4, ease: 'power3.out' })
        if (pieceCursorRef.current) {
          gsap.to(pieceCursorRef.current, { x: event.clientX + 24, y: event.clientY - 100, duration: 0.35, ease: 'power2.out' })
        }
      }
      const hoverables = document.querySelectorAll<HTMLElement>('a, button, .cursor-image, .piece-row')
      const enter = () => cursor.current?.classList.toggle('is-hovering', true)
      const leave = () => cursor.current?.classList.toggle('is-hovering', false)
      window.addEventListener('mousemove', moveCursor)
      hoverables.forEach((el) => {
        el.addEventListener('mouseenter', enter)
        el.addEventListener('mouseleave', leave)
      })

      return () => {
        lenis.off('scroll', syncScrollTrigger)
        lenis.destroy()
        gsap.ticker.remove(raf)
        ScrollTrigger.getAll().forEach((trigger) => trigger.kill())
        window.removeEventListener('mousemove', moveCursor)
        hoverables.forEach((el) => {
          el.removeEventListener('mouseenter', enter)
          el.removeEventListener('mouseleave', leave)
        })
      }
    }, root)
    return () => ctx.revert()
  }, [])

  // Collections Interactive Loupe handlers
  const handleCollectionLoupeMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const percentX = (x / rect.width) * 100
    const percentY = (y / rect.height) * 100

    setLoupeState({
      visible: true,
      x,
      y,
      percentX,
      percentY,
    })

    // Subtle 3D tilt
    const normX = x / rect.width - 0.5
    const normY = y / rect.height - 0.5
    gsap.to('.collection-image-wrap', {
      rotateY: normX * 10,
      rotateX: -normY * 10,
      transformPerspective: 1000,
      duration: 0.4,
      ease: 'power2.out',
    })
  }

  const handleCollectionLoupeLeave = () => {
    setLoupeState((prev) => ({ ...prev, visible: false }))
    gsap.to('.collection-image-wrap', {
      rotateY: 0,
      rotateX: 0,
      duration: 0.6,
      ease: 'power3.out',
    })
  }

  const switchCollection = (index: number) => {
    if (index === activeCollection) return
    gsap.to('.collection-image-wrap', {
      opacity: 0.25,
      scale: 0.98,
      duration: 0.25,
      ease: 'power2.in',
      onComplete: () => {
        setActiveCollection(index)
        gsap.to('.collection-image-wrap', {
          opacity: 1,
          scale: 1,
          duration: 0.45,
          ease: 'power2.out',
        })
      },
    })
    gsap.fromTo(
      '.collection-copy',
      { y: 16, opacity: 0.2 },
      { y: 0, opacity: 1, duration: 0.5, ease: 'power2.out' }
    )
  }

  // Manifesto Spotlight handler
  const handleManifestoMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    setManifestoSpotlight({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    })
  }

  const handleBookingSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const prefix = selectedBoutique.slice(0, 3).toUpperCase()
    const rand = Math.floor(1000 + Math.random() * 9000)
    setReservationCode(`AUR-${prefix}-${rand}`)
    setBookingSubmitted(true)
  }

  const filteredPieces = pieces.filter((piece) => {
    if (catalogCategory === 'all') return true
    return piece.category === catalogCategory
  })

  const manifestoSentence =
    'AURELLE is a conversation between light and matter. We make jewels for the moments that are yours alone — considered, enduring, and alive with possibility.'

  return (
    <main className="aurelle-site" ref={root}>
      {/* Chapter 00: 3D Model Parting Opening Sequence */}
      <OpeningSequence onComplete={handleOpeningComplete} onReveal={handleOpeningReveal} />

      {/* Floating Piece Cursor Image Preview Capsule */}
      <div
        ref={pieceCursorRef}
        className={`floating-piece-capsule ${hoveredPiece && !selectedPieceModal ? 'is-visible' : ''}`}
        aria-hidden="true"
      >
        {hoveredPiece && (
          <>
            <div className="floating-piece-img-wrap">
              <Image src={hoveredPiece.image} alt="" fill className="cover-image" sizes="220px" />
            </div>
            <div className="floating-piece-info">
              <span className="floating-piece-title">{hoveredPiece.name}</span>
              <span className="floating-piece-price">{hoveredPiece.price}</span>
            </div>
          </>
        )}
      </div>

      <div className="custom-cursor" ref={cursor} aria-hidden="true">
        <span>View</span>
      </div>

      {/* Floating Haute Joaillerie Navigation Header */}
      <header className={`site-header${navScrolled ? ' is-scrolled' : ''}`}>
        <a href="#top" className="wordmark" aria-label="AURELLE — Home">
          AURELLE
        </a>

        <nav className="desktop-nav" aria-label="Main navigation">
          <a href="#top">Signature</a>
          <a href="#materials">Material Study</a>
          <a href="#atelier">Atelier</a>
          <a href="#story">Our Story</a>
          <a href="#collections">Collections</a>
          <a href="#pieces">Signatures</a>
          <a href="#salon">Private Salon</a>
        </nav>

        <button
          className={`menu-trigger${menuOpen ? ' is-open' : ''}`}
          onClick={() => setMenuOpen(!menuOpen)}
          aria-expanded={menuOpen}
          aria-controls="mobile-menu"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
        >
          <span>{menuOpen ? 'Close' : 'Menu'}</span>
          <span className="menu-lines" aria-hidden="true" />
        </button>
      </header>

      {menuOpen && (
        <nav id="mobile-menu" className="mobile-menu" aria-label="Mobile navigation">
          <div className="mobile-menu-items">
            <a href="#top" onClick={() => setMenuOpen(false)}>
              <span className="nav-num">01</span>Signature
            </a>
            <a href="#materials" onClick={() => setMenuOpen(false)}>
              <span className="nav-num">02</span>Material Study
            </a>
            <a href="#atelier" onClick={() => setMenuOpen(false)}>
              <span className="nav-num">03</span>Atelier
            </a>
            <a href="#story" onClick={() => setMenuOpen(false)}>
              <span className="nav-num">04</span>Our Story
            </a>
            <a href="#collections" onClick={() => setMenuOpen(false)}>
              <span className="nav-num">05</span>Collections
            </a>
            <a href="#pieces" onClick={() => setMenuOpen(false)}>
              <span className="nav-num">06</span>Signatures
            </a>
            <a href="#salon" onClick={() => setMenuOpen(false)}>
              <span className="nav-num">07</span>Private Salon
            </a>
          </div>
          <div className="mobile-menu-footer">
            <span>Paris Vendôme · Est. 1892</span>
            <span className="gold">✦ Haute Joaillerie</span>
          </div>
        </nav>
      )}

      {/* Section 01: The Continuous 3D Ring Journey (Hero & Living Protagonist Film) */}
      <div id="top">
        <SignatureSection heroIntroReady={heroIntroReady} />
      </div>

      {/* Section 02: The Spatial Material Revelation (The Prism Split & Four Precious Metal Realities) */}
      <div id="materials">
        <MaterialCarousel />
      </div>

      {/* Section 03: The Atelier (Pinned Living Craftsmanship Film) */}
      <section className="craft-story section-dark" id="atelier" aria-label="The making of an Aurelle jewel">
        <div className="craft-story-frames" aria-hidden="true">
          {craftStages.map((stage, index) => (
            <div
              key={stage.num}
              className={`craft-frame craft-frame-${index} ${index === 0 ? 'is-active' : ''}`}
            >
              <div className="craft-frame-inner">
                <Image
                  src={stage.image}
                  alt=""
                  fill
                  priority={index === 0}
                  className="cover-image craft-image"
                  sizes="100vw"
                />
              </div>
            </div>
          ))}
        </div>

        <div className="craft-story-overlay" />

        <div className="craft-story-header">
          <div className="section-index">
            03 <span>/</span> The Atelier
          </div>

          {/* Workshop Telemetry HUD */}
          <div className="craft-telemetry-hud" aria-label="Atelier Telemetry">
            <div className="craft-hud-item">
              <span className="craft-hud-label">Workshop</span>
              <span className="craft-hud-val">14 Place Vendôme</span>
            </div>
            <div className="craft-hud-item">
              <span className="craft-hud-label">Coords</span>
              <span className="craft-hud-val">48.8675° N, 2.3294° E</span>
            </div>
          </div>

          <div className="craft-counter" aria-hidden="true">
            <div className="craft-counter-slot">
              <div className="craft-counter-track">
                {craftStages.map((stage) => (
                  <span key={stage.num}>{stage.num}</span>
                ))}
              </div>
            </div>
            <span className="craft-counter-total">/ 04</span>
          </div>
        </div>

        <div className="craft-story-content">
          <div className="craft-slides-container">
            {craftStages.map((stage, index) => (
              <div
                key={stage.num}
                className={`craft-slide craft-slide-${index} ${index === 0 ? 'is-active' : ''}`}
              >
                <p className="craft-stage-eyebrow eyebrow gold">{stage.phase}</p>
                <h2 className="craft-stage-title">{stage.title}</h2>
                <p className="craft-stage-caption">{stage.caption}</p>

                {/* Stage Telemetry Badges */}
                <div className="craft-stage-meta-strip">
                  <span className="craft-meta-badge">
                    <span>✦</span> {stage.temp}
                  </span>
                  <span className="craft-meta-badge">
                    <span>⏱</span> {stage.hours}
                  </span>
                  <span className="craft-meta-badge">
                    <span>⚜</span> {stage.hallmark}
                  </span>
                </div>

                {index === 3 && (
                  <div className="craft-stage-handoff" style={{ marginTop: '24px' }}>
                    <a href="#story" className="text-link">
                      Discover the Aurelle Manifesto <span>↓</span>
                    </a>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="craft-story-footer">
          <span className="craft-footer-prompt">Scroll to shape the masterwork</span>
          <div className="craft-progress-track">
            <span className="craft-story-progress" />
          </div>
        </div>
      </section>

      {/* Section 04: Manifesto (Dark Architectural Sculpture) */}
      <section
        className="manifesto section-dark reveal"
        id="story"
        onMouseMove={handleManifestoMouseMove}
      >
        {/* Giant Floating Parallax Watermark */}
        <div className="manifesto-watermark" aria-hidden="true">
          PERMANENCE
        </div>

        {/* Mouse Tracking Golden Spotlight */}
        <div
          className="manifesto-spotlight"
          aria-hidden="true"
          style={{
            background: `radial-gradient(600px circle at ${manifestoSpotlight.x}px ${manifestoSpotlight.y}px, rgba(212, 175, 55, 0.08), transparent 70%)`,
          }}
        />

        <div className="manifesto-left-column" style={{ position: 'relative', zIndex: 2 }}>
          <div className="section-index">
            04 <span>/</span> Manifesto
          </div>

          <div className="manifesto-visual-card">
            <div className="manifesto-visual-wrap">
              <Image
                src="/images/aurelle-craft.png"
                alt="Aurelle Master Jeweller Atelier Place Vendôme"
                fill
                className="cover-image manifesto-craft-img"
                sizes="(max-width: 900px) 100vw, 450px"
              />
              <div className="manifesto-visual-vignette" />
              <div className="manifesto-visual-badge">
                <span className="badge-spark">✦</span>
                <span>ATELIER ARCHIVE · 1892</span>
              </div>
              <div className="manifesto-visual-foot">
                <span className="manifesto-foot-caption">Place Vendôme Master Bench</span>
                <span className="manifesto-foot-detail">Hand-Sculpted Au 750</span>
              </div>
            </div>
          </div>
        </div>

        <div className="manifesto-content" style={{ position: 'relative', zIndex: 2 }}>
          <span className="manifesto-quote-mark" aria-hidden="true">
            “
          </span>
          <p className="eyebrow gold">The Aurelle Way</p>
          <h2>
            Objects of <em>quiet</em> desire.
          </h2>
          <p className="body-copy manifesto-scrub-text">
            {manifestoSentence.split(' ').map((word, wi) => (
              <span key={wi} className="manifesto-word">
                {word}{' '}
              </span>
            ))}
          </p>
          <a href="#collections" className="text-link">
            Explore the High Jewellery Collections <span>↘</span>
          </a>

          {/* Maison Provenance Hallmark Stamp */}
          <div className="manifesto-hallmark-seal">
            <span className="manifesto-seal-crest">✦</span>
            <span className="manifesto-seal-text">
              Maison de Haute Joaillerie · 14 Place Vendôme, Paris · Registered Provenance
            </span>
          </div>
        </div>
        <p className="vertical-note" style={{ zIndex: 2 }}>
          A study in permanence
        </p>
      </section>

      {/* Section 05: Collections (Haute Horlogerie Split Canvas with Interactive Loupe) */}
      <section className="collections section-dark" id="collections">
        <div className="collections-top reveal">
          <div className="section-index">
            05 <span>/</span> Collections
          </div>
          <p className="eyebrow">Haute Joaillerie Chapters</p>
        </div>

        <div className="collection-stage">
          {/* Real-Time Interactive 3D Model Masterwork Showcase */}
          <div className="collection-image-wrap" style={{ minHeight: '520px', padding: 0 }}>
            <Collection3DViewer activeChapter={activeCollection} />
          </div>

          <div className="collection-copy reveal">
            <p className="collection-number">{collections[activeCollection].chapter}</p>
            <h2>{collections[activeCollection].title}</h2>
            <p>{collections[activeCollection].subtitle}</p>

            {/* Collection Gemmological Specs Grid */}
            <div className="collection-specs-grid">
              <div className="collection-spec-cell">
                <span className="collection-spec-k">Metal Metallurgy</span>
                <span className="collection-spec-v">{collections[activeCollection].metalTag}</span>
              </div>
              <div className="collection-spec-cell">
                <span className="collection-spec-k">Solitaire / Pavé</span>
                <span className="collection-spec-v">{collections[activeCollection].diamondTag}</span>
              </div>
              <div className="collection-spec-cell">
                <span className="collection-spec-k">Cut Architecture</span>
                <span className="collection-spec-v">{collections[activeCollection].facets}</span>
              </div>
              <div className="collection-spec-cell">
                <span className="collection-spec-k">Studio Provenance</span>
                <span className="collection-spec-v">{collections[activeCollection].provenance}</span>
              </div>
            </div>

            <a href="#pieces" className="text-link">
              View signatures vault <span>↗</span>
            </a>
          </div>
        </div>

        {/* Collection Selector Tabs */}
        <div className="collection-tabs">
          {collections.map((collection, index) => (
            <button
              key={collection.number}
              className={index === activeCollection ? 'active' : ''}
              onClick={() => switchCollection(index)}
            >
              <span className="tab-num">{collection.number}</span>
              <span className="tab-title">{collection.title}</span>
              <span className="tab-sep">·</span>
              <span className="tab-metal">{collection.metalTag.split('&')[0]}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Section 06: Interlude (Deep Obsidian Velvet Mirror) */}
      <section className="interlude" id="interlude">
        <div className="interlude-backdrop-glow" aria-hidden="true" />
        <div className="interlude-crest" aria-hidden="true">
          ✦
        </div>
        <p>
          “A jewel is not an adornment.<br />
          <em>It is a memory, made visible.”</em>
        </p>
        <div className="interlude-divider">
          <span className="interlude-line" />
          <span>Elise Aurelle, Founder · 14 Place Vendôme</span>
          <span className="interlude-line" />
        </div>
      </section>

      {/* Section 07: Gallery (Curated Haute Joaillerie Exhibition with Lightbox) */}
      <section className="gallery section-dark" id="gallery">
        <div className="gallery-heading reveal">
          <div className="section-index">
            06 <span>/</span> Exhibition
          </div>
          <h2>
            Details worth<br />
            <em>keeping.</em>
          </h2>
        </div>

        <div className="gallery-grid">
          {galleryExhibits.map((exhibit, index) => (
            <div
              key={exhibit.id}
              className={`${exhibit.aspect} gallery-exhibit-card cursor-image`}
              onClick={() => setActiveExhibitModal(index)}
            >
              <div className="exhibit-badge">
                <span>✦</span> {exhibit.badge}
              </div>
              <Image
                src={exhibit.image}
                alt={exhibit.title}
                fill
                className="cover-image parallax-image"
                sizes="(max-width: 768px) 100vw, 40vw"
              />
              <div className="exhibit-inspect-prompt">
                <span>Inspect in 100× Macro</span> <span>↗</span>
              </div>
            </div>
          ))}
        </div>

        {/* Exhibition High-Resolution Lightbox Modal */}
        {activeExhibitModal !== null && (
          <div
            className="exhibit-lightbox-backdrop"
            onClick={() => setActiveExhibitModal(null)}
          >
            <div
              className="exhibit-lightbox-modal"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                className="lightbox-close-btn"
                onClick={() => setActiveExhibitModal(null)}
                aria-label="Close exhibit"
              >
                ✕
              </button>

              <div className="lightbox-image-stage">
                <Image
                  src={galleryExhibits[activeExhibitModal].image}
                  alt={galleryExhibits[activeExhibitModal].title}
                  fill
                  className="cover-image"
                  sizes="800px"
                />
              </div>

              <div className="lightbox-details-panel">
                <div>
                  <span className="eyebrow gold">
                    {galleryExhibits[activeExhibitModal].badge}
                  </span>
                  <h2
                    style={{
                      font: "400 32px/1.15 'Libre Baskerville', serif",
                      color: 'var(--ivory)',
                      margin: '12px 0 8px',
                    }}
                  >
                    {galleryExhibits[activeExhibitModal].title}
                  </h2>
                  <p
                    style={{
                      color: 'rgba(238, 233, 223, 0.7)',
                      fontSize: '13px',
                      lineHeight: '1.6',
                    }}
                  >
                    {galleryExhibits[activeExhibitModal].subtitle}
                  </p>

                  <div className="facet-overlay-grid">
                    {Object.entries(galleryExhibits[activeExhibitModal].specs).map(
                      ([key, val]) => (
                        <div key={key} className="collection-spec-cell">
                          <span className="collection-spec-k">
                            {key.replace(/([A-Z])/g, ' $1')}
                          </span>
                          <span className="collection-spec-v">{val}</span>
                        </div>
                      )
                    )}
                  </div>
                </div>

                <div>
                  <div
                    className="piece-drawer-hallmark"
                    style={{ marginBottom: '16px' }}
                  >
                    <span>✦</span>
                    <span>Direct Atelier Inspection · Place Vendôme Laboratory</span>
                  </div>
                  <a
                    href="#salon"
                    className="drawer-primary-btn"
                    onClick={() => setActiveExhibitModal(null)}
                  >
                    Request Private Viewing
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Section 08: Signatures Catalog (Haute Joaillerie Vault) */}
      <section className="pieces section-dark" id="pieces">
        <div className="pieces-heading reveal">
          <div className="section-index">
            07 <span>/</span> Signatures
          </div>
          <h2>
            Designed for<br />
            <em>the now.</em>
          </h2>

          {/* Category Filter Pills */}
          <div className="catalog-category-bar">
            <button
              type="button"
              className={`catalog-filter-btn ${catalogCategory === 'all' ? 'is-active' : ''}`}
              onClick={() => setCatalogCategory('all')}
            >
              All Masterworks (05)
            </button>
            <button
              type="button"
              className={`catalog-filter-btn ${catalogCategory === 'solitaire' ? 'is-active' : ''}`}
              onClick={() => setCatalogCategory('solitaire')}
            >
              Solitaires (02)
            </button>
            <button
              type="button"
              className={`catalog-filter-btn ${catalogCategory === 'band' ? 'is-active' : ''}`}
              onClick={() => setCatalogCategory('band')}
            >
              Bands & Cuffs (02)
            </button>
            <button
              type="button"
              className={`catalog-filter-btn ${catalogCategory === 'pendant' ? 'is-active' : ''}`}
              onClick={() => setCatalogCategory('pendant')}
            >
              Pendants (01)
            </button>
          </div>

          <a href="#top" className="text-link">
            Back to top <span>↑</span>
          </a>
        </div>

        <div className="pieces-list">
          {filteredPieces.map((piece, index) => (
            <article
              className="piece-row"
              key={piece.id}
              onClick={() => setSelectedPieceModal(piece)}
              onMouseEnter={() => setHoveredPiece(piece)}
              onMouseLeave={() => setHoveredPiece(null)}
              style={{ cursor: 'pointer' }}
            >
              <span className="piece-num">0{index + 1}</span>
              <div className="piece-content">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                  <h3>{piece.name}</h3>
                  <span className="piece-tag-purity">{piece.purity}</span>
                </div>
                <p>{piece.detail}</p>
              </div>
              <span className="piece-gia-tag">{piece.gia}</span>
              <span className="piece-price">{piece.price}</span>
              <button
                type="button"
                className={'save-piece ' + (saved === index ? 'saved' : '')}
                aria-label={`Save ${piece.name}`}
                onClick={(e) => {
                  e.stopPropagation()
                  setSaved(saved === index ? null : index)
                }}
              >
                {saved === index ? 'Saved' : '♡'}
              </button>
            </article>
          ))}
        </div>
      </section>

      {/* Section 09: The Aurelle Private Salon & Bespoke Appointment */}
      <section className="private-salon section-dark" id="salon">
        <div className="salon-container">
          <div className="salon-info">
            <div className="section-index">
              08 <span>/</span> Private Salon
            </div>
            <h2 className="salon-heading">
              By Private<br />
              <em>Appointment</em>
            </h2>
            <p className="salon-desc">
              Experience the Haute Joaillerie creations in the intimacy of our private salons. Our master gemmologists and design director welcome you for bespoke viewings and custom commissions.
            </p>

            {/* Live Boutique World Clocks */}
            <div className="salon-world-clocks" aria-label="Boutique Local Clocks">
              <div
                className={`salon-clock-card ${selectedBoutique === 'Paris Vendôme' ? 'is-active' : ''}`}
                onClick={() => setSelectedBoutique('Paris Vendôme')}
                style={{ cursor: 'pointer' }}
              >
                <span className="clock-city-name">Paris Vendôme</span>
                <span className="clock-digital-time">{clockTimes.paris}</span>
                <span className="clock-status-tag">Open for Salon</span>
              </div>
              <div
                className={`salon-clock-card ${selectedBoutique === 'London Bond St' ? 'is-active' : ''}`}
                onClick={() => setSelectedBoutique('London Bond St')}
                style={{ cursor: 'pointer' }}
              >
                <span className="clock-city-name">London Mayfair</span>
                <span className="clock-digital-time">{clockTimes.london}</span>
                <span className="clock-status-tag">Open for Salon</span>
              </div>
              <div
                className={`salon-clock-card ${selectedBoutique === 'New York Madison' ? 'is-active' : ''}`}
                onClick={() => setSelectedBoutique('New York Madison')}
                style={{ cursor: 'pointer' }}
              >
                <span className="clock-city-name">New York</span>
                <span className="clock-digital-time">{clockTimes.newyork}</span>
                <span className="clock-status-tag">Open for Salon</span>
              </div>
              <div
                className={`salon-clock-card ${selectedBoutique === 'Tokyo Ginza' ? 'is-active' : ''}`}
                onClick={() => setSelectedBoutique('Tokyo Ginza')}
                style={{ cursor: 'pointer' }}
              >
                <span className="clock-city-name">Tokyo Ginza</span>
                <span className="clock-digital-time">{clockTimes.tokyo}</span>
                <span className="clock-status-tag">Open for Salon</span>
              </div>
            </div>

            {/* VIP Suite Amenities */}
            <div className="salon-amenities-row">
              <div className="salon-amenity-item">
                <span>✦</span> Private Vault Inspection
              </div>
              <div className="salon-amenity-item">
                <span>✦</span> Dom Pérignon Vintage Service
              </div>
              <div className="salon-amenity-item">
                <span>✦</span> Master Gemmologist 1-on-1
              </div>
              <div className="salon-amenity-item">
                <span>✦</span> Bespoke Monogramming
              </div>
            </div>

            <div className="salon-selected-address">
              <p style={{ font: "11px 'DM Mono', monospace", color: 'var(--gold)', letterSpacing: '0.1em' }}>
                {boutiques.find((b) => b.city === selectedBoutique)?.address}
              </p>
              <p style={{ font: "10px 'DM Mono', monospace", color: 'rgba(238, 233, 223, 0.5)', marginTop: '4px' }}>
                {boutiques.find((b) => b.city === selectedBoutique)?.hours} · {boutiques.find((b) => b.city === selectedBoutique)?.coords}
              </p>
            </div>
          </div>

          <div className="salon-booking-card">
            {bookingSubmitted ? (
              <div className="salon-vip-card">
                <div className="vip-wax-seal">✦</div>
                <div style={{ textAlign: 'center' }}>
                  <p className="eyebrow gold">Maison Aurelle Haute Joaillerie</p>
                  <h3
                    style={{
                      font: "400 24px 'Libre Baskerville', serif",
                      color: 'var(--ivory)',
                      margin: '8px 0',
                    }}
                  >
                    Private Salon Reserved
                  </h3>
                  <p
                    style={{
                      font: "12px/1.6 'DM Mono', monospace",
                      color: 'rgba(238, 233, 223, 0.75)',
                      maxWidth: '380px',
                      margin: '0 auto',
                    }}
                  >
                    An exclusive private suite at {selectedBoutique} has been reserved for {bookingForm.name || 'Madame / Monsieur'}.
                  </p>
                </div>

                <div className="vip-invitation-code">
                  INVITATION CODE · {reservationCode}
                </div>

                <div
                  style={{
                    padding: '16px',
                    borderRadius: '8px',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(212, 175, 55, 0.2)',
                    fontSize: '11px',
                    color: 'rgba(238, 233, 223, 0.7)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                  }}
                >
                  <div>
                    <strong style={{ color: 'var(--gold)' }}>Experience:</strong> {bookingExperience}
                  </div>
                  <div>
                    <strong style={{ color: 'var(--gold)' }}>Date:</strong> {bookingForm.date || 'Immediate Priority'}
                  </div>
                  <div>
                    <strong style={{ color: 'var(--gold)' }}>Concierge:</strong> Dedicated Salon Director will contact within 2 hours.
                  </div>
                </div>

                <button
                  type="button"
                  className="drawer-primary-btn"
                  onClick={() => setBookingSubmitted(false)}
                >
                  Reserve Another Viewing
                </button>
              </div>
            ) : (
              <form onSubmit={handleBookingSubmit} className="salon-booking-form">
                <div style={{ marginBottom: '16px' }}>
                  <p className="eyebrow gold">Bespoke Concierge</p>
                  <h3 style={{ font: "400 22px 'Libre Baskerville', serif", color: 'var(--ivory)', marginTop: '4px' }}>
                    Reserve Your Salon Suite
                  </h3>
                </div>

                <div className="salon-form-group">
                  <label htmlFor="salon-exp">Experience Type</label>
                  <select
                    id="salon-exp"
                    value={bookingExperience}
                    onChange={(e) => setBookingExperience(e.target.value)}
                    className="salon-input"
                    style={{ cursor: 'pointer' }}
                  >
                    <option value="Bespoke Solitaire Commission" style={{ background: '#111' }}>
                      Bespoke Solitaire Commission
                    </option>
                    <option value="Haute Joaillerie Private Viewing" style={{ background: '#111' }}>
                      Haute Joaillerie Private Viewing
                    </option>
                    <option value="Heirloom Redesign & Gemmology" style={{ background: '#111' }}>
                      Heirloom Redesign & Gemmology
                    </option>
                  </select>
                </div>

                <div className="salon-form-group" style={{ marginTop: '14px' }}>
                  <label htmlFor="salon-name">Full Name</label>
                  <input
                    id="salon-name"
                    required
                    type="text"
                    placeholder="Madame / Monsieur"
                    value={bookingForm.name}
                    onChange={(e) => setBookingForm({ ...bookingForm, name: e.target.value })}
                    className="salon-input"
                  />
                </div>

                <div className="salon-form-group" style={{ marginTop: '14px' }}>
                  <label htmlFor="salon-email">Direct Contact (Email or Phone)</label>
                  <input
                    id="salon-email"
                    required
                    type="text"
                    placeholder="client@luxury.example"
                    value={bookingForm.email}
                    onChange={(e) => setBookingForm({ ...bookingForm, email: e.target.value })}
                    className="salon-input"
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '14px' }}>
                  <div className="salon-form-group">
                    <label htmlFor="salon-date">Preferred Date</label>
                    <input
                      id="salon-date"
                      required
                      type="date"
                      value={bookingForm.date}
                      onChange={(e) => setBookingForm({ ...bookingForm, date: e.target.value })}
                      className="salon-input"
                    />
                  </div>
                  <div className="salon-form-group">
                    <label htmlFor="salon-guests">Party Size</label>
                    <select
                      id="salon-guests"
                      value={bookingForm.guests}
                      onChange={(e) => setBookingForm({ ...bookingForm, guests: e.target.value })}
                      className="salon-input"
                      style={{ cursor: 'pointer' }}
                    >
                      <option value="1 Guest" style={{ background: '#111' }}>1 Guest</option>
                      <option value="2 Guests" style={{ background: '#111' }}>2 Guests</option>
                      <option value="Private Entourage" style={{ background: '#111' }}>Private Entourage</option>
                    </select>
                  </div>
                </div>

                <button type="submit" className="salon-submit-btn" style={{ width: '100%', marginTop: '22px' }}>
                  Request Private Salon Suite · {selectedBoutique}
                </button>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* Interactive High-Jewellery Quick-View Drawer Modal */}
      {selectedPieceModal && (
        <div className="piece-drawer-backdrop" onClick={() => setSelectedPieceModal(null)}>
          <div className="piece-drawer" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="piece-drawer-close"
              onClick={() => setSelectedPieceModal(null)}
              aria-label="Close piece details"
            >
              ✕
            </button>

            <div className="piece-drawer-hero">
              <Image
                src={selectedPieceModal.image}
                alt={selectedPieceModal.name}
                fill
                className="cover-image"
                sizes="560px"
              />
            </div>

            <div className="piece-drawer-body">
              <div>
                <span className="piece-drawer-eyebrow">Haute Joaillerie Vault Signature</span>
                <h2 className="piece-drawer-title">{selectedPieceModal.name}</h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '6px' }}>
                  <span className="piece-drawer-price">{selectedPieceModal.price}</span>
                  <span className="piece-tag-purity">{selectedPieceModal.purity}</span>
                  <span className="piece-gia-tag">{selectedPieceModal.gia}</span>
                </div>
              </div>

              <p style={{ color: 'rgba(238, 233, 223, 0.75)', fontSize: '13px', lineHeight: '1.6' }}>
                Handcrafted at the Place Vendôme master ateliers. Each piece is set with ethically certified diamonds, hallmarked with the Aurelle crest, and presented in hand-stitched French calfskin presentation cases with certified GIA dossiers.
              </p>

              <div className="piece-drawer-specs">
                <div className="spec-item">
                  <span className="spec-label">Carat Weight</span>
                  <span className="spec-val">{selectedPieceModal.carat}</span>
                </div>
                <div className="spec-item">
                  <span className="spec-label">Clarity & Color</span>
                  <span className="spec-val">{selectedPieceModal.clarity}</span>
                </div>
                <div className="spec-item">
                  <span className="spec-label">Cut Architecture</span>
                  <span className="spec-val">{selectedPieceModal.cut}</span>
                </div>
                <div className="spec-item">
                  <span className="spec-label">Precious Metallurgy</span>
                  <span className="spec-val">{selectedPieceModal.metal}</span>
                </div>
              </div>

              <div className="piece-drawer-hallmark">
                <span>✦</span>
                <span>Includes GIA Certificate of Origin & Lifetime Atelier Guarantee</span>
              </div>

              <div className="piece-drawer-actions">
                <a
                  href="#salon"
                  className="drawer-primary-btn"
                  onClick={() => {
                    setSelectedPieceModal(null)
                  }}
                >
                  Book Private Salon Appointment
                </a>
                <a
                  href={`mailto:concierge@aurelle.luxury?subject=Inquiry for ${encodeURIComponent(selectedPieceModal.name)} (${selectedPieceModal.id})`}
                  className="drawer-secondary-btn"
                >
                  Acquire via Private Concierge
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer with CC BY 4.0 Credit Intact */}
      <footer className="footer section-dark">
        <div className="footer-mark">
          AURELLE<small>Timeless Brilliance</small>
        </div>
        <div className="footer-links">
          <div>
            <p className="eyebrow gold">Explore</p>
            <a href="#top">Signature</a>
            <a href="#atelier">Atelier</a>
            <a href="#story">Manifesto</a>
            <a href="#collections">Collections</a>
            <a href="#pieces">Signatures</a>
            <a href="#salon">Private Salon</a>
          </div>
          <div>
            <p className="eyebrow gold">Salons</p>
            <a href="#salon">Paris Vendôme</a>
            <a href="#salon">London Bond St</a>
            <a href="#salon">New York Madison</a>
            <a href="#salon">Tokyo Ginza</a>
          </div>
          <div>
            <p className="eyebrow gold">Concierge</p>
            <a href="mailto:concierge@aurelle.luxury">Bespoke Inquiries</a>
            <a href="#salon">Private Viewings</a>
            <a href="#top">Care & Hallmarks</a>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© 2026 Aurelle Haute Joaillerie Paris</span>
          <span>Privacy · Terms · Ethics & Sourcing</span>
          <span>Made for the moments between lifetimes</span>
        </div>
        <div className="footer-credits">
          <p>
            3D Model Credits:{' '}
            <a href="https://skfb.ly/onyBx" target="_blank" rel="noopener noreferrer">
              “Doji Diamond Ring”
            </a>{' '}
            by{' '}
            <a href="https://sketchfab.com/m.visual" target="_blank" rel="noopener noreferrer">
              M. Visual
            </a>{' '}
            is licensed under{' '}
            <a href="http://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer">
              Creative Commons Attribution 4.0
            </a>.
          </p>
        </div>
      </footer>
    </main>
  )
}
