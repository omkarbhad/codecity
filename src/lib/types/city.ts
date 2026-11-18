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
  | "json"
  | "markdown"
  | "mdx"
  | "toml"
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
  | "vue"
  | "svelte"
  | "astro"
  | "graphql"
  | "sql"
  | "proto"
  | "dockerfile"
  | "makefile"
  | "shader"
  | "cuda"
  | "llvm"
  | "nvidiaartifact"
  | "webassembly"
  | "fsharp"
  | "visualbasic"
  | "objectivec"
  | "clojure"
  | "lisp"
  | "idris"
  | "agda"
  | "lean"
  | "purescript"
  | "nim"
  | "crystal"
  | "vlang"
  | "dlang"
  | "powershell"
  | "batch"
  | "assembly"
  | "terraform"
  | "template"
  | "restructuredtext"
  | "asciidoc"
  | "latex"
  | "gherkin"
  | "data"
  | "notebook"
  | "mlmodel"
  | "mlcheckpoint"
  | "mltensor"
  | "mltokenizer"
  | "binary"
  | "configlanguage"
  | "diagram"
  | "hardware"
  | "matlab"
  | "qml"
  | "other"

export type LayoutMode = "folder" | "extension" | "semantic"

export interface CitySnapshot {
  schemaVersion: number
  files: FileData[]
  districts: DistrictData[]
  stats: CityStats
  sourceTree?: SourceTreeEntry[]
  warnings?: string[]
  /** Pre-baked network analysis. Optional to gracefully handle pre-schema snapshots. */
  network?: NetworkAnalysis
}

export interface NetworkAnalysis {
  communities: CommunitySummary[]
  entryPoints: EntryPoint[]
  hubs: HubRef[]
  /**
   * Symbol-rich graph nodes (files + functions + types + classes). Each node
   * has a baked position from the Rust community-grid layout. The network
   * view renders these directly — same model graphify uses.
   */
  nodes?: NetworkNode[]
  /**
   * Symbol-rich graph edges. Today: `calls` (one symbol calls another) and
   * `contains` (file owns a symbol). Empty on pre-schema snapshots.
   */
  edges?: NetworkEdge[]
  /**
   * File-pair edges, aggregated from `edges`. Reserved for views that want
   * file-level connectivity without the symbol detail.
   */
  fileEdges?: NetworkFileEdge[]
}

export type NetworkNodeKind = "file" | "function" | "type" | "class"

export interface NetworkNode {
  id: string
  label: string
  kind: NetworkNodeKind
  filePath: string
  inDegree: number
  outDegree: number
  community: number
  /** Baked X coordinate from the Rust community-grid layout. */
  networkX?: number
  /** Baked Y coordinate from the Rust community-grid layout. */
  networkY?: number
  position?: { x: number; y: number } | null
}

export interface NetworkEdge {
  source: string
  target: string
  kind: "calls" | "contains" | "imports"
}

export interface NetworkFileEdge {
  source: string
  target: string
  /** Always "calls" today; reserved for future expansion. */
  kind: "calls" | "imports" | "contains"
}

export interface CommunitySummary {
  id: number
  rank: number
  size: number
  /** Member file paths sorted by degree desc. */
  members: string[]
  /** Top hub paths (subset of members). */
  hubs: string[]
}

export interface EntryPoint {
  path: string
  outDegree: number
  /** Number of files transitively reachable via imports. */
  reachable: number
}

export interface HubRef {
  path: string
  inDegree: number
}

export interface SourceTreeEntry {
  path: string
  isFile: boolean
  parsed: boolean
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
  frontendFrameworks: string[]
  isReactComponent: boolean
  hasUnusedExports: boolean
  fileType: FileType
  position: { x: number; z: number }
  /** Footprint side the layout sized the lot for; absent on older snapshots. */
  width?: number
  district: string
  subFolder?: string
  /** From Rust network analysis; absent on pre-schema snapshots. */
  inDegree?: number
  outDegree?: number
  /** Louvain community ID; -1 if unconnected, absent on pre-schema snapshots. */
  community?: number
  /** Baked Network-mode position (FCoSE in Rust). NaN if file has no edges. */
  networkX?: number
  networkY?: number
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
