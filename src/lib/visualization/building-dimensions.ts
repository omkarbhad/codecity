import type { FileData } from "@/lib/types/city"

export const MIN_BUILDING_HEIGHT = 0.3
export const MAX_BUILDING_HEIGHT = 30
const HEIGHT_EXPONENT = 0.7
const HEIGHT_DIVISOR = 11.6
/** Above this height a tower keeps growing, but at 40% of the rate. */
const HEIGHT_KNEE = 16
const HEIGHT_KNEE_SLOPE = 0.4

/**
 * Height grows with lines^0.7, so a file 10x larger stands about 5x taller.
 * (A linear scale turned large files into needles 20x taller than they are wide.)
 * Very large files are compressed further so one generated file does not dwarf the city.
 * Order is preserved: more lines is always taller. ~100 lines = 2.2, ~1000 = 10.8, ~2900 = 18.8, ~5000 = 21.
 * Keep in sync with `building_height` in crates/codecity-core/src/layout/mod.rs.
 */
export function getBuildingHeight(file: Pick<FileData, "lines">): number {
  let height = Math.pow(Math.max(file.lines, 0), HEIGHT_EXPONENT) / HEIGHT_DIVISOR
  if (height > HEIGHT_KNEE) height = HEIGHT_KNEE + (height - HEIGHT_KNEE) * HEIGHT_KNEE_SLOPE
  return Math.max(MIN_BUILDING_HEIGHT, Math.min(MAX_BUILDING_HEIGHT, height))
}

/**
 * Footprint side. The layout exports the width it sized each lot for; snapshots
 * made before that only have room for the old function-count width.
 */
export function getBuildingWidth(file: Pick<FileData, "width" | "functions">): number {
  return file.width ?? Math.max(1, Math.min(2.2, 1 + file.functions.length * 0.12))
}
