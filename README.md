# CodeCity

CodeCity is a local-first Tauri desktop app that turns a local folder or GitHub repository into a 3D city. Files become buildings, directories become districts, and imports become connection paths that make architecture visible at a glance.

The app is intentionally a single project. The UI stays in TypeScript/React because it drives the 3D experience, while repository analysis, parsing, storage, GitHub imports, and offline folder support live in Rust under `src-tauri`.

## Features

- Analyze GitHub repositories or local folders.
- Queue analyses and refresh completed cities.
- Store parsed city data locally in SQLite.
- Browse GitHub repositories, trending repositories, and recent cities.
- View code structure as a 3D city with file details, filters, commits, and dependency paths.
- Package native desktop builds for Windows, macOS, and Linux.
- Supports Tauri updater artifacts through GitHub Releases.

## Downloads

Stable builds are published on the GitHub Releases page.

| Platform | Release asset |
|---|---|
| Windows | NSIS setup `.exe` and WiX `.msi` installers |
| macOS Apple Silicon | `.dmg` and `.app.tar.gz` for `aarch64` |
| macOS Intel | `.dmg` and `.app.tar.gz` for `x86_64` |
| Linux | `.AppImage`, `.deb`, and `.rpm` packages |

The app updater reads `latest.json` from:

```text
https://github.com/omkarbhad/codecity/releases/latest/download/latest.json
```

## Stack

| Layer | Technology |
|---|---|
| Desktop shell | Tauri 2 |
| Backend | Rust, tree-sitter, SQLite |
| Frontend | Next.js 16, React 19, TypeScript |
| 3D scene | Three.js, React Three Fiber |
| Styling | Tailwind CSS v4 |
| Package manager | pnpm 9 |

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
├── public/                 # Static assets
├── scripts/                # Desktop/server helper scripts
└── package.json
```

## Development

Install dependencies:

```bash
pnpm install
```

Run the web UI:

```bash
pnpm dev
```

Run the desktop app:

```bash
pnpm desktop
```

Check the project:

```bash
pnpm type-check
cd src-tauri && cargo check
```

Build locally:

```bash
pnpm build
pnpm bundle:desktop
```

## Release

Releases are built by `.github/workflows/release.yml` with `tauri-apps/tauri-action`. The workflow builds:

- macOS Apple Silicon: `aarch64-apple-darwin`
- macOS Intel: `x86_64-apple-darwin`
- Windows: `windows-latest`, producing NSIS `.exe` and WiX `.msi` installers.
- Linux: `ubuntu-22.04`, producing `.AppImage`, `.deb`, and `.rpm` packages.

Before the first release, configure these repository secrets:

| Secret | Required | Purpose |
|---|---:|---|
| `TAURI_SIGNING_PRIVATE_KEY` | Yes | Signs updater artifacts and `latest.json`. |
| `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | If your key has one | Password for the updater signing key. |

Create a release by bumping versions in:

- `package.json`
- `src-tauri/Cargo.toml`
- `src-tauri/tauri.conf.json`

Then tag and push:

```bash
git tag v0.1.0
git push origin main --tags
```

You can also run the workflow manually from GitHub Actions. The workflow creates a GitHub Release named `CodeCity v__VERSION__`, uploads platform installers, and publishes updater metadata.

## Notes

- GitHub archive download is the fastest import path. Git clone is used as a fallback.
- Clone fallback uses shallow, single-branch, no-tag clones to reduce transfer size.
- Local folder analysis works offline after the app is installed.
- If a local folder was moved or deleted, refresh/reanalysis will report that directly.
