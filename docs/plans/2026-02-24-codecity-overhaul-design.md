# CodeCity Overhaul Design

Date: 2026-02-24
Approach: Hybrid Overhaul (keep R3F/Next.js, fix everything else)

## Goals

1. Wire up the real analysis pipeline (no more mock data)
2. Add Python full AST + all source file support (CSS, JSON, Go, Rust, etc.)
3. Road-style ground-level dependency connections
4. Rebuild UI with Shadcn V2 Mira to match the reference HTML file
5. Fix performance (instanced meshes, caching, store optimization)
6. Auth bypass for development

## 1. Data Flow — Real Pipeline + Auth Bypass

### Auth Bypass
- Add `SKIP_AUTH=true` env var
- In `middleware.ts`, when set, skip all auth redirects and inject a mock session
- Users go straight to `/dashboard` without login

### Wire API Routes
- **POST `/api/analyze`** — Call `analyzeRepository()` for real. Store results in DB (`Project.analysisData` JSON field). Return real `projectId`.
- **GET `/api/analyze/[id]/progress`** SSE — Use a server-side progress map (`Map<projectId, ProgressState>`) updated by the pipeline's `onProgress` callback. SSE reads from this map.
- **GET `/api/projects/[id]/snapshot`** — Read `analysisData` from the DB Project row. Fall back to in-memory cache if available.

### In-Memory LRU Cache
- `Map<repoUrl, { data: CitySnapshot, expiry: number }>` in `lib/cache.ts`
- TTL: 30 minutes
- Checked before running the analysis pipeline
- Also cache DB queries for project lists (60 second TTL)

## 2. Multi-Language Parser Architecture

### Extended File Filter (`github.ts`)
Replace `isTypeScriptFile()` with `isSupportedFile()`:
- `.ts`, `.tsx`, `.js`, `.jsx` — TypeScript/JavaScript
- `.py` — Python
- `.css`, `.scss`, `.less` — Stylesheets
- `.html` — HTML
- `.json`, `.yaml`, `.yml` — Config
- `.md` — Markdown
- `.go`, `.rs`, `.java`, `.rb`, `.php`, `.swift`, `.kt` — Other languages
- Still skip `node_modules`, `dist`, `.next`, `__tests__`, etc.

### Python Parser (`python-parser.ts`)
Full regex-based AST analysis:
- Functions: `def func_name(...)` with decorator detection
- Classes: `class ClassName(Base):` with method extraction
- Imports: `import x`, `from x import y` (relative and absolute)
- Complexity: `if/elif/else/for/while/try/except/and/or/with` counting
- Type hints: `-> ReturnType` and `: Type` detection
- Decorators: `@decorator` detection
- Scope tracking via indentation levels for accurate line counts

### Generic Parser (`generic-parser.ts`)
For CSS, JSON, HTML, Markdown, Go, Rust, Java, etc.:
- CSS/SCSS: selectors, `@import`, `@media`, variables (`--custom-prop`, `$sass-var`). Complexity = nesting depth.
- JSON/YAML: top-level keys, `dependencies`/`devDependencies` for package files.
- HTML: `<script>` and `<link>` as imports, element count.
- Go/Rust/Java/etc.: Lightweight regex for functions, imports, packages.
- All files get basic stats: line count, size, file type classification.

### Extended Types
```typescript
// Added to ParsedFile / FileData
fileType: "typescript" | "javascript" | "python" | "css" | "config" | "markup" | "other"
externalImports: string[]
decorators: string[]
```

### Parser Dispatch
Route to correct parser by extension in `parseAllFiles()`. TypeScript uses ts-morph, Python uses python-parser, everything else uses generic-parser.

### Import Resolution
Extend `resolveImportPath()` for:
- Python relative imports: `from . import x`, `from ..module import y`
- CSS imports: `@import "./file.css"`
- JS/TS imports: existing logic unchanged

## 3. Road-Style Dependency Connections

### Ground-Level Routing
Change pipes from overhead arcs to ground-hugging roads at `y = 0.4`:
- Start: `(src.x, 0.4, src.z)`
- Mid: `(src.x, 0.4, tgt.z)` — L-shaped right-angle routing
- End: `(tgt.x, 0.4, tgt.z)`
- CatmullRom tension `0.05` for smooth cornering

### Visual Treatment
- Solid core: radius `0.07` (thicker, visible as roads)
- Glow shell: radius `0.175` (2.5x core), opacity `0.1`
- Red outgoing (`#ff4040`), blue incoming (`#4d94ff`)
- Core opacity `0.65`

### Flow Particles
- 2-3 particles per pipe at `t = 0.15, 0.5, 0.85`
- Full traverse: ~8 seconds
- Pulsing opacity `0.4 - 0.9`

### Performance Guard
- Max 20 pipes when a building has many dependencies
- Dispose all tube geometries on deselection

## 4. UI Overhaul — Shadcn V2 Mira

### Style Alignment
Fix `packages/ui/components.json` to use Mira style consistently with the web app.

### Home Page
- Hero: Shadcn `Card` for demo scene, `Button` for CTAs
- Repo input: Shadcn `Input` + `Button` group, matching HTML's `.input-group`
- Quick picks: Shadcn `Badge` variant="outline" as clickable chips
- Feature cards: Shadcn `Card` with neon-red accent

### Dashboard
- Project cards: Shadcn `Card` + `Badge` + `DropdownMenu`
- New analysis: Shadcn `Dialog` + `Input` + `Select` + `Button`
- Tabs: Shadcn `Tabs`
- Search: Shadcn `Input` with icon

### Visualization Page Layout (matching HTML file)
```
┌──────────────────────────────────────────────────────┐
│ Logo  RepoBadge     [ModeToolbar]      [SearchInput] │
├────────┬─────────────────────────────────┬───────────┤
│Minimap │                                 │           │
│Legend   │      3D Canvas (R3F)           │ FileDetail│
│Controls │                                │  Panel    │
│         │                                │  (340px)  │
│FileTree │                                │           │
│(200px)  │                                │           │
├─────────┴─────────────────────────────────┴──────────┤
│    Files | Functions | Imports | Unused | Lines | Types│
└──────────────────────────────────────────────────────┘
```

- Top bar: gradient fade, pointer-events passthrough
- Mode toolbar: Shadcn `Toggle` group, active = accent red
- Search: Shadcn `Input`, monospace, expands on focus (200px → 260px)
- Left panel: fixed 200px, glassmorphism
- Side panel: fixed 340px right, glassmorphism, slide-in
- Bottom bar: centered pill with stats, glassmorphism
- Tooltip: fixed position, follows mouse, monospace

### Side Panel (File Detail)
- Stat grid: 2-column (Lines, Functions, Complexity, Types, Imports, Imported By)
- Flags: React Component, Potentially Unused, Classes
- Functions list: monospace, exported badge, unused marking
- Types list: kind badge (type/interface/enum)
- Dependencies: clickable tags (blue=imports, red=importedBy, purple=external)
- Click tag → fly camera to that building

### Panels
- File tree: collapsible folders, colored dots, active highlight
- Legend: district dots + name + count, click to fly to district
- Controls: keyboard shortcuts display (LMB/RMB/Scroll/R)
- Progress page: Shadcn `Progress` bar, accent red

### Global Styling
- Fonts: Sora (sans) + IBM Plex Mono (mono)
- Background: `#07070c`
- All panels: glassmorphism (`backdrop-filter: blur`)
- Scrollbars: thin dark custom
- Transitions: 150-200ms on interactive elements

## 5. Performance Fixes

### Instanced Meshes
Replace per-file `<mesh>` with `THREE.InstancedMesh`:
- Single `BoxGeometry`, per-instance color via `instanceColor`, per-instance transform via `instanceMatrix`
- Reduces draw calls from N to 1

### Throttle Minimap
Redraw every 10th frame or on camera move only, not every frame.

### React Query (Client)
- `@tanstack/react-query` for project lists, snapshots, admin data
- `staleTime: 5 min` for dashboard navigation
- Prefetch on hover

### Store Optimization
Split city context store into separate contexts:
- `selectedFile`, `hoveredFile`, `searchQuery`, `visualizationMode`
- Changing hover doesn't re-render search bar

### Search Wiring
Set `building.visible = false` on non-matching meshes (like HTML file), not React re-renders.

### Geometry Disposal
Central `disposeScene()` function for unmount. Ensure all memoized geometries have cleanup effects.

## Not Doing (YAGNI)

- No Redis (in-memory cache sufficient for single-instance)
- No Zustand/Redux migration (split existing context)
- No LOD system (instanced meshes solve draw-call problem)
- No WebWorker for parsing (ts-morph runs server-side)
- No database migration/seeding (use existing JSON column)
