# Contributing to CodeCity

Thanks for helping with CodeCity.

## Setup

```bash
pnpm install
pnpm dev
pnpm desktop
```

## Checks

```bash
pnpm type-check
pnpm build
cd src-tauri && cargo check
```

## Project Shape

CodeCity is a single Tauri desktop app:

| Path | Description |
|---|---|
| `src` | Next.js UI, 3D city, dashboard, and Tauri bridge |
| `src/ui` | Local shadcn-style UI primitives and global CSS |
| `src-tauri` | Rust backend for parsing, analysis, storage, and packaging |
| `public` | Static assets and 3D models |

Keep heavy analysis in Rust. Use TypeScript for UI and thin command wrappers.

## Pull Requests

- Keep changes focused.
- Include screenshots for UI changes.
- Run the checks above before opening a PR.
- Use Conventional Commits when possible, for example `feat: add local folder analysis`.
