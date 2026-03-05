/**
 * CodeCity Spacing System
 *
 * Based on a 4px base grid aligned with Tailwind conventions.
 * Extracted from component padding/margin patterns in globals.css.
 */

// ─── Base Grid ──────────────────────────────────────────────────────

/** Base unit in pixels — all spacing derives from this */
export const baseUnit = 4

// ─── Spacing Scale (Tailwind-compatible) ────────────────────────────

export const spacing = {
  /** 0px */
  "0": "0px",
  /** 1px */
  px: "1px",
  /** 2px — 0.5 × base */
  "0.5": "0.125rem",
  /** 4px — 1 × base */
  "1": "0.25rem",
  /** 6px — 1.5 × base */
  "1.5": "0.375rem",
  /** 8px — 2 × base */
  "2": "0.5rem",
  /** 10px — 2.5 × base */
  "2.5": "0.625rem",
  /** 12px — 3 × base */
  "3": "0.75rem",
  /** 14px — 3.5 × base */
  "3.5": "0.875rem",
  /** 16px — 4 × base */
  "4": "1rem",
  /** 20px — 5 × base */
  "5": "1.25rem",
  /** 24px — 6 × base */
  "6": "1.5rem",
  /** 28px — 7 × base */
  "7": "1.75rem",
  /** 32px — 8 × base */
  "8": "2rem",
  /** 36px — 9 × base */
  "9": "2.25rem",
  /** 40px — 10 × base */
  "10": "2.5rem",
  /** 44px — 11 × base */
  "11": "2.75rem",
  /** 48px — 12 × base */
  "12": "3rem",
  /** 56px — 14 × base */
  "14": "3.5rem",
  /** 64px — 16 × base */
  "16": "4rem",
  /** 80px — 20 × base */
  "20": "5rem",
  /** 96px — 24 × base */
  "24": "6rem",
  /** 128px — 32 × base */
  "32": "8rem",
  /** 160px — 40 × base */
  "40": "10rem",
  /** 192px — 48 × base */
  "48": "12rem",
  /** 256px — 64 × base */
  "64": "16rem",
  /** 320px — 80 × base */
  "80": "20rem",
  /** 384px — 96 × base */
  "96": "24rem",
} as const

// ─── Layout Spacing ─────────────────────────────────────────────────

export const layout = {
  /** Navbar height */
  navbarHeight: "3.75rem",
  /** Content container max-width */
  containerMaxWidth: "80rem",
  /** Content container padding by breakpoint */
  containerPadding: {
    base: "1rem",
    sm: "1.5rem",
    lg: "2rem",
  },
  /** Page shell min-height (viewport minus navbar) */
  pageMinHeight: "calc(100vh - 3.75rem)",
  /** Background grid sizes */
  gridSize: "60px",
  gridSizeFine: "24px",
} as const
