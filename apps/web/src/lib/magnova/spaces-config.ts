import type { SpaceData, ZoneData, MagnovaCitySnapshot } from "./types"

/**
 * Hardcoded configuration for the 10 Magnova cowork spaces.
 * Radial layout: Castle (Orchestrator) at center, others in a ring.
 * Quadrants: NE=tech, SE=data, SW=creative, NW=research
 */
const SPACES: SpaceData[] = [
  {
    slug: "orchestrator",
    name: "Orchestrator",
    description: "Central command — coordinate multi-agent workflows",
    category: "tech",
    status: "active",
    position: { x: 0, z: 0 },
    buildingType: "castle",
    color: "#E8B84B",
    stats: { runs: 42, lastActive: "2026-03-03" },
  },
  {
    slug: "graphini",
    name: "Graphini",
    description: "AI-powered graph visualization and knowledge mapping",
    category: "tech",
    status: "active",
    position: { x: -10, z: -10 },
    buildingType: "observatory",
    color: "#4A90D9",
    stats: { runs: 128, lastActive: "2026-03-03" },
  },
  {
    slug: "debate-arena",
    name: "Debate Arena",
    description: "Multi-model argumentation and perspective analysis",
    category: "creative",
    status: "active",
    position: { x: 10, z: -10 },
    buildingType: "colosseum",
    color: "#9B59B6",
    stats: { runs: 67, lastActive: "2026-03-02" },
  },
  {
    slug: "deep-research",
    name: "Deep Research",
    description: "Academic paper analysis and literature review",
    category: "research",
    status: "active",
    position: { x: -14, z: 0 },
    buildingType: "library",
    color: "#E67E22",
    stats: { runs: 89, lastActive: "2026-03-03" },
  },
  {
    slug: "sql-playground",
    name: "SQL Playground",
    description: "Natural language to SQL with live query execution",
    category: "data",
    status: "active",
    position: { x: 14, z: 0 },
    buildingType: "warehouse",
    color: "#27AE60",
    stats: { runs: 34, lastActive: "2026-03-01" },
  },
  {
    slug: "data-viz",
    name: "Data Viz Studio",
    description: "Transform data into interactive visualizations",
    category: "data",
    status: "active",
    position: { x: 10, z: 10 },
    buildingType: "workshop",
    color: "#2ECC71",
    stats: { runs: 56, lastActive: "2026-03-02" },
  },
  {
    slug: "git-reviewer",
    name: "Git Diff Reviewer",
    description: "AI-powered code review with visual diffs",
    category: "tech",
    status: "building",
    position: { x: -10, z: 10 },
    buildingType: "tower",
    color: "#3498DB",
    stats: { runs: 0 },
  },
  {
    slug: "astrova",
    name: "Astrova",
    description: "Vedic astrology calculations and chart generation",
    category: "creative",
    status: "active",
    position: { x: 0, z: -14 },
    buildingType: "temple",
    color: "#8E44AD",
    stats: { runs: 203, lastActive: "2026-03-03" },
  },
  {
    slug: "rag-knowledge",
    name: "RAG Knowledge Base",
    description: "Upload docs, build knowledge, ask questions",
    category: "research",
    status: "building",
    position: { x: 0, z: 14 },
    buildingType: "archive",
    color: "#D35400",
    stats: { runs: 12, lastActive: "2026-02-28" },
  },
  {
    slug: "api-playground",
    name: "API Playground",
    description: "Test and explore APIs with AI assistance",
    category: "tech",
    status: "locked",
    position: { x: -14, z: -10 },
    buildingType: "laboratory",
    color: "#2980B9",
    stats: { runs: 0 },
  },
]

const ZONES: ZoneData[] = [
  {
    name: "Tech Quarter",
    category: "tech",
    color: "#4A90D9",
    bounds: { x: -16, z: -16, width: 16, depth: 16 },
  },
  {
    name: "Creative District",
    category: "creative",
    color: "#9B59B6",
    bounds: { x: 0, z: -16, width: 16, depth: 16 },
  },
  {
    name: "Data Hub",
    category: "data",
    color: "#27AE60",
    bounds: { x: 0, z: 0, width: 16, depth: 16 },
  },
  {
    name: "Research Campus",
    category: "research",
    color: "#E67E22",
    bounds: { x: -16, z: 0, width: 16, depth: 16 },
  },
]

export function getMagnovaCitySnapshot(): MagnovaCitySnapshot {
  return {
    spaces: SPACES,
    zones: ZONES,
  }
}
