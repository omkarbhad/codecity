export type BuildingType =
  | "observatory"   // Graphini — tall dome + telescope
  | "colosseum"     // Debate Arena — circular tiered
  | "library"       // Deep Research — tall shelved tower
  | "warehouse"     // SQL Playground — industrial
  | "workshop"      // Data Viz — workshop with chimney
  | "tower"         // Git Diff Reviewer — watchtower
  | "temple"        // Astrova — dome + spires
  | "archive"       // RAG Knowledge Base — stepped pyramid
  | "laboratory"    // API Playground — pipes + antenna
  | "castle"        // Orchestrator — central, largest

export type SpaceCategory = "tech" | "creative" | "data" | "research"
export type SpaceStatus = "active" | "building" | "locked"

export interface SpaceData {
  slug: string
  name: string
  description: string
  category: SpaceCategory
  status: SpaceStatus
  position: { x: number; z: number }
  buildingType: BuildingType
  color: string
  stats: { runs: number; lastActive?: string }
}

export interface ZoneData {
  name: string
  category: SpaceCategory
  color: string
  bounds: { x: number; z: number; width: number; depth: number }
}

export interface MagnovaCitySnapshot {
  spaces: SpaceData[]
  zones: ZoneData[]
}

// Color palettes per category
export const CATEGORY_COLORS: Record<SpaceCategory, { primary: string; secondary: string; accent: string }> = {
  tech:     { primary: "#4A90D9", secondary: "#6BAED6", accent: "#2171B5" },
  creative: { primary: "#9B59B6", secondary: "#BB8FCE", accent: "#7D3C98" },
  data:     { primary: "#27AE60", secondary: "#58D68D", accent: "#1E8449" },
  research: { primary: "#E67E22", secondary: "#F0B27A", accent: "#CA6F1E" },
}

// Warm terrain palette
export const TERRAIN_COLORS = {
  water:     "#5B9BD5",
  waterDeep: "#2E75B6",
  sand:      "#E8D5B7",
  grass:     "#7CB342",
  grassDark: "#558B2F",
  dirt:      "#A1887F",
  rock:      "#78909C",
  snow:      "#ECEFF1",
}
