<div align="center">

<img src="https://raw.githubusercontent.com/omkarbhad/codecity/main/apps/web/public/logo.png" width="64" height="64" alt="CodeCity Logo" />

# CodeCity

**Your codebase, reimagined as a city.**

[![License: MIT](https://img.shields.io/badge/License-MIT-red.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15-black.svg)](https://nextjs.org/)
[![Turborepo](https://img.shields.io/badge/Turborepo-monorepo-orange.svg)](https://turbo.build/)

[**Live Demo**](https://codecity.magnova.ai) · [Report Bug](https://github.com/omkarbhad/codecity/issues) · [Request Feature](https://github.com/omkarbhad/codecity/issues)

</div>

---

## What is CodeCity?

CodeCity transforms any public GitHub repository into an **interactive 3D cityscape**. Files become buildings, directories become districts, and import relationships become glowing pipes connecting structures.

> See your architecture. Navigate your dependencies. Spot complexity at a glance.

![CodeCity Preview](https://raw.githubusercontent.com/omkarbhad/codecity/main/apps/web/public/demo.png)

---

## Features

- **3D Visualization** — WebGL-rendered cityscape with orbit controls, click-to-inspect buildings, and real-time camera navigation
- **Dependency Mapping** — Import relationships rendered as animated glowing pipes between buildings
- **Code Intelligence** — File complexity mapped to building height, language distribution shown as colored districts
- **Commit Timeline** — Browse repository commit history with paginated lazy-loading and file-change highlighting
- **Language Support** — TypeScript, JavaScript, Python, and more — auto-detected from repository contents
- **Fast Analysis** — Paste a GitHub URL, get a city in under 60 seconds via background job processing
- **Public Explore** — Browse 3D visualizations of popular open-source repositories
- **Auth** — Firebase Authentication (GitHub + Google OAuth)
- **Admin Panel** — User management, content moderation, and platform settings

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 15, React 19, TypeScript 5.7 |
| **3D Engine** | Three.js, React Three Fiber, @react-three/drei, postprocessing |
| **Styling** | Tailwind CSS v4, Sora + IBM Plex Mono fonts |
| **Animations** | Framer Motion |
| **UI Components** | shadcn/ui (custom `@codecity/ui` package) |
| **State** | Zustand (client), React Query (server) |
| **Database** | Neon Postgres (`@neondatabase/serverless`) |
| **Cache** | Upstash Redis (`@upstash/redis`) — analysis progress tracking |
| **Auth** | Firebase Authentication (GitHub + Google providers) |
| **Background Jobs** | Inngest (durable step functions) |
| **Analysis Engine** | `@codecity/core` — AST parsing via ts-morph, dependency graph extraction |
| **Monorepo** | Turborepo + pnpm workspaces |
| **Deployment** | Vercel |

---

## Architecture

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
│   │   │   └── lib/          # DB, auth, analysis engine, Redis, Firebase
│   │   └── public/           # Static assets (logo, demo, 3D textures)
│   └── mcp-server/           # MCP server for AI agent integrations
├── packages/
│   ├── core/                 # Analysis engine (AST parsing, dependency graphs)
│   └── ui/                   # Shared component library + design tokens
├── turbo.json                # Turborepo task config
├── vercel.json               # Vercel deployment config
└── pnpm-workspace.yaml       # Workspace definition
```

### How Analysis Works

1. User pastes a GitHub repository URL
2. Inngest background job fetches the repo tree via GitHub API
3. `@codecity/core` parses files using ts-morph for AST analysis
4. Dependency graph, file metrics, and directory structure are extracted
5. Results are persisted in Neon Postgres; progress is tracked via Upstash Redis
6. The 3D scene renders files as buildings (height = complexity, color = language)

---

## Getting Started

### Prerequisites

- **Node.js** 20+
- **pnpm** 9+
- A **Neon Postgres** database ([neon.tech](https://neon.tech))
- An **Upstash Redis** instance ([upstash.com](https://upstash.com))
- A **Firebase** project for auth ([firebase.google.com](https://firebase.google.com))

### Installation

```bash
# Clone the repo
git clone https://github.com/omkarbhad/codecity.git
cd codecity

# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env.local
```

Fill in your `.env.local` — see [Environment Variables](#environment-variables) below.

### Development

```bash
pnpm dev          # Starts all apps via Turborepo (web on :3000)
```

Open [http://localhost:3000](http://localhost:3000).

### Build

```bash
pnpm build        # Build all packages and apps
pnpm type-check   # Run TypeScript type checking across the monorepo
```

---

## Environment Variables

Copy `.env.example` to `.env.local` and fill in:

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | Neon Postgres connection string |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Yes | Firebase API key |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Yes | Firebase auth domain |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Yes | Firebase project ID |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Yes | Firebase storage bucket |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Yes | Firebase messaging sender ID |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Yes | Firebase app ID |
| `KV_REST_API_URL` | Yes | Upstash Redis REST URL |
| `KV_REST_API_TOKEN` | Yes | Upstash Redis REST token |
| `GITHUB_TOKEN` | No | GitHub PAT for higher API rate limits |
| `ADMIN_EMAIL` | No | Email for admin panel access |
| `SKIP_AUTH` | No | Set to `"true"` to bypass auth in local dev |

---

## Design System

CodeCity uses a custom design system built on Tailwind CSS v4:

- **Background:** `#06060b` (deep dark)
- **Primary accent:** `#ff3d3d` (electric red)
- **Fonts:** Sora (sans-serif) + IBM Plex Mono (monospace)
- **District palette:** Cyan, Green, Blue, Yellow, Purple, Orange, Teal
- **UI style:** Glassmorphic panels with backdrop blur over the 3D scene

---

## Roadmap

- [ ] Private repo support (authenticated GitHub token)
- [ ] Real-time collaboration (multiple users in same city)
- [ ] Export city as image or video
- [ ] VS Code extension
- [ ] Additional language parsers (Rust, Go, Java)
- [ ] City comparison (diff two branches or repos)
- [ ] Embeddable widget for README badges

---

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

---

## License

MIT &copy; [Omkar Bhad](https://github.com/omkarbhad)

---

<div align="center">
  <sub>Built by <a href="https://github.com/omkarbhad">Omkar</a> &middot; Powered by WebGL &middot; Open Source</sub>
</div>
