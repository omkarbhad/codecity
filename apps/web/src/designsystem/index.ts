/**
 * CodeCity Design System
 *
 * Centralized export for all design tokens.
 * Usage:
 *   import { colors, typography, spacing } from "@/designsystem"
 */

export {
  // Colors
  colors,
  primitive,
  semantic,
  roles,
  district,
  districtPalette,
  status,
  glow,
  modes,
  // Typography
  typography,
  fontFamily,
  fontSize,
  fontWeight,
  lineHeight,
  letterSpacing,
  textStyles,
  // Spacing
  spacing,
  layout,
  baseUnit,
  // Radius
  radius,
  componentRadius,
  // Shadows
  shadows,
  elevation,
  glowShadow,
  textShadow,
  glassmorphism,
  // Breakpoints
  breakpoints,
  breakpointValues,
  mediaQuery,
  isAbove,
} from "./tokens"

export type { ColorMode, TextStyle } from "./tokens"
