<div align="center">

<img src="https://raw.githubusercontent.com/omkarbhad/codecity/main/apps/web/public/cc-logo.png" width="64" height="64" alt="CodeCity Logo" />

# CodeCity

**Your codebase, reimagined as a city.**

[![License: MIT](https://img.shields.io/badge/License-MIT-red.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15-black.svg)](https://nextjs.org/)
[![Built with Turbopack](https://img.shields.io/badge/Turbopack-enabled-orange.svg)](https://turbo.build/)

[**Live Demo →**](https://codecity.magnova.ai) &nbsp;·&nbsp; [Report Bug](https://github.com/omkarbhad/codecity/issues) &nbsp;·&nbsp; [Request Feature](https://github.com/omkarbhad/codecity/issues)

</div>

---

## What is CodeCity?

CodeCity transforms any public GitHub repository into an **interactive 3D cityscape**. Every file becomes a building, every directory becomes a district, and import relationships become glowing pipes between structures.

> **See your architecture. Navigate your dependencies. Spot complexity at a glance.**

![CodeCity Hero](https://raw.githubusercontent.com/omkarbhad/codecity/main/apps/web/public/hero-preview.png)

---

## Features

- 🏙️ **3D Visualization** — WebGL-rendered cityscape with orbit controls, click-to-inspect, and real-time navigation
- 🔗 **Dependency Mapping** — Import relationships rendered as animated glowing pipes between buildings
- 📊 **Code Intelligence** — Complexity hotspots, unused exports, and architectural patterns shown spatially
- 🌐 **Language Support** — TypeScript, JavaScript, Python and more — auto-detected
- ⚡ **Fast Analysis** — Paste a GitHub URL → city in under 60 seconds
- 🔒 **Auth** — GitHub / Google OAuth with NextAuth v5
- 🌍 **Public Explore** — Browse 3D visualizations of popular open-source repos

---

## Tech Stack

| Layer | Tech |
|---|---|
| **Frontend** | Next.js 15, React 19, TypeScript |
| **3D Engine** | Three.js, React Three Fiber, @react-three/drei |
| **Styling** | Tailwind CSS v4, Sora + IBM Plex Mono |
| **Animations** | Framer Motion |
| **UI Components** | shadcn/ui (custom `@codecity/ui` package) |
| **Database** | PostgreSQL + Prisma ORM |
| **Auth** | NextAuth v5 (GitHub + Google) |
| **Monorepo** | Turborepo + pnpm workspaces |

---

## Project Structure

```
codecity/
├── apps/
│   ├── web/              # Next.js app (main frontend)
│   └── mcp-server/       # MCP server for AI integrations
└── packages/
    ├── core/             # Analysis engine (AST parsing, dep graphs)
    ├── db/               # Prisma schema + client
    └── ui/               # Shared component library + design tokens
```

---

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 9+
- PostgreSQL database

### Installation

```bash
# Clone the repo
git clone https://github.com/omkarbhad/codecity.git
cd codecity

# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env.local
# Fill in DATABASE_URL, AUTH_SECRET, AUTH_GITHUB_ID, AUTH_GITHUB_SECRET
```

### Database Setup

```bash
pnpm db:push      # Push schema to database
pnpm db:generate  # Generate Prisma client
```

### Development

```bash
pnpm dev          # Start all apps (web on :3000)
```

Open [http://localhost:3000](http://localhost:3000).

### Build

```bash
pnpm build        # Build all packages
```

---

## Environment Variables

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/codecity"

# Auth (NextAuth v5)
AUTH_SECRET="your-secret-here"
AUTH_GITHUB_ID="your-github-oauth-app-id"
AUTH_GITHUB_SECRET="your-github-oauth-app-secret"

# Optional: Google OAuth
AUTH_GOOGLE_ID=""
AUTH_GOOGLE_SECRET=""

# Admin
ADMIN_EMAIL="your@email.com"
```

---

## Design System

CodeCity has a fully custom design system built on Tailwind CSS v4.

- **Background:** `#06060b` (deep dark)
- **Primary:** `#ff3d3d` (electric red)
- **Fonts:** Sora (sans) + IBM Plex Mono (mono)
- **District palette:** Cyan, Green, Blue, Yellow, Purple, Orange, Teal

View the design system at `/designsystem` when running locally.

---

## Roadmap

- [ ] Private repo support (GitHub token auth)
- [ ] Real-time collaboration (multiple users in same city)
- [ ] Export city as image/video
- [ ] VS Code extension
- [ ] More language parsers (Rust, Go, Java)
- [ ] City comparison (diff two repos)

---

## Contributing

PRs welcome. Please open an issue first to discuss what you'd like to change.

```bash
# Fork + clone
git checkout -b feature/your-feature
pnpm dev
# Make changes, ensure type-check passes
pnpm type-check
git commit -m "feat: your feature"
git push origin feature/your-feature
# Open a PR
```

---

## License

MIT © [Omkar Bhad](https://github.com/omkarbhad)

---

<div align="center">
  <sub>Built by <a href="https://github.com/omkarbhad">Omkar</a> · Powered by WebGL · Open Source</sub>
</div>
