/**
 * CodeCity Color System
 *
 * Extracted from globals.css @theme block and component styles.
 * Organized as: primitive → semantic → roles hierarchy.
 *
 * All values map to CSS custom properties defined in
 * packages/ui/src/styles/globals.css
 */

// ─── Primitive Palette ───────────────────────────────────────────────

export const primitive = {
  black: "#06060b",
  nearBlack: "#0a0a12",
  darkNavy: "#0c0c15",
  deepNavy: "#111119",
  navy: "#181830",
  darkSlate: "#1e1e38",
  slate: "#2a2a3e",
  midSlate: "#3a3a52",
  mutedGray: "#6b6b82",
  lightGray: "#eaeaf2",
  white: "#ffffff",

  neonRed: "#ff3d3d",
  crimson: "#ff1744",
  pink: "#ff4081",

  cyan: "#00e5ff",
  teal: "#1de9b6",
  green: "#00e676",
  lime: "#aeea00",

  blue: "#448aff",
  indigo: "#8c9eff",
  purple: "#b388ff",

  yellow: "#ffea00",
  amber: "#ffc400",
  orange: "#ff9100",
} as const

// ─── Semantic Colors ─────────────────────────────────────────────────

export const semantic = {
  primary: primitive.neonRed,
  primaryForeground: primitive.white,

  secondary: primitive.deepNavy,
  secondaryForeground: primitive.lightGray,

  destructive: primitive.neonRed,
  destructiveForeground: primitive.white,

  success: "#10b981",
  successForeground: "#34d399",

  warning: "#f59e0b",
  warningForeground: "#fbbf24",

  info: "#06b6d4",
  infoForeground: "#22d3ee",

  error: "#ef4444",
  errorForeground: "#f87171",
} as const

// ─── Role-Based Colors ──────────────────────────────────────────────

export const roles = {
  background: primitive.black,
  foreground: primitive.lightGray,

  card: primitive.darkNavy,
  cardForeground: primitive.lightGray,

  muted: primitive.deepNavy,
  mutedForeground: primitive.mutedGray,

  accent: primitive.navy,
  accentForeground: primitive.lightGray,

  border: primitive.darkSlate,
  input: primitive.darkSlate,
  ring: primitive.neonRed,

  /** Glassmorphism panel background */
  panelSurface: "rgba(12, 12, 21, 0.84)",
  panelSurfaceEnd: "rgba(8, 8, 14, 0.88)",

  /** Glass panel background */
  glass: "rgba(10, 10, 16, 0.92)",

  /** Scrollbar */
  scrollbarTrack: primitive.nearBlack,
  scrollbarThumb: primitive.slate,
  scrollbarThumbHover: primitive.midSlate,
} as const

// ─── District Palette ───────────────────────────────────────────────

export const district = {
  cyan: primitive.cyan,
  green: primitive.green,
  blue: primitive.blue,
  yellow: primitive.yellow,
  purple: primitive.purple,
  orange: primitive.orange,
  pink: primitive.pink,
  teal: primitive.teal,
  lime: primitive.lime,
  red: primitive.crimson,
  indigo: primitive.indigo,
  amber: primitive.amber,
} as const

/** Ordered array for easy iteration */
export const districtPalette = [
  district.cyan,
  district.green,
  district.blue,
  district.yellow,
  district.purple,
  district.orange,
  district.pink,
  district.teal,
  district.lime,
  district.red,
  district.indigo,
  district.amber,
] as const

// ─── Status Colors ──────────────────────────────────────────────────

export const status = {
  completed: {
    background: "rgb(16 185 129 / 0.1)",
    text: "rgb(52 211 153)",
    border: "rgb(16 185 129 / 0.2)",
  },
  processing: {
    background: "rgb(245 158 11 / 0.1)",
    text: "rgb(251 191 36)",
    border: "rgb(245 158 11 / 0.2)",
  },
  pending: {
    background: "rgb(6 182 212 / 0.1)",
    text: "rgb(34 211 238)",
    border: "rgb(6 182 212 / 0.2)",
  },
  failed: {
    background: "rgb(239 68 68 / 0.1)",
    text: "rgb(248 113 113)",
    border: "rgb(239 68 68 / 0.2)",
  },
} as const

// ─── Glow Effects (color values) ────────────────────────────────────

export const glow = {
  red: "rgba(255, 61, 61, 0.15)",
  redMedium: "rgba(255, 61, 61, 0.3)",
  redStrong: "rgba(255, 61, 61, 0.5)",
  redSubtle: "rgba(255, 61, 61, 0.05)",
  blue: "rgba(68, 138, 255, 0.08)",
} as const

// ─── Dark Mode (current default) / Future Light Mode ────────────────

export type ColorMode = "dark" | "light"

export const modes = {
  dark: {
    background: roles.background,
    foreground: roles.foreground,
    card: roles.card,
    cardForeground: roles.cardForeground,
    primary: semantic.primary,
    primaryForeground: semantic.primaryForeground,
    border: roles.border,
    muted: roles.muted,
    mutedForeground: roles.mutedForeground,
    accent: roles.accent,
    accentForeground: roles.accentForeground,
  },
  /** Placeholder — fill in when light mode is designed */
  light: {
    background: "#fafafa",
    foreground: "#0a0a0f",
    card: "#ffffff",
    cardForeground: "#0a0a0f",
    primary: semantic.primary,
    primaryForeground: semantic.primaryForeground,
    border: "#e2e2ea",
    muted: "#f4f4f6",
    mutedForeground: "#6b6b82",
    accent: "#f0f0f8",
    accentForeground: "#0a0a0f",
  },
} as const

// ─── Aggregate Export ───────────────────────────────────────────────

export const colors = {
  primitive,
  semantic,
  roles,
  district,
  districtPalette,
  status,
  glow,
  modes,
} as const
