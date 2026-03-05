/**
 * CodeCity Shadow & Elevation System
 *
 * Extracted from globals.css glow effects, glass panels,
 * and component box-shadow patterns.
 */

// ─── Elevation Scale ────────────────────────────────────────────────

export const elevation = {
  /** No shadow */
  none: "none",
  /** Subtle border glow — used for cards at rest */
  sm: "0 1px 2px rgba(0, 0, 0, 0.4)",
  /** Default card shadow */
  md: "0 2px 8px rgba(0, 0, 0, 0.5), 0 1px 3px rgba(0, 0, 0, 0.3)",
  /** Raised panels */
  lg: "0 4px 16px rgba(0, 0, 0, 0.6), 0 2px 6px rgba(0, 0, 0, 0.4)",
  /** Modals and overlays */
  xl: "0 8px 32px rgba(0, 0, 0, 0.7), 0 4px 12px rgba(0, 0, 0, 0.5)",
} as const

// ─── Glow Shadows (neon red accent) ─────────────────────────────────

export const glowShadow = {
  /** Subtle red glow — resting state for primary elements */
  red: "0 0 20px rgba(255, 61, 61, 0.15), 0 0 60px rgba(255, 61, 61, 0.05)",
  /** Stronger glow — hover / active state */
  redStrong: "0 0 30px rgba(255, 61, 61, 0.3), 0 0 80px rgba(255, 61, 61, 0.12)",
  /** Active mode button glow */
  redActive: "0 0 10px rgba(255, 61, 61, 0.35)",
  /** Focus ring glow */
  redFocus: "0 0 0 2px rgba(255, 61, 61, 0.12)",
} as const

// ─── Text Shadows ───────────────────────────────────────────────────

export const textShadow = {
  /** Neon glow for hero text */
  glowRed: "0 0 24px rgba(255, 61, 61, 0.5), 0 0 48px rgba(255, 61, 61, 0.2)",
} as const

// ─── Glassmorphism ──────────────────────────────────────────────────

export const glassmorphism = {
  /** Standard glass panel */
  panel: {
    background: "rgba(10, 10, 16, 0.92)",
    backdropFilter: "blur(12px)",
    border: "1px solid var(--color-border)",
  },
  /** Panel surface with gradient */
  surface: {
    background: "linear-gradient(180deg, rgba(12, 12, 21, 0.84) 0%, rgba(8, 8, 14, 0.88) 100%)",
    backdropFilter: "blur(12px)",
    border: "1px solid rgba(255, 255, 255, 0.08)",
  },
} as const

// ─── Aggregate Export ───────────────────────────────────────────────

export const shadows = {
  elevation,
  glowShadow,
  textShadow,
  glassmorphism,
} as const
