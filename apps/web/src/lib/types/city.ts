export interface CitySnapshot {
  files: FileData[]
  districts: DistrictData[]
  stats: CityStats
}

export interface FileData {
  path: string
  lines: number
  functions: FunctionData[]
  types: TypeData[]
  classes: { name: string }[]
  imports: string[]
  importedBy: string[]
  complexity: number
  isReactComponent: boolean
  hasUnusedExports: boolean
  position: { x: number; z: number }
  district: string
}

export interface FunctionData {
  name: string
  exported: boolean
  lines: number
}

export interface TypeData {
  name: string
  kind: "type" | "interface" | "enum"
}

export interface DistrictData {
  name: string
  color: string
  files: string[]
  bounds: { x: number; z: number; width: number; depth: number }
}

export interface CityStats {
  totalFiles: number
  totalFunctions: number
  totalLines: number
  totalTypes: number
  totalImports: number
  unusedExports: number
}

export const DISTRICT_COLORS = [
  "#22d3ee", "#34d399", "#4d94ff", "#fbbf24",
  "#a78bfa", "#fb923c", "#f472b6", "#2dd4bf",
  "#84cc16", "#ef4444", "#818cf8", "#f59e0b",
] as const
