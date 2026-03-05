/**
 * CodeCity Breakpoint System
 *
 * Aligned with Tailwind defaults and content-container
 * media queries from globals.css.
 */

// ─── Breakpoint Scale ───────────────────────────────────────────────

export const breakpoints = {
  /** Small phones */
  xs: "475px",
  /** Large phones / small tablets */
  sm: "640px",
  /** Tablets */
  md: "768px",
  /** Small laptops / landscape tablets */
  lg: "1024px",
  /** Desktops */
  xl: "1280px",
  /** Wide screens */
  "2xl": "1536px",
} as const

// ─── Numeric Values (for JS comparisons) ────────────────────────────

export const breakpointValues = {
  xs: 475,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  "2xl": 1536,
} as const

// ─── Media Query Helpers ────────────────────────────────────────────

export const mediaQuery = {
  xs: `(min-width: ${breakpoints.xs})`,
  sm: `(min-width: ${breakpoints.sm})`,
  md: `(min-width: ${breakpoints.md})`,
  lg: `(min-width: ${breakpoints.lg})`,
  xl: `(min-width: ${breakpoints.xl})`,
  "2xl": `(min-width: ${breakpoints["2xl"]})`,
} as const

/** Check if the current viewport is at least the given breakpoint */
export function isAbove(bp: keyof typeof breakpointValues): boolean {
  if (typeof window === "undefined") return false
  return window.innerWidth >= breakpointValues[bp]
}
