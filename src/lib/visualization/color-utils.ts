import * as THREE from "three"
import type { FileData } from "@/lib/types/city"
import type { VisualizationMode } from "@/components/city/use-city-store"

/** Clamp a value between min and max. */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

// PERF: Module-level scratch object for HSL reads — avoids allocation
const _hsl = { h: 0, s: 0, l: 0 }

/**
 * Compute the building color based on file data, visualization mode,
 * and optional dimming (when a file is selected but this one isn't related).
 *
 * Each mode uses a rich multi-stop gradient for better data communication.
 * Optionally accepts a reusable Color (`out`) to avoid per-call allocation.
 */
export function getBuildingColor(
  file: FileData,
  mode: VisualizationMode,
  buildingColor: string,
  isDimmed = false,
  out?: THREE.Color
): THREE.Color {
  const c = out ?? new THREE.Color()

  switch (mode) {
    case "dependencies": {
      // Base district color; highlight import-heavy files with slightly higher saturation
      c.set(buildingColor)
      const importWeight = clamp((file.imports.length + file.importedBy.length) / 20, 0, 1)
      c.getHSL(_hsl)
      c.setHSL(_hsl.h, clamp(_hsl.s + importWeight * 0.2, 0, 1), _hsl.l)
      break
    }
    case "complexity": {
      // Multi-stop gradient: green → yellow → orange → red → crimson
      const t = clamp(file.complexity / 40, 0, 1)
      if (t < 0.25) {
        // Green → Yellow-Green
        c.setHSL(0.33 - t * 0.4, 0.85, 0.45)
      } else if (t < 0.5) {
        // Yellow-Green → Orange
        c.setHSL(0.23 - (t - 0.25) * 0.6, 0.9, 0.5)
      } else if (t < 0.75) {
        // Orange → Red
        c.setHSL(0.08 - (t - 0.5) * 0.32, 0.95, 0.5)
      } else {
        // Red → Crimson
        c.setHSL(0.0, 1.0, 0.4 + (t - 0.75) * 0.3)
      }
      break
    }
    case "unused": {
      if (file.hasUnusedExports) {
        // Red brightness varies with how many exports — brighter = more wasted
        const fnCount = file.functions.filter((fn) => fn.exported).length
        const intensity = clamp(fnCount / 8, 0.3, 1.0)
        c.setHSL(0.0, 0.85, 0.35 + intensity * 0.25)
      } else {
        // Used: green brightness varies with how many files import this
        const usedBy = file.importedBy.length
        const intensity = clamp(usedBy / 10, 0.2, 1.0)
        c.setHSL(0.42, 0.7, 0.3 + intensity * 0.3)
      }
      break
    }
    case "filesize": {
      // Multi-stop: cool blue (tiny) → teal → green → amber → red (huge)
      const t = clamp(file.lines / 500, 0, 1)
      if (t < 0.2) {
        c.setHSL(0.58, 0.6, 0.5) // Blue
      } else if (t < 0.4) {
        const lt = (t - 0.2) / 0.2
        c.setHSL(0.58 - lt * 0.15, 0.65, 0.5) // Blue → Teal
      } else if (t < 0.6) {
        const lt = (t - 0.4) / 0.2
        c.setHSL(0.43 - lt * 0.25, 0.7, 0.48) // Teal → Green-Yellow
      } else if (t < 0.8) {
        const lt = (t - 0.6) / 0.2
        c.setHSL(0.18 - lt * 0.1, 0.8, 0.45 + lt * 0.1) // Yellow → Orange
      } else {
        const lt = (t - 0.8) / 0.2
        c.setHSL(0.08 - lt * 0.08, 0.9, 0.45 + lt * 0.1) // Orange → Red
      }
      break
    }
    case "types": {
      const typeCount = file.types.length
      if (typeCount === 0) {
        c.set("#2a2a3e") // No types: dark muted
      } else if (typeCount <= 2) {
        c.setHSL(0.15, 0.5, 0.45) // Few types: warm amber
      } else if (typeCount <= 5) {
        c.setHSL(0.12, 0.8, 0.55) // Medium: golden
      } else {
        c.setHSL(0.08, 0.9, 0.6) // Many types: bright gold
      }
      break
    }
    default:
      c.set(buildingColor)
  }

  if (isDimmed) {
    c.multiplyScalar(0.3)
  }

  return c
}

/** Quintic ease-out: fast start, smooth deceleration */
export function easeOutQuint(t: number): number {
  return 1 - Math.pow(1 - t, 5)
}
