<!-- generated-by: gsd-doc-writer -->
# CodeCity

Visualize any codebase as an explorable 3D city — a Tauri 2 desktop app with a Rust analysis engine, a CLI, and an MCP server for LLM agents.

![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)
![Version](https://img.shields.io/badge/version-0.1.1-informational)

## What's in this repo

CodeCity is a Cargo workspace plus a Next.js frontend. It ships four artifacts that all sit on top of the same analysis core:

| Crate / package | Role |
| --- | --- |
| `crates/codecity-core` | Pure analysis engine — tree-sitter parsing, import resolution, network analysis, city layout. Zero I/O, zero app deps. |
| `crates/codecity-cli` (`codecity-cli`) | Command-line wrapper around the core. `analyze`, `network`, `inspect`. |
| `crates/codecity-mcp` (`codecity-mcp`) | MCP server exposing snapshot queries to LLM agents over stdio. |
| `src-tauri` (`codecity`) | Tauri 2 desktop app. Owns DB, HTTP, RPC; thin wrapper over `codecity-core`. |
| `src/` | Next.js 16 / React 19 frontend with `react-three-fiber` rendering the city. |

Supported languages (parsed by `codecity-core` via tree-sitter): TypeScript, JavaScript, Python, Rust, Go, Java, C, C++, C#, Ruby, PHP, Swift, Kotlin, Bash, Zig, Lua, Haskell, Dart, Elixir, Scala, R, Julia, Perl, Erlang, Dockerfile, Nix, GLSL, Make, OCaml, WGSL, Groovy, GraphQL, Emacs Lisp, HCL, Protobuf, CSS, HTML, JSON, YAML, Markdown, TOML.

## Prerequisites

- **Node.js** with `pnpm@9.15.0` (pinned via `packageManager` in `package.json`)
- **Rust** stable toolchain with `cargo` (workspace uses Rust 2021 edition)
- **Tauri 2** system dependencies — see <https://v2.tauri.app/start/prerequisites/> <!-- VERIFY: Tauri 2 prerequisites URL -->

## Installation

```bash
git clone https://github.com/MagnovaAI/codecity.git
cd codecity
pnpm install
```

## Quick start

Run the desktop app in dev mode (Tauri spawns `pnpm dev` on port 3000 and opens the native shell):

```bash
pnpm desktop
```

Web-only dev server (no Tauri shell, opens at <http://localhost:3000>):

```bash
pnpm dev
```

Build the CLI and analyze a project:

```bash
cargo build -p codecity-cli --release
./target/release/codecity-cli analyze /path/to/your/repo
```

Run the MCP server against a repo (speaks MCP over stdio):

```bash
cargo run -p codecity-mcp -- --repo /path/to/your/repo
```

## Usage examples

### CLI — generate a snapshot

```bash
codecity-cli analyze ./my-project --json -o snapshot.json
```

Common flags:

- `--json` / `-o <file>` — emit the full `CitySnapshot` as JSON instead of a human summary.
- `--timeout <secs>` — abort analysis if it takes longer (default `60`, `0` disables).
- `--no-gitskip` — analyze files normally hidden by `.gitignore`.
- `--exclude '<glob>'` — drop extra paths (repeatable, gitignore-style).

Inspect a saved snapshot:

```bash
codecity-cli inspect snapshot.json --node src/lib/foo.ts
```

Network-only views:

```bash
codecity-cli network ./my-project --communities
codecity-cli network ./my-project --entries
codecity-cli network ./my-project --hubs
```

### MCP server — feed a snapshot to an LLM agent

```bash
# Option A: analyze a repo on startup
codecity-mcp --repo /path/to/repo

# Option B: load a pre-baked snapshot
codecity-mcp --snapshot snapshot.json --source-root /path/to/repo
```

The server talks JSON-RPC over stdio (stdout is reserved for the wire; logs go to stderr).

### Desktop app

`pnpm desktop` launches a 1280×800 Tauri window pointing at the Next.js dashboard. Pick a local directory or paste a Git URL, then explore the resulting 3D city.

## Development

| Script | What it does |
| --- | --- |
| `pnpm dev` | Next.js dev server on port 3000 |
| `pnpm dev:fast` | Same, with a larger Node heap (`--max-old-space-size=4096`) |
| `pnpm desktop` | `tauri dev` — runs the full desktop app |
| `pnpm build` | Production Next.js build |
| `pnpm build:desktop` | Debug Tauri build (no bundle) |
| `pnpm bundle:desktop` | Full Tauri bundle for distribution |
| `pnpm lint` / `pnpm type-check` | `tsc --noEmit` |
| `cargo check` / `cargo build` | Build the Rust workspace |

There is also a separate `homepage/` Next.js project (`pnpm dev:homepage`, port 3001) for the marketing site.

## Project layout

```
codecity/
├─ src/                  Next.js 16 + React 19 frontend (app router)
├─ src-tauri/            Tauri 2 desktop shell (Rust)
├─ crates/
│  ├─ codecity-core/     Pure analysis engine (tree-sitter, layout, network)
│  ├─ codecity-cli/      `codecity-cli` binary
│  └─ codecity-mcp/      `codecity-mcp` binary (MCP over stdio)
├─ homepage/             Standalone marketing site (Next.js)
├─ licenses/             Third-party license notices (e.g., opengrep LGPL-2.1)
└─ docs/                 Project documentation
```

## Tech stack

- **Frontend:** Next.js 16, React 19, TypeScript, Tailwind CSS 4, Zustand, TanStack Query, Radix UI
- **3D rendering:** three.js, `@react-three/fiber`, `@react-three/drei`, `@react-three/postprocessing`
- **Desktop shell:** Tauri 2 (`tauri-plugin-shell`, `tauri-plugin-dialog`, `tauri-plugin-updater`, `tauri-plugin-process`)
- **Persistence:** SQLite via `rusqlite` (bundled)
- **Analysis:** tree-sitter (40+ language grammars), `rayon` for parallel parsing, `ignore`/`globset` for filesystem walking
- **MCP:** `rmcp` 1.6 (official `modelcontextprotocol/rust-sdk`)
- **Security scanning:** `opengrep` (bundled as an external Tauri sidecar, see `licenses/LICENSE.opengrep`)

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT — see [LICENSE](LICENSE).
