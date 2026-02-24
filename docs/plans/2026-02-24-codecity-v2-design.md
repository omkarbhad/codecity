# CodeCity V2 — Full Redesign

**Date:** 2026-02-24
**Status:** Approved

## Overview

Convert CodeCity from a single-file HTML/JS app into a production-grade TypeScript monorepo with 3D visualization, MCP server, AI agent chat, and comprehensive codebase analysis.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript 5.x |
| 3D | React Three Fiber + Drei + Postprocessing |
| State | Zustand (devtools + persist) |
| UI | shadcn/ui + Tailwind CSS 4 |
| Database | PostgreSQL + Prisma ORM |
| Auth | NextAuth.js (GitHub OAuth) |
| AI Chat | Vercel AI SDK (Claude, OpenAI, OpenRouter) |
| MCP | @modelcontextprotocol/sdk |
| Monorepo | Turborepo + pnpm workspaces |
| Testing | Vitest + Playwright |
| Parser | @typescript-eslint/parser (AST-based) |

## Architecture: Turborepo Monorepo

```
codecity/
├── apps/
│   ├── web/              # Next.js 15 frontend
│   └── mcp-server/       # Standalone MCP server
├── packages/
│   ├── core/             # Shared analysis engine
│   ├── db/               # Prisma schema + client
│   └── ui/               # Shared UI components
├── turbo.json
└── docker-compose.yml
```

### apps/web — Next.js Frontend

```
src/
├── app/
│   ├── (auth)/           # Login, register, settings
│   ├── (dashboard)/      # Project list, history
│   ├── city/[id]/        # Main 3D visualization
│   └── api/              # tRPC + REST
├── components/
│   ├── canvas/           # R3F 3D components
│   │   ├── Building.tsx
│   │   ├── District.tsx
│   │   ├── Road.tsx
│   │   ├── Connector.tsx
│   │   ├── CityScene.tsx
│   │   ├── Controls.tsx
│   │   └── Minimap3D.tsx
│   ├── panels/           # UI panels
│   │   ├── FileTree.tsx
│   │   ├── FileDetails.tsx
│   │   ├── SearchPanel.tsx
│   │   ├── AgentChat.tsx
│   │   └── CodeFlowMinimap.tsx
│   ├── ui/               # shadcn/ui
│   └── layout/           # Shell, sidebars, toolbars
├── stores/               # Zustand stores
│   ├── cityStore.ts
│   ├── repoStore.ts
│   ├── uiStore.ts
│   └── chatStore.ts
├── hooks/
└── lib/
```

### apps/mcp-server — MCP Server

Standalone Node.js MCP server, usable from Claude Code, Cursor, etc.

**Tools:**
- `analyze_repo` — Full repo analysis
- `search_code` — Regex/text search with context
- `get_file_details` — Deep single-file analysis
- `get_dependency_graph` — Adjacency list
- `get_complexity_report` — Hotspots by cyclomatic complexity
- `get_architecture_overview` — Layers, patterns, entry points
- `find_dead_code` — Unused exports, orphans
- `get_type_hierarchy` — Interface/type inheritance trees
- `suggest_refactoring` — Size, complexity, coupling analysis
- `get_git_history` — Change frequency, contributors

**Resources:**
- `codecity://project/{id}/summary`
- `codecity://project/{id}/file/{path}`
- `codecity://project/{id}/deps`
- `codecity://project/{id}/complexity`

**Transports:** stdio (CLI) + SSE (web app)

### packages/core — Analysis Engine

- AST-based TypeScript parser (replaces regex)
- Cyclomatic complexity calculator
- Dependency graph builder (directed graph)
- City layout engine (force-directed + grid hybrid)
- A* pathfinding for road/connector routing
- Pattern detection (MVC, layers, barrel exports)
- Dead code detection
- Git history analysis

### packages/db — Database

PostgreSQL with Prisma. Models: User, Project, ApiKey, Snapshot, ChatMsg, Annotation.

Auth via NextAuth.js with GitHub OAuth + email/password.

## 3D Visualization Design

### Building Depth Model (Full Directory Depth)

```
Repository
 └── District (top-level folder) — colored ground plane
      └── Neighborhood (sub-folder) — raised platform
           └── Block (sub-sub-folder) — smaller raised platform
                └── Building (file) — box with floors
                     └── Floor (function) — visible layer
                          └── Window (variable/type) — texture
```

Each nesting level raises the ground (Y-axis stacking), creating a terraced city.

### Camera & Controls

- Full 360-degree OrbitControls (all axes, no lock)
- Pinch-to-zoom, smooth damping
- Fly-to animations on selection
- First-person walkthrough mode
- Keyboard navigation (arrow keys between buildings)

### Road System & Connectors

- Grid-based road network between buildings
- Reserved lanes between districts/buildings
- A* pathfinding for dependency connectors
- Unique lane per connector (no overlap)
- Animated flow particles along paths
- Color: red=outgoing, blue=incoming, gold=circular

### Visualization Modes

1. Dependencies (color by district, import pipes)
2. Complexity (green→red gradient)
3. File Size (gradient by LOC)
4. Types (highlight type-heavy files)
5. Unused Code (highlight dead exports)
6. Git Heatmap (change frequency)
7. Coverage (if available)

### Minimap

- Orthographic top-down secondary Canvas
- Buildings as colored rectangles
- Active connectors as animated lines
- Click-to-navigate
- Viewport rectangle overlay
- Full code flow animation on file select

## Agent Chat

- Multi-provider: Claude, OpenAI, OpenRouter (user selects)
- Vercel AI SDK with useChat hook, streaming
- Context injection: selected file, visible buildings, current mode
- Tool calling: routes to MCP tools internally
- Quick prompts: "Explain this file", "Find callers", etc.
- History persisted per project
- Markdown + syntax highlighting
- Click-to-navigate file paths

## State Management (Zustand)

Four stores: cityStore (3D scene), repoStore (analysis data), uiStore (panels/theme), chatStore (agent).

Each store uses devtools middleware for debugging and persist middleware for key state.

## 20 Improvements

1. AST-based parser (replaces regex)
2. Instanced meshes (10,000+ files)
3. Web Workers for parsing
4. LOD (far=simple, near=detailed)
5. Force-directed district layout
6. A* pathfinding connectors
7. Full directory depth visualization
8. Full 360 camera + walkthrough
9. Fuzzy search (Fuse.js) + regex
10. Virtual scrolling file tree
11. Rich hover cards
12. Multiple themes (dark, light, cyberpunk, blueprint)
13. Streaming analysis (real-time construction)
14. Error boundaries + retry logic
15. Keyboard accessibility
16. Mobile/tablet responsive
17. Shareable URL state
18. Export (PNG, JSON, embed)
19. Redis/memory caching
20. Vitest + Playwright tests

## 10 New Features

1. Git Heatmap Mode
2. Dependency Impact Analysis (blast radius)
3. Code Smell Detection (god files, circular deps, etc.)
4. Time Travel (snapshot comparison)
5. Collaborative Mode (real-time multiplayer)
6. Annotations & Notes
7. Pattern Detection (MVC, microservices, etc.)
8. Custom Metrics Plugin system
9. Multi-Language Support (JS, Python, Rust, Go)
10. CI/CD Integration (GitHub Action)
