# CodeCity V2 — Homepage, Dashboard, Admin Console & Auth Design

**Date:** 2026-02-24
**Status:** Approved
**Approach:** Vertical slices (DB → API → UI per feature)

## Decisions Summary

| Decision | Choice |
|----------|--------|
| Homepage style | Hybrid: hero with 3D demo + repo URL input |
| Dashboard scope | Public gallery + personal projects |
| Admin features | User mgmt, monitoring, moderation, settings |
| Auth providers | Google OAuth + GitHub OAuth (both) |
| Scaffolding | Full monorepo from day one |
| Build approach | Vertical slices (each feature end-to-end) |

---

## 1. Monorepo Foundation

```
codecity/
├── apps/
│   ├── web/              # Next.js 15 (App Router)
│   └── mcp-server/       # Placeholder
├── packages/
│   ├── core/             # Analysis engine (placeholder)
│   ├── db/               # Prisma schema + client
│   └── ui/               # Shared UI components
├── turbo.json
├── pnpm-workspace.yaml
└── package.json
```

Tech: Next.js 15, TypeScript, Tailwind CSS 4, shadcn/ui, Zustand, React Three Fiber.

---

## 2. Auth (NextAuth v5)

### Providers
- Google OAuth
- GitHub OAuth
- Both displayed on login page

### Database
- Prisma adapter storing sessions, accounts, users in PostgreSQL
- User model: id, name, email, image, role (USER | ADMIN), createdAt
- Account model: linked OAuth accounts (user can have both Google + GitHub)

### Routing
- Login page: card with logo + two provider buttons
- Protected routes: Dashboard and Admin behind auth middleware
- Homepage: public
- Admin: role === ADMIN check
- First registered user auto-promoted to ADMIN (or seed via env var ADMIN_EMAIL)

---

## 3. Homepage (Hybrid Landing)

### Layout
```
┌─────────────────────────────────────────────┐
│  Nav: Logo  |  Explore  |  Login/Dashboard  │
├─────────────────────────────────────────────┤
│  "Visualize Your Codebase as a City"        │
│  Tagline + CTA buttons                      │
│  ┌─────────────────────────────────┐        │
│  │  Live 3D Demo (R3F, auto-rotate)│        │
│  │  Pre-computed layout, no live   │        │
│  │  analysis. Static scene JSON.   │        │
│  └─────────────────────────────────┘        │
├─────────────────────────────────────────────┤
│  "Try it now" — Repo URL input              │
│  + Quick-pick chips (zustand, tRPC, etc.)   │
├─────────────────────────────────────────────┤
│  Feature cards: 3D Viz | Analysis | AI Chat │
├─────────────────────────────────────────────┤
│  Footer                                     │
└─────────────────────────────────────────────┘
```

### Key decisions
- 3D demo: pre-computed layout JSON, R3F with auto-rotate, loads fast
- Repo URL input: redirects to login if not authenticated
- Quick-pick repos: zustand, tRPC, excalidraw, TypeScript, next.js, create-t3-app
- Responsive: 3D demo hidden on mobile, replaced with static image

---

## 4. Dashboard (Public Gallery + Personal)

### Route: /dashboard

Two tabs: **Explore** (public) and **My Projects** (personal).

### Explore tab
- Grid of project cards showing: thumbnail (pre-rendered PNG), repo name, file/LOC count, author
- Search bar + sort by Recent / Popular / Stars
- Pagination
- Click opens the 3D visualization

### My Projects tab
- Table/list of user's analyzed repos
- Columns: repo name, file count, last analyzed, actions menu
- "+ New Analysis" button opens modal with repo URL input
- Actions: Open, Delete, Toggle public/private, Share link

### Data models
- **Project:** id, name, repoUrl, ownerId, visibility (PUBLIC | PRIVATE), fileCount, lineCount, analysisData (JSON), thumbnailUrl, createdAt, updatedAt
- **Snapshot:** id, projectId, data (JSON), createdAt

---

## 5. Admin Console

### Route: /admin (role === ADMIN only)

Sidebar with 4 sections:

### 5a. User Management
- User table: name, email, role, joined date, project count
- Actions: view, promote to admin, demote, ban/unban, delete
- Search and filter

### 5b. System Monitoring
- Stats cards: total users, total projects, analyses today, storage used
- Active analyses: in-progress jobs with repo, user, progress, start time
- Queue status: pending/running/completed/failed counts
- Error log: recent errors with stack traces, filterable

### 5c. Content Moderation
- Public gallery management: feature/unfeature projects, remove items
- Bulk actions: select multiple, make private, delete

### 5d. Platform Settings
- Feature flags: toggle registration, public gallery, AI chat, OAuth providers
- Global limits: max files per analysis, max concurrent analyses per user
- OAuth display: show configured providers (secrets via env only)
- Maintenance mode: toggle site-wide banner

### Data models
- **User.role:** enum USER | ADMIN
- **Settings:** key (string, unique), value (JSON), updatedAt
- **AuditLog:** id, adminId, action, targetType, targetId, metadata (JSON), createdAt
