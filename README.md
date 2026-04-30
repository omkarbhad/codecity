# CodeCity

CodeCity is a Tauri desktop app that turns a local folder or GitHub repository into a 3D city. Files become buildings, directories become districts, and imports become connection paths that make architecture visible at a glance.

The app is now intentionally a single project. The UI stays in TypeScript/React because it drives the 3D experience, while repository analysis, parsing, storage, and offline folder support live in Rust under `src-tauri`.

## Stack

| Layer | Technology |
|---|---|
| Desktop shell | Tauri 2 |
| Backend | Rust, tree-sitter, SQLite |
| Frontend | Next.js 15, React 19, TypeScript |
| 3D scene | Three.js, React Three Fiber |
| Styling | Tailwind CSS v4 |

## Project Structure

```text
codecity/
├── src/                    # Next.js app, UI, city scene, client helpers
│   ├── app/                # App Router pages
│   ├── components/         # Product and city components
│   ├── lib/                # Frontend helpers and Tauri bridge
│   └── ui/                 # Local shadcn-style UI primitives
├── src-tauri/              # Rust backend and Tauri desktop package
│   └── src/analysis/       # Parser, layout, database, GitHub analysis
├── public/                 # Static assets and 3D models
├── scripts/                # Desktop/server helper scripts
└── package.json
```

## Development

```bash
pnpm install
pnpm dev            # Next.js dev server at http://localhost:3000
pnpm desktop        # Tauri desktop app
pnpm type-check     # TypeScript check
pnpm build          # Next.js build
pnpm build:desktop  # Tauri bundle
```

## Direction

- Keep this as one app, not a monorepo.
- Keep CPU-heavy analysis in Rust.
- Keep the TypeScript side focused on UI, visualization, and Tauri command calls.
- Support offline local folders first, with GitHub analysis as an additional input path.
