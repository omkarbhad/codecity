import type { FileData } from "@/lib/types/city"

export const BUILDING_HEIGHT_SCALE = 60
export const MIN_BUILDING_HEIGHT = 0.3
export const MAX_BUILDING_HEIGHT = 50

export function getBuildingHeight(file: Pick<FileData, "lines">): number {
  return Math.max(
    MIN_BUILDING_HEIGHT,
    Math.min(MAX_BUILDING_HEIGHT, file.lines / BUILDING_HEIGHT_SCALE)
  )
}
