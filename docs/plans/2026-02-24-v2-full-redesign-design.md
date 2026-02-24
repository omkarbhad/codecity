# CodeCity v2 Full Redesign — Design Document

**Date:** 2026-02-24
**Scope:** Full app redesign with shadcn v2 + real 3D visualization + analysis pipeline

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Scope | Full app redesign + 3D viz | User wants the complete experience |
| Color palette | Original (#07070c dark, #ff4040 neon red, vibrant districts) | Proven to look great, user loved it |
| Typography | Sora (300-800) + IBM Plex Mono (400-600) | Match original's cyberpunk aesthetic |
| UI framework | shadcn v2 Mira preset + palette override | Modern components with custom energy |
| Analysis pipeline | Server-side (API routes) | Fits existing Prisma schema, no rate limits, persistent results |
| 3D engine | React Three Fiber + @react-three/drei | React-native 3D, proper state management |

---

## 1. Design System

### shadcn v2 Setup
Install via: `pnpm dlx shadcn@latest create --preset "https://ui.shadcn.com/init?base=base&style=mira&baseColor=zinc&theme=red&iconLibrary=lucide&menuAccent=bold&menuColor=default&radius=small&template=next&rtl=false" --template next`

Override CSS variables with the original palette:

```
--background: #07070c
--foreground: #e4e4ec
--primary: #ff4040
--primary-foreground: #ffffff
--muted: #12121a
--muted-foreground: #5a5a6e
--card: #0d0d14
--card-foreground: #e4e4ec
--border: #1a1a2e
--input: #1a1a2e
--ring: #ff4040
--accent: #1a1a2e
--accent-foreground: #e4e4ec
--destructive: #ff4040
```

### Typography
- **Sora** (Google Fonts): Headings, UI labels, buttons — weights 300-800
- **IBM Plex Mono** (Google Fonts): Code paths, stats, monospace labels — weights 400-600
- Load via `<link>` in root layout head

### Glassmorphism Pattern
Key panels use: `backdrop-blur-xl bg-card/60 border border-border/50`

### District Colors (for 3D viz)
```
cyan: #22d3ee, green: #34d399, blue: #4d94ff, yellow: #fbbf24,
purple: #a78bfa, orange: #fb923c, pink: #f472b6, teal: #2dd4bf,
lime: #84cc16, red: #ef4444, indigo: #818cf8, amber: #f59e0b
```

### shadcn Components Used
Button, Card, Dialog, Input, Tabs, Badge, DropdownMenu, Table, Toggle, Tooltip, Progress, Separator, Sheet, Select

---

## 2. Homepage

### Layout (full-viewport immersive)
```
NAVBAR (glassmorphic sticky)
  [CC icon] CodeCity   [Explore] [Dashboard / Sign In]

HERO
  "CODEBASE VISUALIZATION ENGINE" (mono, small, tracking-wider, red/40)
  "See Your Code" (Sora, 5xl-7xl, white)
  "as a City" (Sora, 5xl-7xl, neon red with text-glow)

  [LIVE 3D DEMO — pre-built sample city, auto-rotating]
  (R3F Canvas, ~16:9 aspect, rounded border, glassmorphic frame)

  [ Paste a GitHub repo URL...        [Analyze →] ]
  Quick: [Excalidraw] [Next.js] [Zustand] [tRPC] [create-t3-app]

FEATURES (3 glassmorphic cards)
  [3D Visualization]  [Dependency Mapping]  [Code Intelligence]
  District-colored icons, brief descriptions

FOOTER (minimal, monospace)
```

### Live 3D Demo
- Small pre-generated city data (hardcoded, ~30 files from a sample repo)
- Auto-rotating camera orbit, no user interaction needed
- Ambient district colors, subtle building glow
- Serves as the product demo — user sees what they'll get

---

## 3. 3D City Visualization

### Page: `/project/[id]`

```
TOP BAR (glassmorphic)
  [← Back] owner/repo   [Dependencies] [Complexity] [Size] [Unused] [Types]   [Search] [⚙]

LEFT SIDEBAR
  Minimap (canvas 2D, top-down)
  Districts legend (colored dots + names + file counts)
  Keyboard shortcuts reference

3D CANVAS (center, fills remaining space)
  React Three Fiber scene

RIGHT SIDEBAR (340px, slides in on selection)
  File path (mono, dim)
  Stats grid: Lines | Functions | Complexity | Types | Imports | Imported By
  Flags: React Component, Potentially Unused, N Classes
  Expandable sections: Functions, Types, Classes, Imports, Imported By

BOTTOM STATS BAR
  Files | Functions | Imports | Unused | Lines | Types
```

### R3F Scene Architecture

**Scene graph:**
```
<Canvas>
  <CameraController />       — orbit controls, fly-to animations
  <Lighting />                — 3-point: ambient + sun + fill
  <Ground />                  — dark plane + grid + fog
  <DistrictGrounds />         — semi-transparent colored planes per district
  <Buildings />               — instanced meshes for performance
    <Building />              — per file: box + edge lines
      <FloorLines />          — per function: horizontal planes
      <ComplexityAntenna />   — red cylinder + sphere (complexity > 20)
      <ReactDome />           — blue hemisphere (React components)
      <TypeRing />            — yellow torus (3+ types)
      <UnusedOutline />       — pulsing red wireframe
      <LargeFilePlatform />   — wider base (200+ lines)
  <DependencyPipes />         — Catmull-Rom curves between buildings
    <FlowParticles />         — animated spheres along pipes
  <Effects />                 — post-processing bloom for glow
</Canvas>
```

**Building generation:**
```typescript
height = clamp(lines / 50, 0.4, 18)
width = clamp(1.2 + functions.length * 0.15, 1.2, 2.8)
depth = width
color = district.color
```

**Lighting:**
- Ambient: `#303050` intensity 0.7 (cool blue-purple base)
- Directional sun: `#ffeedd` intensity 0.7, position (40, 60, 30), shadow map 2048
- Fill: `#4d94ff` intensity 0.2, negative X (blue rim)
- Tone mapping: ACESFilmicToneMapping, exposure 1.1

**Interactions:**
- Hover: scale 1.06x, tooltip with filename + stats
- Click: scale 1.1x, breathing animation, reveal right panel, show dependency pipes
- Right-drag: orbit camera
- Scroll: zoom (10-200 units)
- R key: reset camera
- Visualization mode buttons change building material colors/emissive

**Dependency pipes:**
- CatmullRomCurve3 with 3 control points (start, mid-height, end)
- Red for outgoing, blue for incoming
- Flow particles: small white spheres with sine-wave opacity

**Performance:**
- GPU instancing via InstancedMesh for buildings
- Level of detail: hide architectural details (floor lines, rings) at distance
- Frustum culling built into R3F
- Post-processing bloom only on emissive materials

---

## 4. Analysis Pipeline

### Flow
```
POST /api/analyze { repoUrl: string }
  → Validate URL, extract owner/repo
  → Create Project { status: PENDING }
  → Start async analysis job

Analysis job (runs server-side):
  1. GitHub API: GET /repos/{owner}/{repo}/git/trees/{branch}?recursive=1
     → Filter .ts/.tsx files, skip node_modules/dist/test
  2. Batch download: raw.githubusercontent.com/{owner}/{repo}/{branch}/{path}
     → Concurrent with concurrency limit (10 at a time)
  3. TypeScript parsing per file:
     → Use ts-morph (TypeScript compiler wrapper) for AST analysis
     → Extract: functions (name, exported, line count), types/interfaces/enums,
       classes, imports (resolve relative paths), complexity (branch count),
       isReactComponent (JSX detection), unused export detection
  4. Build dependency graph: resolve import paths to file paths
  5. Compute districts: group by top-level folder
  6. Layout algorithm: position buildings in district grid
  7. Store Snapshot as JSON in DB

Progress: SSE via GET /api/analyze/[id]/progress
  → Events: { stage: string, progress: number, message: string }
  → Stages: fetching-tree, downloading-files, parsing, computing-layout, complete
```

### Data Schema (Snapshot JSON)
```typescript
interface CitySnapshot {
  files: FileData[]
  districts: DistrictData[]
  stats: { totalFiles: number, totalFunctions: number, totalLines: number, totalTypes: number, totalImports: number, unusedExports: number }
}

interface FileData {
  path: string
  lines: number
  functions: { name: string, exported: boolean, lines: number }[]
  types: { name: string, kind: "type" | "interface" | "enum" }[]
  classes: { name: string }[]
  imports: string[]
  importedBy: string[]
  complexity: number
  isReactComponent: boolean
  hasUnusedExports: boolean
  // Layout (computed):
  position: { x: number, z: number }
  district: string
}

interface DistrictData {
  name: string
  color: string
  files: string[]
  bounds: { x: number, z: number, width: number, depth: number }
}
```

### API Endpoints (new/modified)
- `POST /api/analyze` — start analysis, returns project ID
- `GET /api/analyze/[id]/progress` — SSE progress stream
- `GET /api/projects/[id]/snapshot` — return snapshot data for R3F rendering

---

## 5. Dashboard

### My Projects tab
Card grid. Each card:
- City silhouette thumbnail (CSS, not 3D)
- Repo name (bold) + owner (dim)
- Status badge: Completed (green), Processing (amber pulse), Failed (red), Pending (gray)
- Stats: N files, N functions
- Last analyzed date
- Click → `/project/[id]`

"New Analysis" button (neon red) opens dialog with repo URL input.

### Explore tab
Public gallery, same card layout. Search bar. Sorted by recent/popular.

---

## 6. Admin Console

Unchanged architecture from current. Restyle with:
- shadcn v2 Table for user/project management
- shadcn Card for stat panels
- shadcn Switch for feature flags
- Original palette (neon red numbers, glassmorphic panels)
- Overview: stat cards (USR/PRJ/PUB/ERR tags), recent users, recent projects

---

## 7. Auth Fixes

1. Generate AUTH_SECRET: `openssl rand -base64 33`
2. Create `.env.local` with all required vars
3. Restore PrismaAdapter in auth.ts
4. Restore Google provider in auth.config.ts
5. Fix JWT callbacks with role propagation + user ID
6. Auto-admin promotion for first user / ADMIN_EMAIL
7. Login page: shadcn Card, Google + GitHub buttons, neon red glow border

---

## 8. New Dependencies

```
@react-three/fiber        — React Three.js renderer
@react-three/drei         — R3F utilities (OrbitControls, Text, etc.)
@react-three/postprocessing — bloom, tone mapping
three                     — Three.js core
ts-morph                  — TypeScript AST analysis (server-side)
```

---

## 9. File Structure Changes

```
apps/web/src/
  app/
    project/[id]/page.tsx          — visualization page (NEW)
    api/analyze/route.ts           — start analysis (NEW)
    api/analyze/[id]/progress/route.ts — SSE progress (NEW)
    api/projects/[id]/snapshot/route.ts — snapshot data (NEW)
  components/
    city/                          — 3D visualization (NEW)
      city-scene.tsx               — main R3F Canvas
      building.tsx                 — individual building mesh
      district-ground.tsx          — district floor plane
      dependency-pipes.tsx         — curve pipes + particles
      camera-controller.tsx        — orbit + fly-to
      lighting.tsx                 — 3-point setup
      minimap.tsx                  — 2D canvas minimap
      file-tree.tsx                — hierarchical file nav
      file-details.tsx             — right sidebar panel
      stats-bar.tsx                — bottom stats
      mode-toolbar.tsx             — visualization mode switcher
      search-bar.tsx               — file search
    home/                          — homepage components (REDESIGN)
    dashboard/                     — dashboard components (REDESIGN)
    admin/                         — admin components (REDESIGN)
    layout/                        — navbar, footer (REDESIGN)
  lib/
    analysis/                      — analysis pipeline (NEW)
      github.ts                    — GitHub API client
      parser.ts                    — TypeScript AST parsing
      layout.ts                    — city layout algorithm
      pipeline.ts                  — orchestrator
    city-data.ts                   — types + sample data for homepage demo
packages/ui/src/styles/
  globals.css                      — redesigned with shadcn v2 + original palette
```
