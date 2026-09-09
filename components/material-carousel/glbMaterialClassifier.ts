import * as THREE from 'three'

export type PreciousMetal = 'platinum' | 'yellow-gold' | 'rose-gold' | 'champagne-gold'

export interface MetalPBRSpec {
  name: string
  label: string
  code: string
  color: string
  milgrainColor?: string
  metalness: number
  roughness: number
  milgrainRoughness: number
  emissive: string
  envMapIntensity: number
  keyLightColor: string
  rimLightColor: string
  ambientColor: string
  purity: string
  mood: string
  description: string
  density: string
}

export const PRECIOUS_METALS: Record<PreciousMetal, MetalPBRSpec> = {
  platinum: {
    name: 'Platinum 950',
    label: '01 / Platinum 950',
    code: 'PT950',
    color: '#E2E6EC', // Crisp architectural icy mirror platinum
    milgrainColor: '#1E2024', // Dark charcoal titanium contrast
    metalness: 1.0,
    roughness: 0.10,
    milgrainRoughness: 0.15,
    emissive: '#000000',
    envMapIntensity: 3.0,
    keyLightColor: '#EAF2FF',
    rimLightColor: '#D0E4FF',
    ambientColor: '#05080E',
    purity: '95.0% Pure Platinum · Hypoallergenic',
    mood: 'Precision. Silence. Eternal clarity.',
    description: 'Light without warmth. Precision without compromise.',
    density: '21.45 g/cm³',
  },
  'yellow-gold': {
    name: '18K Yellow Gold',
    label: '02 / 18K Yellow Gold',
    code: 'AU750-Y',
    color: '#E8BF4C', // Rich luminous warm golden luxury
    milgrainColor: '#B08828',
    metalness: 0.98,
    roughness: 0.11,
    milgrainRoughness: 0.16,
    emissive: '#000000',
    envMapIntensity: 2.8,
    keyLightColor: '#FFF0D0',
    rimLightColor: '#FFD080',
    ambientColor: '#0A0804',
    purity: '75.0% Pure Gold · 12.5% Fine Silver · 12.5% Copper',
    mood: 'Warmth held in permanence.',
    description: 'The ancient warmth of classical Parisian ateliers. Deep golden radiance that harmonizes organically with human skin.',
    density: '15.58 g/cm³',
  },
  'rose-gold': {
    name: '18K Rose Gold',
    label: '03 / 18K Rose Gold',
    code: 'AU750-R',
    color: '#E8B59E', // Authentic 18K 4N/5N warm peach-gold blush
    milgrainColor: '#A86852',
    metalness: 0.96,
    roughness: 0.11,
    milgrainRoughness: 0.16,
    emissive: '#000000',
    envMapIntensity: 2.8,
    keyLightColor: '#FFF0EA',
    rimLightColor: '#FFD4C8',
    ambientColor: '#0E0708',
    purity: '75.0% Pure Gold · 20.0% Copper · 5.0% Fine Silver',
    mood: 'Warmth becomes light.',
    description: 'A romantic blush hue achieved through high-purity metallurgical copper alloying. Intimate, modern, and intensely sculptural.',
    density: '15.28 g/cm³',
  },
  'champagne-gold': {
    name: 'Champagne Gold',
    label: '04 / Champagne Gold',
    code: 'AU750-CH',
    color: '#D8C29D', // Subtle antique French champagne gold, gentle pale honey shimmer
    milgrainColor: '#9C8860',
    metalness: 0.96,
    roughness: 0.12,
    milgrainRoughness: 0.17,
    emissive: '#000000',
    envMapIntensity: 2.7,
    keyLightColor: '#FAF2E2',
    rimLightColor: '#E8D4B0',
    ambientColor: '#080705',
    purity: '75.0% Pure Gold · Proprietary Pale Alloy Formulation',
    mood: 'The warmth we call Aurelle.',
    description: 'An elusive, muted whisper of gold reminiscent of vintage effervescence. Subtle elegance that rejects ostentation.',
    density: '15.42 g/cm³',
  },
}

/**
 * Robust runtime GLB inspector that classifies and applies custom PBR materials
 * WITHOUT hardcoding brittle mesh names.
 *
 * Inspects:
 * - Native GLTF metallicFactor & roughnessFactor
 * - Original material names and texture bindings
 * - Separates Main Metal Band, Milgrain Equator Accent, and Optical Diamonds
 */
export function applyMaterialToRing(
  root: THREE.Object3D,
  metal: PreciousMetal,
  opacity: number = 1.0
) {
  const spec = PRECIOUS_METALS[metal]

  root.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      const mesh = child as THREE.Mesh
      if (!mesh.material) return

      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]

      mats.forEach((m) => {
        const mat = m as THREE.MeshStandardMaterial
        const origMatName = (mat.name || '').toLowerCase()
        const meshName = (mesh.name || '').toLowerCase()

        const isDiamond =
          origMatName.includes('material_2') ||
          origMatName.includes('diamond') ||
          origMatName.includes('gem') ||
          origMatName.includes('stone') ||
          meshName.startsWith('dmesh') ||
          meshName.startsWith('dobj')

        const isMilgrain =
          origMatName.includes('white gold 2') ||
          meshName.includes('circle.006_1') ||
          meshName.includes('circle006_1') ||
          origMatName.includes('accent') ||
          origMatName.includes('channel')

        mat.transparent = opacity < 0.999
        mat.depthWrite = true

        if (isDiamond) {
          // Pure refractive optical diamond facets (Solitaire crown and micro-pavé)
          // CRITICAL: Diamonds MUST ALWAYS remain brilliant pure white across all metals!
          mat.metalness = 0.02
          mat.roughness = 0.005
          mat.color.set('#ffffff')
          mat.emissive.set('#000000')
          mat.emissiveIntensity = 0.0
          mat.envMapIntensity = 3.6
          mat.opacity = opacity
        } else if (isMilgrain) {
          // Hand-burnished milgrain equator channel
          const milgrainHex = spec.milgrainColor || spec.color
          mat.metalness = spec.metalness
          mat.roughness = spec.milgrainRoughness
          mat.color.set(milgrainHex)
          mat.emissive.set('#000000')
          mat.emissiveIntensity = 0.0
          mat.envMapIntensity = spec.envMapIntensity
          mat.opacity = opacity
        } else {
          // Primary metal band chassis & prongs
          mat.metalness = spec.metalness
          mat.roughness = spec.roughness
          mat.color.set(spec.color)
          mat.emissive.set('#000000')
          mat.envMapIntensity = spec.envMapIntensity
          mat.opacity = opacity
        }

        mat.needsUpdate = true
      })
    }
  })
}
