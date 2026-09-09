import { useSyncExternalStore } from 'react'
import { PreciousMetal } from './glbMaterialClassifier'

export type DiamondCut = 'round-brilliant' | 'emerald' | 'oval' | 'cushion'

export interface MaterialStoreState {
  selectedMaterial: PreciousMetal
  activeHoverMaterial: PreciousMetal | null
  selectedCut: DiamondCut
  engravingText: string
  ringSize: number
}

let state: MaterialStoreState = {
  selectedMaterial: 'platinum',
  activeHoverMaterial: null,
  selectedCut: 'round-brilliant',
  engravingText: '',
  ringSize: 6.5,
}

const listeners = new Set<() => void>()

function emitChange() {
  for (const listener of listeners) {
    listener()
  }
}

export const materialStore = {
  getSnapshot(): MaterialStoreState {
    return state
  },
  subscribe(listener: () => void): () => void {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
  setSelectedMaterial(metal: PreciousMetal) {
    if (state.selectedMaterial !== metal) {
      state = { ...state, selectedMaterial: metal }
      try {
        sessionStorage.setItem('aurelle_selected_metal', metal)
      } catch {}
      emitChange()
    }
  },
  setActiveHoverMaterial(metal: PreciousMetal | null) {
    if (state.activeHoverMaterial !== metal) {
      state = { ...state, activeHoverMaterial: metal }
      emitChange()
    }
  },
  setSelectedCut(cut: DiamondCut) {
    if (state.selectedCut !== cut) {
      state = { ...state, selectedCut: cut }
      emitChange()
    }
  },
  setEngravingText(text: string) {
    if (state.engravingText !== text) {
      state = { ...state, engravingText: text }
      emitChange()
    }
  },
  setRingSize(size: number) {
    if (state.ringSize !== size) {
      state = { ...state, ringSize: size }
      emitChange()
    }
  },
}

export function useMaterialStore(): MaterialStoreState {
  return useSyncExternalStore(materialStore.subscribe, materialStore.getSnapshot, materialStore.getSnapshot)
}
