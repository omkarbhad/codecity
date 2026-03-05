/**
 * CodeCity Border Radius System
 *
 * Extracted from globals.css @theme --radius-* variables
 * and component-level patterns.
 */

// ─── Scale ──────────────────────────────────────────────────────────

export const radius = {
  /** 0px — sharp corners */
  none: "0",
  /** 6px — small elements (badges, chips) */
  sm: "0.375rem",
  /** 8px — default (buttons, inputs) */
  md: "0.5rem",
  /** 12px — cards, panels */
  lg: "0.75rem",
  /** 16px — large panels, modals */
  xl: "1rem",
  /** 24px — pills, floating panels */
  "2xl": "1.5rem",
  /** 9999px — fully round */
  full: "9999px",
} as const

// ─── Component-Level Radius ─────────────────────────────────────────

export const componentRadius = {
  button: radius.md,
  buttonSmall: radius.md,
  input: radius.md,
  card: radius.xl,
  dialog: radius.lg,
  glassPanel: radius.lg,
  panelSurface: radius.xl,
  tooltip: radius.md,
  badge: radius.md,
  scrollbarThumb: "3px",
} as const
