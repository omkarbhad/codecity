import { useResolvedTheme } from "@/lib/settings"
import { DISTRICT_COLORS } from "@/lib/district-colors"

// Theme values for code that cannot read CSS variables: canvas, WebGL and
// vis-network colours. Keep in sync with src/ui/styles/globals.css.

export const THEME = {
  bg: "#121212",
  bgDeep: "#0a0a0a",
  bgRaised: "#262626",
  bgCard: "#1e1e1e",
  border: "#262626",
  borderLight: "#333333",
  cream: "#f3f3f3",
  creamDark: "#b4b4b4",
  muted: "#8f8f8f",
  dim: "#5f5f5f",
  lime: "#c8e64a",
  limeShadow: "#5a7a00",
  sevHigh: "#ff3d8a",
  sevMed: "#ff8a3d",
  sevLow: "#3dd4ff",
} as const

/** Dependency direction, the same everywhere: imports out vs. imported by. */
export const OUTGOING_COLOR = THEME.sevHigh
export const INCOMING_COLOR = THEME.sevLow

/** Fallback for a file whose district colour is unknown. */
export const UNKNOWN_COLOR = THEME.muted

/** Categorical palette (communities, groups), the district colours from globals.css. */
export const DISTRICT_PALETTE = DISTRICT_COLORS

/** UI font for canvas text (vis-network). Code alone uses JetBrains Mono. */
export const UI_FONT = '"Instrument Sans", -apple-system, BlinkMacSystemFont, sans-serif'

/** Instrument Sans as a file, for WebGL text (troika cannot use CSS fonts). */
export const UI_FONT_URL = "/fonts/instrument-sans-600.woff"

/** Hex colour plus a 0-1 alpha, as #rrggbbaa. */
export function withAlpha(hex: string, alpha: number): string {
  const a = Math.round(Math.min(1, Math.max(0, alpha)) * 255).toString(16).padStart(2, "0")
  return `${hex.slice(0, 7)}${a}`
}

/** Light-mode counterpart of THEME (matches globals.css [data-theme="light"]). */
/** A full set of canvas colours (THEME is the dark one). */
export type Palette = Record<keyof typeof THEME, string>

export const LIGHT_THEME: Palette = {
  bg: "#ffffff",
  bgDeep: "#f5f5f6",
  bgRaised: "#e4e4e7",
  bgCard: "#ececee",
  border: "#e5e5e7",
  borderLight: "#d6d6da",
  cream: "#111113",
  creamDark: "#4a4a50",
  muted: "#6b6b72",
  dim: "#9a9aa2",
  lime: "#5b8a00",
  limeShadow: "#3d5c00",
  sevHigh: "#d1245f",
  sevMed: "#c85a12",
  sevLow: "#0b84b8",
}

/** Canvas colours for the current scheme. */
export function usePalette(): Palette {
  return useResolvedTheme() === "light" ? LIGHT_THEME : THEME
}

/** How the 3D city is lit and coloured: dusk in dark mode, day in light mode. */
export interface SceneLook {
  sky: { zenith: string; horizon: string; glow: string }
  fog: string
  /** Multiplies the size-based fog density (day air is clearer than dusk haze). */
  fogScale: number
  ground: string
  /** Colour of the grid lines on the ground around the city. */
  groundLine: string
  hemi: { sky: string; ground: string; intensity: number }
  ambient: { color: string; intensity: number }
  key: { color: string; intensity: number }
  fill: { color: string; intensity: number }
  /** Low light from the camera side that lifts the walls facing the viewer (neutral, not tinted). */
  warm: { color: string; intensity: number }
  windowGlow: number
  /** Strength of the studio reflections on glass and metal. */
  envIntensity: number
  streetLights: number
}

export const DUSK_SCENE: SceneLook = {
  sky: { zenith: "#07090e", horizon: "#12151c", glow: "#1b2030" },
  fog: "#12151c",
  fogScale: 1,
  ground: "#0e1015",
  groundLine: "#232733",
  hemi: { sky: "#c9d4f2", ground: "#2a2e3c", intensity: 0.8 },
  ambient: { color: "#6a7392", intensity: 0.45 },
  key: { color: "#ffffff", intensity: 2.3 },
  fill: { color: "#a9b9e6", intensity: 0.7 },
  warm: { color: "#dfe6ff", intensity: 0.3 },
  windowGlow: 0.5,
  envIntensity: 0.18,
  streetLights: 0.45,
}

export const DAY_SCENE: SceneLook = {
  sky: { zenith: "#7fb0e2", horizon: "#e2eaf3", glow: "#f4f7fb" },
  fog: "#e2eaf3",
  fogScale: 0.45,
  ground: "#dde1e8",
  groundLine: "#c3cad4",
  hemi: { sky: "#ffffff", ground: "#9aa3b0", intensity: 1.0 },
  ambient: { color: "#ffffff", intensity: 0.3 },
  key: { color: "#ffffff", intensity: 2.3 },
  fill: { color: "#c4d4f5", intensity: 0.7 },
  warm: { color: "#ffffff", intensity: 0.25 },
  windowGlow: 0.1,
  envIntensity: 0.15,
  streetLights: 0,
}

export function useSceneLook(): SceneLook {
  return useResolvedTheme() === "light" ? DAY_SCENE : DUSK_SCENE
}
