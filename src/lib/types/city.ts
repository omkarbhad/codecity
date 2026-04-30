export type FileType =
  | "typescript"
  | "javascript"
  | "python"
  | "rust"
  | "go"
  | "java"
  | "css"
  | "markup"
  | "config"
  | "c"
  | "cpp"
  | "ruby"
  | "php"
  | "swift"
  | "kotlin"
  | "bash"
  | "zig"
  | "lua"
  | "haskell"
  | "dart"
  | "elixir"
  | "scala"
  | "r"
  | "julia"
  | "perl"
  | "csharp"
  | "erlang"
  | "nix"
  | "glsl"
  | "ocaml"
  | "groovy"
  | "elisp"
  | "other"

export type LayoutMode = "folder" | "extension" | "semantic"

export interface CitySnapshot {
  schemaVersion: number
  files: FileData[]
  districts: DistrictData[]
  stats: CityStats
  warnings?: string[]
}

export interface FileData {
  path: string
  lines: number
  sizeBytes: number
  extension: string
  language: string
  functions: FunctionData[]
  types: TypeData[]
  classes: ClassData[]
  symbols: SymbolData[]
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
  startLine: number
  endLine: number
}

export interface TypeData {
  name: string
  kind: string
  startLine: number
  endLine: number
}

export interface ClassData {
  name: string
  startLine: number
  endLine: number
}

export interface SymbolData {
  name: string
  kind: string
  exported: boolean
  startLine: number
  endLine: number
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
  totalClasses: number
  totalLines: number
  totalTypes: number
  totalImports: number
  externalImports: number
  unusedExports: number
  totalComplexity: number
  averageComplexity: number
  maxComplexity: number
  languages: LanguageStats[]
}

export interface LanguageStats {
  language: string
  files: number
  lines: number
  symbols: number
}

export const DISTRICT_COLORS = [
  "#00e5ff", "#00e676", "#448aff", "#ffea00",
  "#b388ff", "#ff9100", "#ff4081", "#1de9b6",
  "#aeea00", "#ff1744", "#8c9eff", "#ffc400",
] as const
