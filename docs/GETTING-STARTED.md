<!-- generated-by: gsd-doc-writer -->
# Getting Started

This guide walks you from a fresh checkout to a running 3D city, including the CLI and MCP server. For a high-level overview see [README.md](../README.md); for environment variables see [docs/CONFIGURATION.md](CONFIGURATION.md); for how the pieces fit together see [docs/ARCHITECTURE.md](ARCHITECTURE.md).

## Prerequisites

CodeCity is a Tauri 2 desktop app with a Cargo workspace and a Next.js frontend. You need all three toolchains installed.

| Tool | Required version | Why |
| --- | --- | --- |
| Node.js | `>=18` (Next.js 16 + React 19 baseline) | Frontend dev server and build | <!-- VERIFY: minimum Node.js version not pinned in the repo via .nvmrc or package.json engines -->
| pnpm | `9.15.0` (pinned via `packageManager` in `package.json`) | JS package manager |
| Rust (stable) | `cargo` with edition 2021 support | Builds `codecity-core`, `codecity-cli`, `codecity-mcp`, and the Tauri backend |
| Tauri 2 system deps | Platform-specific (see below) | Native webview, build toolchain |

Install Rust via [rustup](https://rustup.rs/) if you don't have it. Install pnpm with `npm install -g pnpm@9.15.0` or [corepack](https://nodejs.org/api/corepack.html) (`corepack enable && corepack prepare pnpm@9.15.0 --activate`).

### Tauri 2 platform requirements

Tauri ships native bundles, so the system dependencies differ per OS. Full reference: <https://v2.tauri.app/start/prerequisites/> <!-- VERIFY: Tauri 2 prerequisites URL -->

- **macOS** — Xcode Command Line Tools: `xcode-select --install`.
- **Linux** — WebKitGTK, GTK, libsoup, and build essentials. On Debian/Ubuntu:
  ```bash
  sudo apt update
  sudo apt install -y libwebkit2gtk-4.1-dev build-essential curl wget file \
    libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev
  ```
  <!-- VERIFY: exact Linux package list for Tauri 2 may vary by distro -->
- **Windows** — Microsoft C++ Build Tools (MSVC) and the WebView2 runtime (preinstalled on Windows 11). <!-- VERIFY: Windows toolchain requirements not declared in repo -->

### Optional: opengrep sidecar (security scan feature)

The desktop app's security-scan feature shells out to a bundled [opengrep](https://github.com/opengrep/opengrep) binary loaded as a Tauri sidecar (`externalBin: ["binaries/opengrep"]` in `src-tauri/tauri.conf.json`). The binaries aren't committed; only the macOS arm64 build is present locally. If you need security scans during dev on Apple Silicon, install opengrep and copy it into place:

```bash
curl -fsSL https://raw.githubusercontent.com/opengrep/opengrep/main/install.sh | sh
cp ~/.opengrep/cli/latest/opengrep \
   src-tauri/binaries/opengrep-aarch64-apple-darwin
chmod +x src-tauri/binaries/opengrep-aarch64-apple-darwin
```

See `src-tauri/binaries/README.md` for the full list of target triples (CI populates the rest during release packaging).

## Installation

```bash
git clone https://github.com/omkarbhad/codecity.git
cd codecity
pnpm install
```

`pnpm install` only fetches Node dependencies. The Rust workspace compiles on demand the first time you run `pnpm desktop`, `cargo build`, or `cargo run`. Expect a slow first build (tree-sitter pulls in ~45 language grammars).

### Environment variables (optional for local dev)

`.env.example` lists the variables the dashboard's hosted features look at (Neon Postgres, Firebase auth, GitHub token, Upstash Redis). For local desktop development none of them are required — the app reads from local SQLite. If you want to mirror the hosted setup, copy the template:

```bash
cp .env.example .env.local
```

Full reference: [docs/CONFIGURATION.md](CONFIGURATION.md).

## First run — desktop app

The primary entry point:

```bash
pnpm desktop
```

This runs `tauri dev`, which:

1. Starts the Next.js dev server (`pnpm dev`) on port 3000.
2. Compiles the Rust backend (`src-tauri/`) and links the `codecity` binary.
3. Opens a 1280×800 native window pointing at `http://localhost:3000/dashboard` (see `src-tauri/tauri.conf.json`).

First-run flow inside the app:

1. **Pick a repo.** On the dashboard, choose a local directory (file picker) or paste a Git URL.
2. **Watch analysis.** The Rust pipeline walks the corpus, parses every supported file with tree-sitter, resolves imports, runs Louvain community detection, identifies hubs and entry points, then computes the city layout. Progress streams back over the Tauri RPC bridge. Larger repos take longer — analysis is parallelized via `rayon` but bounded by file count and parse cost.
3. **Navigate the 3D city.** When the snapshot is ready, the Next.js frontend hands it to `@react-three/fiber`. Drag to orbit, scroll to zoom, click a building to inspect the file behind it. Districts correspond to detected communities; building height/footprint encode file-level metrics.

Subsequent runs reuse the cached snapshot from SQLite, so re-opening a project is near-instant.

## First run — web-only dev server

If you only want to iterate on the frontend (no native shell, no Rust rebuilds), skip Tauri:

```bash
pnpm dev
```

Then open <http://localhost:3000>. Tauri-only features (file picker, native dialog, shell sidecar, RPC to the Rust backend) won't work — the dashboard's Tauri client (`src/lib/tauri.ts`) will fail to invoke commands. Use this mode for UI work that doesn't touch the backend.

The companion marketing site lives at `homepage/`:

```bash
pnpm dev:homepage  # http://localhost:3001
```

## First run — CLI (`codecity-cli`)

The CLI is a thin wrapper over `codecity-core` and produces the same `CitySnapshot` the desktop app does.

```bash
# Build once
cargo build -p codecity-cli --release

# Analyze a repo (human-readable summary)
./target/release/codecity-cli analyze /path/to/your/repo

# Or run directly without building first
cargo run -p codecity-cli -- analyze /path/to/your/repo
```

Why `-p codecity-cli`: the desktop app's binary is also named `codecity`, so a bare `cargo run` would pick the Tauri binary. The CLI's binary is `codecity-cli` (see comment in `crates/codecity-cli/Cargo.toml`).

Common flags:

- `--json -o snapshot.json` — emit the full snapshot as JSON for the MCP server or `inspect`.
- `--timeout <secs>` — abort if analysis runs longer (default `60`, `0` disables).
- `--no-gitskip` — analyze files normally excluded by `.gitignore`.
- `--exclude '<glob>'` — drop extra paths (repeatable, gitignore-style).

Other subcommands:

```bash
# Network-only views
codecity-cli network /path/to/repo --communities
codecity-cli network /path/to/repo --entries
codecity-cli network /path/to/repo --hubs

# Inspect a saved snapshot
codecity-cli inspect snapshot.json --node src/lib/foo.ts
```

## First run — MCP server (`codecity-mcp`)

`codecity-mcp` exposes the same snapshot to LLM agents over MCP (JSON-RPC over stdio). Stdout is reserved for the protocol; logs go to stderr.

```bash
# Option A — analyze a repo on startup
cargo run -p codecity-mcp -- --repo /path/to/your/repo

# Option B — load a pre-baked snapshot generated by codecity-cli
cargo run -p codecity-mcp -- --snapshot snapshot.json --source-root /path/to/repo
```

`--snapshot` and `--repo` are mutually exclusive. `--source-root` is only valid with `--snapshot` and tells the server where to read raw file contents when the agent asks for source (useful when the snapshot was generated on another machine and you've checked the same commit out locally). `--no-gitskip` is only valid with `--repo`.

To wire it into an MCP-aware client (Claude Desktop, etc.), configure the client to run the binary with stdio transport. See [docs/CONFIGURATION.md](CONFIGURATION.md) for the full argument matrix.

## Common setup issues

- **`pnpm install` fails with `Unsupported engine`.** Your global pnpm version doesn't match `packageManager` (`pnpm@9.15.0`). Use corepack: `corepack enable && corepack prepare pnpm@9.15.0 --activate`.
- **`pnpm desktop` errors before opening the window.** First build of the Rust workspace can take several minutes (tree-sitter grammars + Tauri). Wait it out; subsequent runs are incremental. If it errors immediately, you're missing Tauri system deps — re-read the platform requirements above.
- **`pnpm desktop` shows a blank window.** The Next.js dev server didn't come up in time. Run `pnpm dev` in a separate terminal first to confirm port 3000 is free, then retry `pnpm desktop`.
- **`cargo run` opens the Tauri app instead of the CLI.** The desktop binary is also called `codecity` and is the workspace's `default-members`. Always pass `-p codecity-cli` or `-p codecity-mcp` to target a specific crate.
- **Security scan fails with "opengrep not found".** The sidecar binary isn't in `src-tauri/binaries/` for your platform. See the opengrep section above; non-macOS-arm64 hosts need to fetch the binary themselves (CI normally handles this for releases).
- **Linux build fails on `webkit2gtk`.** Tauri 2 needs `libwebkit2gtk-4.1-dev` (the `4.1` series, not `4.0`). Older distros may not have it packaged — check the Tauri prerequisites page linked above. <!-- VERIFY: webkit2gtk version requirement -->
- **MCP server output is garbled on the wire.** Something is writing to stdout. The `codecity-mcp` binary explicitly routes `env_logger` to stderr; if you're embedding `codecity-core` directly, make sure your logger is configured the same way.

## Next steps

- [README.md](../README.md) — project overview, supported languages, full CLI/MCP examples.
- [docs/ARCHITECTURE.md](ARCHITECTURE.md) — how `codecity-core`, the Tauri shell, the frontend, the CLI, and the MCP server fit together.
- [docs/CONFIGURATION.md](CONFIGURATION.md) — environment variables, CLI flags, MCP arguments.
- [CONTRIBUTING.md](../CONTRIBUTING.md) — checks to run before opening a PR.
