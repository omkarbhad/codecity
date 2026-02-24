# CodeCity v2 Full Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rebuild CodeCity with shadcn v2 Mira, the original's neon-red palette, Sora/IBM Plex Mono, a real React Three Fiber 3D city visualization, and a server-side GitHub analysis pipeline.

**Architecture:** Turborepo monorepo (apps/web Next.js 15, packages/db Prisma, packages/ui shared styles). Server-side analysis pipeline: GitHub API → TypeScript AST parsing via ts-morph → city layout → Snapshot JSON in Prisma DB. Client renders via React Three Fiber with post-processing bloom. shadcn v2 Mira components restyled to #07070c dark + #ff4040 neon red.

**Tech Stack:** Next.js 15, React 19, React Three Fiber, @react-three/drei, @react-three/postprocessing, three.js, ts-morph, shadcn v2 (Mira/zinc/red), Prisma/PostgreSQL, NextAuth v5, Tailwind CSS v4

**Design doc:** `docs/plans/2026-02-24-v2-full-redesign-design.md`

---

## Slice 1: Foundation (Auth fix + shadcn v2 + Dependencies)

### Task 1.1: Fix auth — create .env.local and restore PrismaAdapter

**Files:**
- Create: `apps/web/.env.local`
- Modify: `apps/web/src/auth.ts`
- Modify: `apps/web/src/auth.config.ts`

**Step 1: Create .env.local with AUTH_SECRET**

```bash
cd /Users/omkarbhad/Projects/codecity/apps/web
openssl rand -base64 33 > /tmp/secret.txt
```

Create `apps/web/.env.local`:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/codecity"
AUTH_SECRET="<generated-value>"
AUTH_GITHUB_ID=""
AUTH_GITHUB_SECRET=""
AUTH_GOOGLE_ID=""
AUTH_GOOGLE_SECRET=""
ADMIN_EMAIL=""
AUTH_TRUST_HOST=true
```

**Step 2: Restore PrismaAdapter in auth.ts**

```typescript
import NextAuth, { type DefaultSession } from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@codecity/db"
import authConfig from "./auth.config"

declare module "next-auth" {
  interface User { role?: "USER" | "ADMIN" }
  interface Session { user: { id: string; role: "USER" | "ADMIN" } & DefaultSession["user"] }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma) as any,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  callbacks: {
    async jwt({ token, user }: any) {
      if (user) {
        token.id = user.id
        const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { role: true } })
        token.role = dbUser?.role ?? "USER"
      }
      return token
    },
    session({ session, token }: any) {
      if (token) { session.user.id = token.id; session.user.role = token.role ?? "USER" }
      return session
    },
  },
  events: {
    async createUser({ user }) {
      const adminEmail = process.env.ADMIN_EMAIL
      if (adminEmail && user.email === adminEmail) {
        await prisma.user.update({ where: { id: user.id! }, data: { role: "ADMIN" } })
      } else {
        const userCount = await prisma.user.count()
        if (userCount === 1) await prisma.user.update({ where: { id: user.id! }, data: { role: "ADMIN" } })
      }
    },
  },
  ...authConfig,
})
```

**Step 3: Move secret to env var in auth.config.ts**

Remove the hardcoded secret from auth.config.ts (AUTH_SECRET env var is auto-detected by NextAuth v5).

```typescript
import GitHub from "next-auth/providers/github"
import Google from "next-auth/providers/google"
import type { NextAuthConfig } from "next-auth"

export default {
  providers: [
    GitHub({ clientId: process.env.AUTH_GITHUB_ID, clientSecret: process.env.AUTH_GITHUB_SECRET }),
    Google({ clientId: process.env.AUTH_GOOGLE_ID, clientSecret: process.env.AUTH_GOOGLE_SECRET }),
  ],
  debug: process.env.NODE_ENV === "development",
} satisfies NextAuthConfig
```

**Step 4: Verify dev server starts without MissingSecret error**

```bash
cd /Users/omkarbhad/Projects/codecity && pnpm dev
```

Expected: No `[auth][error] MissingSecret` in console.

**Step 5: Commit**

```bash
git add apps/web/src/auth.ts apps/web/src/auth.config.ts
git commit -m "fix: restore PrismaAdapter and fix AUTH_SECRET configuration"
```

Note: Do NOT commit .env.local (it should be in .gitignore).

---

### Task 1.2: Install React Three Fiber + ts-morph dependencies

**Files:**
- Modify: `apps/web/package.json`

**Step 1: Install 3D dependencies**

```bash
cd /Users/omkarbhad/Projects/codecity/apps/web
pnpm add three @react-three/fiber @react-three/drei @react-three/postprocessing @types/three
```

**Step 2: Install analysis dependencies**

```bash
pnpm add ts-morph
```

**Step 3: Verify build**

```bash
cd /Users/omkarbhad/Projects/codecity && pnpm build
```

Expected: Build succeeds.

**Step 4: Commit**

```bash
git add apps/web/package.json pnpm-lock.yaml
git commit -m "feat: add React Three Fiber, drei, postprocessing, and ts-morph"
```

---

### Task 1.3: Set up shadcn v2 Mira with original palette override

**Files:**
- Modify: `apps/web/components.json`
- Modify: `packages/ui/src/styles/globals.css`
- Modify: `apps/web/src/app/layout.tsx`

**Step 1: Update components.json to Mira style**

Update `apps/web/components.json`:
```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "mira",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "",
    "css": "../../packages/ui/src/styles/globals.css",
    "baseColor": "zinc",
    "cssVariables": true
  },
  "iconLibrary": "lucide",
  "aliases": {
    "components": "@/components",
    "hooks": "@/hooks",
    "lib": "@/lib",
    "utils": "@codecity/ui/lib/utils",
    "ui": "@codecity/ui/components"
  }
}
```

**Step 2: Rewrite globals.css with shadcn v2 + original palette**

Replace `packages/ui/src/styles/globals.css` with the original's color palette (#07070c dark, #ff4040 neon red, vibrant district colors), Sora + IBM Plex Mono fonts, glassmorphic utilities, glow effects, and animations. The full file should include:

- `@import "tailwindcss"` (Tailwind v4)
- `@theme` block with all shadcn v2 required CSS variables mapped to original palette
- District color CSS custom properties
- Glassmorphism utility classes
- Glow effects (.glow-red, .glow-red-strong, .text-glow-red)
- Animations (fade-up, fade-in, glow-pulse, grid-scroll, breathing)
- Status badges (.status-completed, .status-processing, .status-pending, .status-failed)
- Grid backgrounds (.bg-grid, .bg-grid-fine)
- Noise overlay
- Custom scrollbar

Key color mappings:
```
--color-background: #07070c
--color-foreground: #e4e4ec
--color-primary: #ff4040
--color-primary-foreground: #ffffff
--color-card: #0d0d14
--color-card-foreground: #e4e4ec
--color-muted: #12121a
--color-muted-foreground: #5a5a6e
--color-border: #1a1a2e
--color-input: #1a1a2e
--color-ring: #ff4040
--color-accent: #1a1a2e
--color-accent-foreground: #e4e4ec
--color-destructive: #ff4040
--color-destructive-foreground: #ffffff
```

**Step 3: Update layout.tsx — switch fonts to Sora + IBM Plex Mono**

```tsx
<link
  href="https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&family=IBM+Plex+Mono:wght@400;500;600;700&display=swap"
  rel="stylesheet"
/>
```

**Step 4: Install shadcn v2 components**

```bash
cd /Users/omkarbhad/Projects/codecity/apps/web
pnpm dlx shadcn@latest add button card dialog input tabs badge dropdown-menu table toggle tooltip progress separator sheet select
```

Note: If shadcn CLI struggles with the monorepo, install components into `packages/ui/src/components/ui/` manually.

**Step 5: Verify build**

```bash
cd /Users/omkarbhad/Projects/codecity && pnpm build
```

**Step 6: Commit**

```bash
git add -A
git commit -m "feat: set up shadcn v2 Mira with original neon-red palette"
```

---

## Slice 2: Homepage Redesign

### Task 2.1: Create sample city data for homepage live demo

**Files:**
- Create: `apps/web/src/lib/sample-city-data.ts`

**Step 1: Create sample data**

Create a TypeScript file exporting a hardcoded `CitySnapshot` (~30 files) that represents a small sample project. This will power the homepage's live 3D demo. Include 4-5 districts with varied building heights/widths, some dependency connections, a few high-complexity files, and React components.

**Step 2: Commit**

```bash
git add apps/web/src/lib/sample-city-data.ts
git commit -m "feat: add sample city data for homepage 3D demo"
```

---

### Task 2.2: Build the lightweight 3D demo scene component

**Files:**
- Create: `apps/web/src/components/city/demo-scene.tsx`
- Create: `apps/web/src/components/city/demo-building.tsx`
- Create: `apps/web/src/components/city/demo-ground.tsx`

**Step 1: Create DemoScene — a simplified R3F Canvas**

The demo scene is a non-interactive, auto-rotating city visualization:
- `<Canvas>` with ACES tone mapping
- Auto-rotating camera (slow orbit)
- 3-point lighting (ambient #303050, sun #ffeedd, fill #4d94ff)
- Dark ground plane with grid
- Fog for depth
- Buildings from sample data (simple BoxGeometry, district colored)
- NO interactions (no click/hover/select) — this is just eye candy
- Bloom post-processing for glow

Use `@react-three/drei` for OrbitControls (autoRotate, no user input), and `@react-three/postprocessing` for Bloom.

**Step 2: Verify it renders**

```bash
cd /Users/omkarbhad/Projects/codecity && pnpm dev
```

Check http://localhost:3000 — should see rotating city.

**Step 3: Commit**

```bash
git add apps/web/src/components/city/demo-scene.tsx apps/web/src/components/city/demo-building.tsx apps/web/src/components/city/demo-ground.tsx
git commit -m "feat: add R3F demo scene with auto-rotating city"
```

---

### Task 2.3: Redesign homepage with shadcn v2

**Files:**
- Modify: `apps/web/src/app/page.tsx`
- Modify: `apps/web/src/components/layout/navbar.tsx`
- Modify: `apps/web/src/components/home/hero-section.tsx`
- Modify: `apps/web/src/components/home/repo-input.tsx`
- Modify: `apps/web/src/components/home/feature-cards.tsx`
- Modify: `apps/web/src/components/home/footer.tsx`

**Step 1: Redesign navbar**

Glassmorphic sticky navbar with:
- CC city icon (SVG) + "CodeCity" in Sora font
- [Explore] link + [Dashboard / Sign In] button using shadcn Button
- `backdrop-blur-xl bg-card/60 border-b border-border/50`

**Step 2: Redesign hero section**

- "CODEBASE VISUALIZATION ENGINE" in IBM Plex Mono, small, tracking-wider, text-primary/40
- "See Your Code" in Sora, text-5xl sm:text-7xl, font-extrabold, text-foreground
- "as a City" in Sora, same size, text-primary text-glow-red
- Embed `<DemoScene />` in a 16:9 rounded container with glow-red border
- Staggered fade-up animations

**Step 3: Redesign repo input**

- shadcn Input with neon red focus ring (glow-red)
- shadcn Button "Analyze →" with bg-primary
- Quick-pick chips: [Excalidraw] [Next.js] [Zustand] [tRPC] [create-t3-app]
- Client component with form action to POST /api/analyze

**Step 4: Redesign feature cards**

Three shadcn Cards with glassmorphic styling:
- "3D Visualization" / "SPATIAL" — cyan icon
- "Dependency Mapping" / "GRAPH" — green icon
- "Code Intelligence" / "METRICS" — yellow icon

**Step 5: Redesign footer**

Minimal, IBM Plex Mono, dim text.

**Step 6: Verify build + visual check**

```bash
cd /Users/omkarbhad/Projects/codecity && pnpm build
```

**Step 7: Commit**

```bash
git add apps/web/src/app/page.tsx apps/web/src/components/layout/navbar.tsx apps/web/src/components/home/
git commit -m "feat: redesign homepage with shadcn v2 Mira + live 3D demo"
```

---

## Slice 3: Analysis Pipeline

### Task 3.1: Create TypeScript types for city data

**Files:**
- Create: `apps/web/src/lib/types/city.ts`

**Step 1: Define types**

```typescript
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
```

**Step 2: Commit**

```bash
git add apps/web/src/lib/types/city.ts
git commit -m "feat: add TypeScript types for city snapshot data"
```

---

### Task 3.2: Build GitHub API client

**Files:**
- Create: `apps/web/src/lib/analysis/github.ts`

**Step 1: Implement GitHub tree fetcher**

Functions:
- `parseGitHubUrl(url: string): { owner: string; repo: string }` — validate and extract
- `fetchRepoTree(owner: string, repo: string): Promise<GitHubFile[]>` — GET /repos/{owner}/{repo}/git/trees/HEAD?recursive=1, filter .ts/.tsx, skip node_modules/dist/.next/test
- `fetchFileContent(owner: string, repo: string, path: string): Promise<string>` — GET raw.githubusercontent.com content
- `fetchFileBatch(owner: string, repo: string, paths: string[], onProgress: callback): Promise<Map<string, string>>` — concurrent fetch with limit of 10

Use native `fetch` (no extra deps). Handle rate limits with retry + backoff.

**Step 2: Commit**

```bash
git add apps/web/src/lib/analysis/github.ts
git commit -m "feat: add GitHub API client for repo tree and file fetching"
```

---

### Task 3.3: Build TypeScript AST parser

**Files:**
- Create: `apps/web/src/lib/analysis/parser.ts`

**Step 1: Implement TS parser using ts-morph**

Functions:
- `parseTypeScriptFile(path: string, content: string): ParsedFile` — uses ts-morph Project to create in-memory source file and extract:
  - Functions (name, exported, line count, detect unused by checking references)
  - Types/interfaces/enums (name, kind)
  - Classes (name)
  - Imports (resolved relative paths)
  - Complexity (count if/for/while/switch/ternary/catch/&&/|| branches)
  - isReactComponent (check for JSX or React.FC/Component)
  - hasUnusedExports (check exported declarations not referenced in other analyzed files)
- `parseAllFiles(files: Map<string, string>, onProgress: callback): ParsedFile[]` — parse all files, then resolve importedBy (reverse dependency map)

**Step 2: Commit**

```bash
git add apps/web/src/lib/analysis/parser.ts
git commit -m "feat: add TypeScript AST parser with ts-morph"
```

---

### Task 3.4: Build city layout algorithm

**Files:**
- Create: `apps/web/src/lib/analysis/layout.ts`

**Step 1: Implement layout algorithm**

Functions:
- `computeDistricts(files: ParsedFile[]): DistrictData[]` — group files by top-level folder, assign colors from DISTRICT_COLORS palette
- `computeBuildingDimensions(file: ParsedFile): { height, width, depth }` — height = clamp(lines/50, 0.4, 18), width = clamp(1.2 + functions.length * 0.15, 1.2, 2.8)
- `layoutCity(files: ParsedFile[], districts: DistrictData[]): FileData[]` — position buildings in district grid layout, compute bounds per district, add spacing between districts
- `computeStats(files: FileData[]): CityStats` — aggregate totals

The layout algorithm should:
1. Group files into districts
2. Sort districts by file count (largest first)
3. Arrange districts in a grid
4. Within each district, arrange buildings in a sub-grid
5. Add padding between buildings (1.5 units) and between districts (4 units)

**Step 2: Commit**

```bash
git add apps/web/src/lib/analysis/layout.ts
git commit -m "feat: add city layout algorithm for district and building positioning"
```

---

### Task 3.5: Build analysis pipeline orchestrator

**Files:**
- Create: `apps/web/src/lib/analysis/pipeline.ts`

**Step 1: Implement pipeline orchestrator**

```typescript
export async function analyzeRepository(
  repoUrl: string,
  onProgress: (stage: string, progress: number, message: string) => void
): Promise<CitySnapshot> {
  // 1. Parse URL
  const { owner, repo } = parseGitHubUrl(repoUrl)
  onProgress("fetching-tree", 0, "Fetching repository tree...")

  // 2. Fetch tree
  const tree = await fetchRepoTree(owner, repo)
  onProgress("downloading-files", 0.1, `Found ${tree.length} TypeScript files`)

  // 3. Download files
  const files = await fetchFileBatch(owner, repo, tree.map(f => f.path), (p) =>
    onProgress("downloading-files", 0.1 + p * 0.4, `Downloading files...`)
  )

  // 4. Parse
  onProgress("parsing", 0.5, "Parsing TypeScript...")
  const parsed = await parseAllFiles(files, (p) =>
    onProgress("parsing", 0.5 + p * 0.3, `Parsing files...`)
  )

  // 5. Layout
  onProgress("computing-layout", 0.8, "Computing city layout...")
  const districts = computeDistricts(parsed)
  const laidOut = layoutCity(parsed, districts)
  const stats = computeStats(laidOut)

  onProgress("complete", 1, "Done!")
  return { files: laidOut, districts, stats }
}
```

**Step 2: Commit**

```bash
git add apps/web/src/lib/analysis/pipeline.ts
git commit -m "feat: add analysis pipeline orchestrator"
```

---

### Task 3.6: Create API routes for analysis

**Files:**
- Create: `apps/web/src/app/api/analyze/route.ts`
- Create: `apps/web/src/app/api/analyze/[id]/progress/route.ts`
- Create: `apps/web/src/app/api/projects/[id]/snapshot/route.ts`

**Step 1: POST /api/analyze — start analysis**

- Authenticate user via `auth()`
- Validate repoUrl
- Create Project in DB (status: PENDING)
- Run `analyzeRepository()` (async, update Project status + store Snapshot)
- Return `{ projectId: string }`

For now, run analysis synchronously in the API route. If it becomes too slow, we can move to a background job later.

**Step 2: GET /api/analyze/[id]/progress — SSE progress stream**

- Server-Sent Events endpoint
- Poll project status from DB
- Stream progress events until COMPLETED or FAILED

**Step 3: GET /api/projects/[id]/snapshot — return snapshot data**

- Auth check (owner or public project)
- Fetch latest Snapshot for project
- Return JSON

**Step 4: Verify build**

```bash
cd /Users/omkarbhad/Projects/codecity && pnpm build
```

**Step 5: Commit**

```bash
git add apps/web/src/app/api/analyze/ apps/web/src/app/api/projects/
git commit -m "feat: add API routes for analysis pipeline and snapshots"
```

---

## Slice 4: 3D City Visualization Page

### Task 4.1: Build core R3F scene components

**Files:**
- Create: `apps/web/src/components/city/city-scene.tsx`
- Create: `apps/web/src/components/city/building.tsx`
- Create: `apps/web/src/components/city/district-ground.tsx`
- Create: `apps/web/src/components/city/lighting.tsx`
- Create: `apps/web/src/components/city/ground.tsx`
- Create: `apps/web/src/components/city/camera-controller.tsx`

**Step 1: Create CityScene — main R3F Canvas wrapper**

```tsx
"use client"
export function CityScene({ snapshot }: { snapshot: CitySnapshot }) {
  return (
    <Canvas
      gl={{ antialias: true, toneMapping: ACESFilmicToneMapping, toneMappingExposure: 1.1 }}
      shadows
      camera={{ position: [40, 40, 40], fov: 50 }}
    >
      <Lighting />
      <Ground />
      {snapshot.districts.map(d => <DistrictGround key={d.name} district={d} />)}
      {snapshot.files.map(f => <Building key={f.path} file={f} />)}
      <CameraController />
      <EffectComposer>
        <Bloom luminanceThreshold={0.8} intensity={0.5} />
      </EffectComposer>
      <fog attach="fog" args={["#07070c", 30, 150]} />
    </Canvas>
  )
}
```

**Step 2: Create Building — per-file 3D mesh**

Each building renders:
- Base box (height from lines, width from functions, district color)
- Edge lines (wireframe outline)
- Floor lines per function (horizontal planes)
- Complexity antenna if complexity > 20 (red cylinder + sphere)
- React dome if isReactComponent (blue hemisphere)
- Type ring if types.length >= 3 (yellow torus)
- Unused outline if hasUnusedExports (pulsing red wireframe)
- Large file platform if lines > 200 (wider base)

Hover: scale to 1.06x. Select: scale to 1.1x + breathing animation.

**Step 3: Create Lighting, Ground, DistrictGround, CameraController**

- Lighting: 3-point (ambient #303050 0.7, sun #ffeedd 0.7 with shadows, fill #4d94ff 0.2)
- Ground: 300x300 dark plane (#0d0d14) + grid helper
- DistrictGround: semi-transparent colored plane per district + border outline
- CameraController: OrbitControls + flyTo animation on selection + keyboard R to reset

**Step 4: Commit**

```bash
git add apps/web/src/components/city/
git commit -m "feat: add core R3F scene - buildings, lighting, camera, districts"
```

---

### Task 4.2: Build dependency pipes and flow particles

**Files:**
- Create: `apps/web/src/components/city/dependency-pipes.tsx`
- Create: `apps/web/src/components/city/flow-particle.tsx`

**Step 1: Create DependencyPipes**

When a building is selected:
- Draw CatmullRomCurve3 pipes from selected building to each import (red)
- Draw CatmullRomCurve3 pipes from each importer to selected building (blue)
- Two layers per pipe: solid tube (0.03 radius) + glow tube (0.08 radius, transparent)
- FlowParticle: small white sphere animating along curve with sine-wave opacity

**Step 2: Commit**

```bash
git add apps/web/src/components/city/dependency-pipes.tsx apps/web/src/components/city/flow-particle.tsx
git commit -m "feat: add dependency pipes with flow particles"
```

---

### Task 4.3: Build visualization mode system

**Files:**
- Create: `apps/web/src/components/city/use-city-store.ts`
- Create: `apps/web/src/components/city/mode-toolbar.tsx`

**Step 1: Create Zustand-like store (use React context or simple useState)**

State:
- `selectedFile: string | null`
- `hoveredFile: string | null`
- `visualizationMode: "dependencies" | "complexity" | "unused" | "filesize" | "types"`
- `searchQuery: string`
- Actions: selectFile, hoverFile, setMode, setSearch

**Step 2: Create ModeToolbar**

Row of shadcn Toggle buttons: Dependencies, Complexity, File Size, Unused, Types.
Switching mode changes building material colors:
- dependencies: district colors
- complexity: green→red heatmap based on complexity score
- unused: red for unused, green for used
- filesize: orange heatmap based on line count
- types: yellow for files with types, dim gray for others

**Step 3: Commit**

```bash
git add apps/web/src/components/city/use-city-store.ts apps/web/src/components/city/mode-toolbar.tsx
git commit -m "feat: add visualization modes (dependency, complexity, size, unused, types)"
```

---

### Task 4.4: Build UI panels (file tree, details, minimap, stats, search)

**Files:**
- Create: `apps/web/src/components/city/file-tree.tsx`
- Create: `apps/web/src/components/city/file-details.tsx`
- Create: `apps/web/src/components/city/minimap.tsx`
- Create: `apps/web/src/components/city/stats-bar.tsx`
- Create: `apps/web/src/components/city/search-bar.tsx`
- Create: `apps/web/src/components/city/district-legend.tsx`

**Step 1: File tree (left panel)**

Hierarchical folder structure. Files color-dotted with district color. Click navigates to building + selects. Auto-expands parent folders on 3D selection.

**Step 2: File details (right panel, slides in on selection)**

shadcn Card with:
- File path (mono, dim)
- Stats grid (shadcn Badge): Lines, Functions, Complexity (color-coded), Types, Imports, Imported By
- Flags: React Component, Potentially Unused, N Classes
- Expandable sections: Functions list, Types list, Imports (clickable → navigate), Imported By (clickable)

**Step 3: Minimap (left panel, canvas 2D)**

160px tall canvas rendering top-down view:
- Colored rectangles per district
- Camera frustum indicator
- Click to teleport camera

**Step 4: Stats bar (bottom)**

Glassmorphic bar with: Files | Functions | Imports | Unused | Lines | Types. IBM Plex Mono numbers.

**Step 5: Search bar (top bar)**

shadcn Input that filters buildings by path/function/type name. Non-matching buildings become invisible.

**Step 6: District legend (left panel)**

List of districts with colored dots, file counts, clickable to fly camera to district center.

**Step 7: Commit**

```bash
git add apps/web/src/components/city/
git commit -m "feat: add UI panels - file tree, details, minimap, stats, search, legend"
```

---

### Task 4.5: Create project visualization page

**Files:**
- Create: `apps/web/src/app/project/[id]/page.tsx`
- Create: `apps/web/src/app/project/[id]/layout.tsx`

**Step 1: Create layout**

Full-viewport layout with no scrolling, no navbar (only top bar within the visualization).

**Step 2: Create page**

Server component that:
- Fetches project + snapshot from DB
- Checks auth (owner or public)
- Passes snapshot to client `<CityVisualization />` wrapper
- The wrapper assembles all panels:

```
┌──────────────────────────────────────────────────┐
│ TopBar: [← Back] repo/name  [modes]  [search]   │
├──────┬───────────────────────────┬───────────────┤
│ Left │       CityScene          │    Right       │
│ Panel│     (R3F Canvas)          │    Panel       │
│      │                           │   (details)    │
│ mini │                           │               │
│ map  │                           │               │
│ dirs │                           │               │
│ tree │                           │               │
├──────┴───────────────────────────┴───────────────┤
│ StatsBar: Files | Funcs | Lines | Types          │
└──────────────────────────────────────────────────┘
```

**Step 3: Add route to middleware**

Update middleware to allow `/project/[id]` for both authenticated and public access (public projects viewable by anyone, private requires auth).

**Step 4: Verify build**

```bash
cd /Users/omkarbhad/Projects/codecity && pnpm build
```

**Step 5: Commit**

```bash
git add apps/web/src/app/project/ apps/web/src/middleware.ts
git commit -m "feat: add project visualization page with full R3F city"
```

---

## Slice 5: Dashboard & Admin Redesign

### Task 5.1: Redesign login page with shadcn v2

**Files:**
- Modify: `apps/web/src/app/login/page.tsx`

**Step 1: Redesign with shadcn Card**

- Centered shadcn Card with glassmorphic background
- CC icon + "CodeCity" heading
- Two shadcn Buttons: "Sign in with Google" (Google SVG icon), "Sign in with GitHub" (GitHub icon)
- Neon red glow border on card (glow-red)
- "SECURE · OAUTH 2.0" monospace footer
- Radial glow behind card
- fade-up animation

**Step 2: Commit**

```bash
git add apps/web/src/app/login/page.tsx
git commit -m "feat: redesign login page with shadcn v2 Card + neon red glow"
```

---

### Task 5.2: Redesign dashboard with shadcn v2

**Files:**
- Modify: `apps/web/src/app/dashboard/page.tsx`
- Modify: `apps/web/src/app/dashboard/layout.tsx`
- Modify: `apps/web/src/components/dashboard/my-projects-tab.tsx`
- Modify: `apps/web/src/components/dashboard/explore-tab.tsx`
- Modify: `apps/web/src/components/dashboard/new-analysis-dialog.tsx`

**Step 1: Redesign dashboard page with shadcn Tabs**

- shadcn Tabs: "My Projects" / "Explore" with neon red active underline
- "CONTROL PANEL" monospace label + "Dashboard" heading

**Step 2: Redesign my-projects-tab**

Card grid using shadcn Card. Each card:
- City silhouette placeholder (CSS bars like the original)
- Repo name (bold), owner (dim)
- Status badge using shadcn Badge (with status-* classes)
- File count, function count stats
- "Analyze" date
- Click navigates to `/project/[id]`

**Step 3: Redesign explore-tab**

Same card layout. shadcn Input for search. Public gallery sorted by recent.

**Step 4: Redesign new-analysis dialog**

shadcn Dialog with:
- Repo URL input (shadcn Input)
- Visibility radio (Public/Private)
- "Analyze" button (shadcn Button, bg-primary)

The dialog should POST to /api/analyze and redirect to /project/[id] on success, or show progress inline.

**Step 5: Verify build**

```bash
cd /Users/omkarbhad/Projects/codecity && pnpm build
```

**Step 6: Commit**

```bash
git add apps/web/src/app/dashboard/ apps/web/src/components/dashboard/
git commit -m "feat: redesign dashboard with shadcn v2 Tabs, Cards, Dialog"
```

---

### Task 5.3: Redesign admin console with shadcn v2

**Files:**
- Modify: `apps/web/src/app/admin/layout.tsx`
- Modify: `apps/web/src/app/admin/page.tsx`
- Modify: `apps/web/src/app/admin/users/page.tsx`
- Modify: `apps/web/src/app/admin/moderation/page.tsx`
- Modify: `apps/web/src/app/admin/settings/page.tsx`
- Modify: `apps/web/src/components/admin/admin-sidebar.tsx`

**Step 1: Redesign admin sidebar**

3-letter tags (SYS/USR/MOD/CFG) with neon red active border. Glassmorphic background.

**Step 2: Redesign overview page**

- Stat cards using shadcn Card: USR/PRJ/PUB/ERR with neon red numbers
- Recent users list with avatars
- Recent projects list with status badges

**Step 3: Redesign users page**

shadcn Table with search. Role toggle using shadcn Badge. Delete with confirmation dialog.

**Step 4: Redesign moderation page**

Public project list with shadcn Table. Actions: make-private, delete.

**Step 5: Redesign settings page**

Feature flag toggles using shadcn Toggle/Switch. Limits as shadcn Input. Maintenance mode.

**Step 6: Verify build**

```bash
cd /Users/omkarbhad/Projects/codecity && pnpm build
```

**Step 7: Commit**

```bash
git add apps/web/src/app/admin/ apps/web/src/components/admin/
git commit -m "feat: redesign admin console with shadcn v2 Table, Card, Toggle"
```

---

## Slice 6: Integration & Polish

### Task 6.1: Wire homepage repo input to analysis pipeline

**Files:**
- Modify: `apps/web/src/components/home/repo-input.tsx`
- Create: `apps/web/src/app/analyze/[id]/page.tsx` (progress page)

**Step 1: Connect repo input form**

On submit:
1. POST /api/analyze with repoUrl
2. Redirect to `/analyze/[projectId]` progress page

**Step 2: Create analysis progress page**

- Subscribe to SSE at /api/analyze/[id]/progress
- Show shadcn Progress bar with stage labels
- On completion, redirect to `/project/[id]`
- On failure, show error with retry button

**Step 3: Commit**

```bash
git add apps/web/src/components/home/repo-input.tsx apps/web/src/app/analyze/
git commit -m "feat: wire homepage to analysis pipeline with progress page"
```

---

### Task 6.2: Add hover tooltips and keyboard shortcuts to 3D scene

**Files:**
- Create: `apps/web/src/components/city/tooltip.tsx`
- Modify: `apps/web/src/components/city/city-scene.tsx`

**Step 1: Create floating tooltip**

HTML overlay (not 3D) that follows the cursor on hover:
- Filename with district color dot
- Line count, function count, type count, complexity
- Uses `@react-three/drei`'s `Html` component or pure CSS overlay

**Step 2: Add keyboard shortcuts**

- R: reset camera
- Escape: deselect file
- 1-5: switch visualization modes
- /: focus search bar

**Step 3: Commit**

```bash
git add apps/web/src/components/city/
git commit -m "feat: add tooltips, keyboard shortcuts to 3D visualization"
```

---

### Task 6.3: Final build verification and cleanup

**Files:**
- Modify various if needed

**Step 1: Full build**

```bash
cd /Users/omkarbhad/Projects/codecity && pnpm build
```

Expected: 0 errors, all pages compile.

**Step 2: Dev server visual check**

```bash
pnpm dev
```

Check:
- Homepage loads with live 3D demo ✓
- Login page styled correctly ✓
- Dashboard shows project cards ✓
- Admin console panels work ✓
- Auth works (no MissingSecret) ✓

**Step 3: Commit any fixes**

```bash
git add -A && git commit -m "fix: resolve build issues from integration"
```

---

## Summary

| Slice | Tasks | Key deliverable |
|-------|-------|----------------|
| 1. Foundation | 1.1–1.3 | Auth fixed, R3F + ts-morph installed, shadcn v2 + palette |
| 2. Homepage | 2.1–2.3 | Live 3D demo, redesigned homepage |
| 3. Pipeline | 3.1–3.6 | GitHub fetch → TS parse → city layout → API routes |
| 4. 3D Viz | 4.1–4.5 | Full R3F scene with all features + project page |
| 5. Dashboard | 5.1–5.3 | Login + dashboard + admin redesigned with shadcn v2 |
| 6. Polish | 6.1–6.3 | Wiring, tooltips, keyboard shortcuts, final verification |

**Total: 19 tasks across 6 slices.**
