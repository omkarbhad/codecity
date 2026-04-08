import type { FileData } from "@/lib/types/city"

export interface CityBounds {
  minX: number
  maxX: number
  minZ: number
  maxZ: number
  centerX: number
  centerZ: number
  spread: number
  hasFiles: boolean
}

const EMPTY_BOUNDS: CityBounds = {
  minX: 0,
  maxX: 0,
  minZ: 0,
  maxZ: 0,
  centerX: 0,
  centerZ: 0,
  spread: 30,
  hasFiles: false,
}

export function getCityBounds(files: Pick<FileData, "position">[]): CityBounds {
  if (files.length === 0) return EMPTY_BOUNDS

  let minX = Infinity
  let maxX = -Infinity
  let minZ = Infinity
  let maxZ = -Infinity

  for (const file of files) {
    const { x, z } = file.position
    if (!Number.isFinite(x) || !Number.isFinite(z)) continue
    if (x < minX) minX = x
    if (x > maxX) maxX = x
    if (z < minZ) minZ = z
    if (z > maxZ) maxZ = z
  }

  if (!Number.isFinite(minX) || !Number.isFinite(maxX) || !Number.isFinite(minZ) || !Number.isFinite(maxZ)) {
    return EMPTY_BOUNDS
  }

  return {
    minX,
    maxX,
    minZ,
    maxZ,
    centerX: (minX + maxX) / 2,
    centerZ: (minZ + maxZ) / 2,
    spread: Math.max(maxX - minX, maxZ - minZ, 30),
    hasFiles: true,
  }
}
