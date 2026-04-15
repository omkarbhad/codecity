<div align="center">

<img src="https://raw.githubusercontent.com/omkarbhad/codecity/main/apps/web/public/logo.png" width="96" height="96" alt="CodeCity Logo" />

<h1>CodeCity</h1>

<b>Your codebase, reimagined as a 3D city you can fly through.</b>

<p>
  <a href="https://codecity.magnova.ai"><b>Live Demo</b></a> ·
  <a href="#-features">Features</a> ·
  <a href="#-quick-start">Quick Start</a> ·
  <a href="#-architecture">Architecture</a> ·
  <a href="#-roadmap">Roadmap</a> ·
  <a href="https://github.com/omkarbhad/codecity/issues">Report Bug</a>
</p>

<p>
  <img src="https://img.shields.io/badge/Next.js-15-000?logo=nextdotjs&logoColor=white" alt="Next.js 15" />
  <img src="https://img.shields.io/badge/React-19-61dafb?logo=react&logoColor=white" alt="React 19" />
  <img src="https://img.shields.io/badge/TypeScript-5.7-3178c6?logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Three.js-WebGL-000?logo=threedotjs&logoColor=white" alt="Three.js" />
  <img src="https://img.shields.io/badge/Turborepo-monorepo-ef4444?logo=turborepo&logoColor=white" alt="Turborepo" />
  <img src="https://img.shields.io/badge/Neon-Postgres-00e59a?logo=postgresql&logoColor=white" alt="Neon Postgres" />
  <img src="https://img.shields.io/badge/Inngest-jobs-8b5cf6" alt="Inngest" />
  <img src="https://img.shields.io/badge/license-MIT-green" alt="License" />
</p>

<img src="https://raw.githubusercontent.com/omkarbhad/codecity/main/apps/web/public/demo.png" alt="CodeCity preview" width="820" />

</div>

---

## ✨ Why CodeCity?

Reading a new codebase from a file tree is like trying to understand a city from a spreadsheet of addresses. **CodeCity turns your repo into an actual city you can fly through** — files become buildings, directories become districts, imports become glowing pipes between structures.

- **Paste a URL, get a city.** No install, no CLI, no desktop app. Works in the browser on any public GitHub repo.
- **Spatial intuition beats text search.** Complexity, module boundaries, and coupling become *visible* the moment the scene loads — no grep required.
- **AST-grade accuracy.** The dependency graph comes from real `ts-morph` AST parsing, not regex over import strings.
- **Built for big repos.** Analyses run as durable background jobs on Inngest with Redis-tracked progress, so a 50k-file monorepo doesn't time out the request.

> Unlike static code-viz tools like CodeCharta or the original academic *CodeCity*, **CodeCity is a zero-install web app** with real-time WebGL rendering, click-to-inspect buildings, and a background-job pipeline built for repos that would crash a desktop tool.

---

## 📑 Table of Contents

<details>
<summary>Click to expand</summary>

- [✨ Why CodeCity?](#-why-codecity)
- [🏙 Purpose-Built for Codebase Exploration (vs Alternatives)](#-purpose-built-for-codebase-exploration-vs-alternatives)
- [🔭 Features](#-features)
- [🧰 Tech Stack](#-tech-stack)
- [🏗 Architecture](#-architecture)
- [🚀 Quick Start](#-quick-start)
- [🔑 Environment Variables](#-environment-variables)
- [🎨 Design System](#-design-system)
- [🗺 Roadmap](#-roadmap)
- [🤝 Contributing](#-contributing)
- [📜 License](#-license)
- [🙏 Acknowledgments](#-acknowledgments)

</details>

---

## 🏙 Purpose-Built for Codebase Exploration (vs Alternatives)

There are plenty of ways to visualize a codebase. None of them do the job CodeCity does, because each was built for a different question:

| Tool | What it answers | Where it runs | CodeCity's difference |
|---|---|---|---|
| **Sourcegraph** | "Where is this symbol used?" | Self-hosted or cloud | Text-first; no spatial model of the repo |
| **GitHub dependency graph** | "Which *packages* do we depend on?" | github.com | Package-level, not file-level imports |
| **Gource** | "How has this repo evolved over time?" | Desktop binary | Historical animation, no structural snapshot |
| **CodeCharta / CodeCity (2007 paper)** | "What does my codebase look like as a city?" | Eclipse plugin / desktop | ✅ Same metaphor — but desktop-only, static renders, no click-to-inspect, no background jobs |
| **Repo file tree on GitHub** | "What files exist?" | github.com | Flat, no relationships, no complexity signal |
| **CodeCity (this project)** | "What is the *shape* of this codebase and how are its parts connected?" | Browser (zero install) | AST-parsed dependency pipes, WebGL orbit, durable background analysis |

### Why a generic "code visualizer" would miss the point

A generic graph-rendering library (D3 force graph, Cytoscape) could draw a node-edge diagram of your repo. It would not answer the question CodeCity was built for: **"give me spatial intuition for a codebase I've never seen."** That requires:

1. **A stable metaphor** — buildings have height, districts have color, pipes have direction. The brain already knows how to read a city, so it reads your code as fast as it reads a skyline.
2. **Structural ground truth, not heuristics** — height comes from real file metrics, not guessed complexity; pipes come from AST-parsed imports, not regex over `from '...'` lines. [`@codecity/core`](packages/core) uses `ts-morph` so the graph is semantically correct.
3. **A background pipeline** — big repos take time. Inngest step functions keep progress durable across retries; Upstash Redis streams status to the UI so the user never stares at a spinner wondering if it died.
4. **Zero-install distribution** — the whole point of a code city is *"I'm about to touch this repo, show me what it looks like."* That moment is killed by `brew install` or Eclipse. Paste-a-URL is the only shape that fits.

> **Honest trade-offs.** Use Sourcegraph if you want symbol-level code search. Use Gource if you want to watch a repo grow over time. Use GitHub's tree if you just want to browse files. **Use CodeCity when you're joining a new codebase and need to feel its shape in 60 seconds.**

---

## 🔭 Features

### 🏗 3D Visualization
- **WebGL cityscape** — Three.js + React Three Fiber + `@react-three/drei` + postprocessing
- **Orbit controls** — click, drag, scroll to navigate; click any building to inspect the file
- **Semantic heights** — building height mapped to file complexity, not just LOC
- **District colors** — one color per language, auto-detected from repo contents

### 🔗 Dependency Mapping
- **AST-parsed import graph** via `ts-morph` in [`@codecity/core`](packages/core)
- **Animated glowing pipes** connect buildings that import from each other
- **Directional flow** — pipe direction shows "who imports whom"

### 📊 Code Intelligence
- **Complexity per file** drives building geometry
- **Language distribution** visualized as colored districts
- **Monorepo-aware** — subprojects become neighborhoods

### ⏱ Commit Timeline
- **Paginated lazy-loading** of commit history
- **File-change highlighting** — buildings pulse on recently-touched files

### ⚡ Fast Analysis Pipeline
- **Paste-a-URL UX** — no CLI, no install, no auth for public repos
- **Inngest background jobs** — durable step functions survive retries and long analyses
- **Upstash Redis progress** — real-time status pushed to the UI
- Target: city rendered **in under 60 seconds** for typical repos

### 🔎 Public Explore
- Browse prebuilt 3D visualizations of popular open-source repos
- Great onboarding — users see what the tool can do before pasting their own URL

### 🔐 Platform
- **Firebase Auth** — GitHub + Google OAuth
- **Admin panel** — user management, content moderation, platform settings
- **MCP server** — AI agents can drive the analyzer programmatically

---

## 🧰 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 15 (App Router) · React 19 · TypeScript 5.7 |
| **3D Engine** | Three.js · React Three Fiber · `@react-three/drei` · postprocessing |
| **Styling** | Tailwind CSS v4 · Sora · IBM Plex Mono |
| **Animation** | Framer Motion |
| **UI Components** | shadcn/ui via `@codecity/ui` workspace package |
| **State** | Zustand (client) · React Query (server) |
| **Database** | Neon Postgres (`@neondatabase/serverless`) |
| **Cache** | Upstash Redis (`@upstash/redis`) — analysis progress |
| **Auth** | Firebase Authentication (GitHub + Google) |
| **Background Jobs** | Inngest — durable step functions |
| **Analysis Engine** | `@codecity/core` — AST parsing via `ts-morph` |
| **Monorepo** | Turborepo + pnpm workspaces |
| **AI Integration** | MCP server (`apps/mcp-server`) |
| **Deployment** | Vercel |

---

## 🏗 Architecture

```
codecity/
├── apps/
│   ├── web/                  # Next.js 15 app (frontend + API routes)
│   │   ├── src/
│   │   │   ├── app/          # App Router pages & API routes
│   │   │   ├── components/
│   │   │   │   ├── city/     # 3D visualization (scene, panels, tooltip, store)
│   │   │   │   ├── dashboard/# Project list, explore tab, sidebar
│   │   │   │   ├── home/     # Landing page sections
│   │   │   │   └── ui/       # Shared UI primitives
│   │   │   └── lib/          # DB, auth, analysis, Redis, Firebase
│   │   └── public/           # Static assets (logo, demo, 3D textures)
│   └── mcp-server/           # MCP server for AI agent integrations
├── packages/
│   ├── core/                 # Analysis engine (AST parsing, dep graphs)
│   └── ui/                   # Shared component library + design tokens
├── turbo.json                # Turborepo task config
├── vercel.json               # Vercel deployment config
└── pnpm-workspace.yaml       # Workspace definition
```

### How an analysis runs

```
 User pastes a GitHub URL
          │
          ▼
 ┌─────────────────────┐
 │  Next.js API route  │ ──▶ enqueue Inngest job
 └─────────────────────┘
          │
          ▼
 ┌─────────────────────┐     ┌──────────────────┐
 │   Inngest step fn   │ ◀──▶│  Upstash Redis   │  progress pings
 │  1. fetch repo tree │     └──────────────────┘
 │  2. @codecity/core  │
 │     • ts-morph AST  │
 │     • dep graph     │
 │     • file metrics  │
 │  3. persist results │ ──▶ Neon Postgres
 └─────────────────────┘
          │
          ▼
 ┌─────────────────────┐
 │  WebGL scene (R3F)  │  buildings = files, pipes = imports
 │  click-to-inspect   │
 └─────────────────────┘
```

**Key design decisions**

- 🧱 **Analysis is a separate package** (`@codecity/core`) so you can reuse the engine without the frontend.
- ⏳ **Background jobs, not request-scoped parsing** — big repos would blow through a request timeout. Inngest steps survive retries, Redis streams progress to the UI.
- 🗺 **AST over regex** — `ts-morph` gives semantically correct imports. Regex would choke on re-exports, barrel files, and dynamic `import()`.
- 🎨 **Design tokens in `@codecity/ui`** — shared across the web app and any future surfaces.

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** 20+ and **pnpm** 9+
- [**Neon Postgres**](https://neon.tech) database
- [**Upstash Redis**](https://upstash.com) instance
- [**Firebase**](https://firebase.google.com) project with GitHub + Google providers enabled

### Install

```bash
git clone https://github.com/omkarbhad/codecity.git
cd codecity
pnpm install
cp .env.example .env.local
# fill in .env.local — see "Environment Variables" below
```

### Run

```bash
pnpm dev          # Turborepo dev — web app on http://localhost:3000
pnpm build        # Build all packages and apps
pnpm type-check   # Typecheck the whole monorepo
```

### Local dev without auth

Set `SKIP_AUTH="true"` in `.env.local` to bypass Firebase during local development.

---

## 🔑 Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | Neon Postgres connection string |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | ✅ | Firebase API key |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | ✅ | Firebase auth domain |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | ✅ | Firebase project ID |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | ✅ | Firebase storage bucket |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | ✅ | Firebase messaging sender ID |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | ✅ | Firebase app ID |
| `KV_REST_API_URL` | ✅ | Upstash Redis REST URL |
| `KV_REST_API_TOKEN` | ✅ | Upstash Redis REST token |
| `GITHUB_TOKEN` | — | GitHub PAT for higher API rate limits |
| `ADMIN_EMAIL` | — | Email for admin panel access |
| `SKIP_AUTH` | — | Set to `"true"` to bypass auth in local dev |

---

## 🎨 Design System

CodeCity's visual language is tuned for *spatial legibility over a dark scene*:

| Token | Value |
|---|---|
| **Background** | `#06060b` — deep space dark |
| **Primary accent** | `#ff3d3d` — electric red |
| **Sans font** | Sora |
| **Mono font** | IBM Plex Mono |
| **District palette** | Cyan · Green · Blue · Yellow · Purple · Orange · Teal |
| **UI style** | Glassmorphic panels with backdrop blur over the 3D scene |

All tokens live in `@codecity/ui` and are consumed via Tailwind v4.

---

## 🗺 Roadmap

- [x] Public repo analysis
- [x] WebGL cityscape with click-to-inspect
- [x] AST-parsed dependency pipes
- [x] Inngest background pipeline
- [x] Commit timeline
- [x] MCP server for AI agents
- [ ] Private repo support (authenticated GitHub token)
- [ ] Real-time collaboration — multiple users in the same city
- [ ] Export city as image or video
- [ ] VS Code extension
- [ ] More parsers — Rust, Go, Java
- [ ] City diff — compare two branches or repos
- [ ] Embeddable README widget

Got an idea? [Open an issue](https://github.com/omkarbhad/codecity/issues) or start a discussion.

---

## 🤝 Contributing

Contributions are what make open source amazing. **Any contribution you make is greatly appreciated.**

1. Fork the project
2. Create your feature branch — `git checkout -b feature/amazing-feature`
3. Commit your changes — `git commit -m 'Add amazing feature'`
4. Push to the branch — `git push origin feature/amazing-feature`
5. Open a Pull Request

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines.
👉 New here? Look for [`good first issue`](https://github.com/omkarbhad/codecity/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22) labels.

---

## 📜 License

[MIT](LICENSE) © [Omkar Bhad](https://github.com/omkarbhad)

---

## 🙏 Acknowledgments

- **Richard Wettel & Michele Lanza** — for the original *CodeCity* concept paper (2007) that inspired this web-native reimagining
- [Three.js](https://threejs.org) & [React Three Fiber](https://r3f.docs.pmnd.rs) — WebGL rendering
- [`ts-morph`](https://ts-morph.com) — AST analysis that makes the dependency graph honest
- [Inngest](https://www.inngest.com) — durable background jobs
- [Neon](https://neon.tech) · [Upstash](https://upstash.com) · [Vercel](https://vercel.com) — infrastructure
- [shadcn/ui](https://ui.shadcn.com) — component primitives

---

<div align="center">
  <b>Live:</b> <a href="https://codecity.magnova.ai">codecity.magnova.ai</a> · Built with ❤️ by <a href="https://github.com/omkarbhad">Omkar Bhad</a>
</div>
