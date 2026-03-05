"use client"

import { create } from "zustand"

interface MagnovaStore {
  // Selection
  selectedSlug: string | null
  hoveredSlug: string | null
  selectSpace: (slug: string | null) => void
  hoverSpace: (slug: string | null) => void

  // Transition
  isTransitioning: boolean
  transitionTarget: string | null
  startTransition: (slug: string) => void
  clearTransition: () => void

  // HUD
  showRoster: boolean
  toggleRoster: () => void
}

export const useMagnovaStore = create<MagnovaStore>((set) => ({
  selectedSlug: null,
  hoveredSlug: null,
  selectSpace: (slug) => set({ selectedSlug: slug }),
  hoverSpace: (slug) => set({ hoveredSlug: slug }),

  isTransitioning: false,
  transitionTarget: null,
  startTransition: (slug) => set({ isTransitioning: true, transitionTarget: slug }),
  clearTransition: () => set({ isTransitioning: false, transitionTarget: null }),

  showRoster: true,
  toggleRoster: () => set((s) => ({ showRoster: !s.showRoster })),
}))
