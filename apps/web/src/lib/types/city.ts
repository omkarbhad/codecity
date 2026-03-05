export type FileType = "typescript" | "javascript" | "python" | "css" | "config" | "markup" | "other"

export type LayoutMode = "folder" | "extension" | "semantic"

export interface CitySnapshot {
  files: FileData[]
  districts: DistrictData[]
  stats: CityStats
  warnings?: string[]
}

export interface FileData {
  path: string
  lines: number
  functions: FunctionData[]
  types: TypeData[]
  classes: { name: string }[]
  imports: string[]
  importedBy: string[]
  externalImports: string[]
  decorators: string[]
  complexity: number
  isReactComponent: boolean
  hasUnusedExports: boolean
  fileType: FileType
  position: { x: number; z: number }
  district: string
  subFolder?: string
}

export interface FunctionData {
  name: string
  exported: boolean
  lines: number
}

export interface TypeData {
  name: string
  kind: "type" | "interface" | "enum" | "class" | "decorator" | "selector"
}

export interface SubDistrictData {
  name: string
  color: string
  bounds: { x: number; z: number; width: number; depth: number }
  subDistricts?: SubDistrictData[]  // Recursive nesting for deeper folder levels
}

export interface DistrictData {
  name: string
  color: string
  files: string[]
  bounds: { x: number; z: number; width: number; depth: number }
  subDistricts?: SubDistrictData[]
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
  "#00e5ff", "#00e676", "#448aff", "#ffea00",
  "#b388ff", "#ff9100", "#ff4081", "#1de9b6",
  "#aeea00", "#ff1744", "#8c9eff", "#ffc400",
] as const
