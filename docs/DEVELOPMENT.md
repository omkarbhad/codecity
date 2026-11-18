<!-- generated-by: gsd-doc-writer -->
# Development

This guide is the working reference for hacking on CodeCity locally. It assumes you have already
read [README.md](../README.md) for prerequisites and [docs/ARCHITECTURE.md](./ARCHITECTURE.md)
for the system overview. For env vars and build-time config, see
[docs/CONFIGURATION.md](./CONFIGURATION.md).

## Local setup

CodeCity is a Cargo workspace plus a Next.js app sharing a single tree. There is one frontend
package and four Rust crates (`codecity-core`, `codecity-cli`, `codecity-mcp`, `src-tauri`). One
install bootstraps everything; pnpm pulls JS deps, and `cargo` pulls Rust deps the first time you
build.

```bash
git clone https://github.com/MagnovaAI/codecity.git
cd codecity
pnpm install
```

The package manager is pinned via `packageManager: "pnpm@9.15.0"` in `package.json` — use pnpm,
not npm or yarn, to keep `pnpm-lock.yaml` clean.

To run the desktop app in development:

```bash
pnpm desktop
```

This invokes `tauri dev` (see `src-tauri/tauri.conf.json`), which:

1. Runs `pnpm dev` as `build.beforeDevCommand` (Next.js dev server on port 3000).
2. Waits for `build.devUrl` (`http://localhost:3000/dashboard`) to come up.
3. Builds the Rust app crate (`src-tauri`) in debug mode and launches the native window.
4. Opens DevTools automatically in debug builds (`lib.rs` calls `window.open_devtools()` under
   `#[cfg(debug_assertions)]`).

If you only want the Next.js UI in a browser (no native shell, no Tauri bridge), `pnpm dev` is
enough. The Tauri RPC bridge is unavailable in pure-web mode; pages that call `invoke("rpc", …)`
will error.

## Build commands

All scripts live in `package.json`. The Rust workspace is driven through `cargo` directly.

### pnpm scripts

| Command | What it does |
|---|---|
| `pnpm dev` | Next.js dev server on `:3000`. |
| `pnpm dev:fast` | Same as `dev` but with `NODE_OPTIONS=--max-old-space-size=4096`. Use on heavy machines or when the analyzer is rendering many files. |
| `pnpm dev:homepage` | Marketing site dev server (`homepage/` project) on `:3001`. |
| `pnpm desktop` | Tauri dev mode (`tauri dev`). Brings up Next.js + native window together. |
| `pnpm build` | `next build` for the main app. Produces `out/` (static export) consumed by Tauri's `frontendDist`. |
| `pnpm build:homepage` | `next build homepage` for the marketing site. |
| `pnpm build:desktop` | `tauri build --debug --no-bundle`. Compiles a debug-symbol binary without producing installers. Fast iteration on release-shaped Rust. |
| `pnpm bundle:desktop` | `tauri build`. Full release bundle (DMG / MSI / AppImage / deb). |
| `pnpm start` | `next start` (production Next.js server, port 3000). |
| `pnpm start:homepage` | `next start homepage --port 3001`. |
| `pnpm lint` | `tsc --noEmit` — type-check the main TypeScript project. There is no ESLint/Prettier/Biome in the repo; `lint` is currently a typecheck alias. |
| `pnpm lint:homepage` | `tsc --project homepage/tsconfig.json --noEmit`. |
| `pnpm type-check` | Alias for `tsc --noEmit`. |
| `pnpm tauri` | Pass-through to the Tauri CLI: `pnpm tauri <subcommand>`. |

### Cargo commands

Run from the repo root unless noted. `default-members = ["src-tauri"]` means a bare `cargo build`
builds the desktop app.

| Command | What it does |
|---|---|
| `cargo check` | Fast type/borrow check of all workspace crates. |
| `cargo check -p codecity-core` | Same, scoped to one crate. Useful when iterating on the analysis engine without rebuilding Tauri. |
| `cargo build` | Debug build of `src-tauri` (the default member). |
| `cargo build --release` | Release build of the desktop app crate. |
| `cargo build -p codecity-cli` | Build only the CLI. Runs as `cargo run -p codecity-cli -- <args>` or `./target/debug/codecity-cli`. |
| `cargo build -p codecity-mcp` | Build only the MCP server. |
| `cargo run -p codecity-cli -- analyze <path>` | Drive the analysis engine without the desktop app. |
| `cargo run -p codecity-cli -- analyze <path> --json --pretty` | Emit a pretty-printed `CitySnapshot` JSON to stdout. |
| `cargo run -p codecity-cli -- inspect <snapshot.json>` | Pretty-print a saved snapshot. |
| `cargo run -p codecity-mcp -- --repo <path>` | Start the MCP server speaking JSON-RPC on stdio. |
| `cargo clippy --workspace --all-targets` | Lint all crates. Not wired into a pnpm script — run it directly. |
| `cargo fmt --all` | Format all crates with rustfmt. |

The CI checks called out in [CONTRIBUTING.md](../CONTRIBUTING.md) are:

```bash
pnpm type-check
pnpm build
cd src-tauri && cargo check
```

Run them before opening a PR.

## Hot reload behavior

- **Frontend (TS / TSX / CSS):** Next.js dev server handles HMR. Edits to anything under `src/`
  hot-reload in the open Tauri window without restarting `tauri dev`. CSS edits apply with no
  reload; component edits trigger a fast refresh.
- **`next.config.ts`:** Not hot — restart `pnpm desktop`.
- **Rust (`src-tauri/`, `crates/*`):** `tauri dev` watches the Rust source and rebuilds + relaunches
  the native window when a `.rs` file changes. Expect a multi-second pause while `cargo build` runs;
  the open Next.js dev server stays up across restarts. There is no Rust HMR — the native process is
  killed and respawned.
- **`tauri.conf.json` and `capabilities/*.json`:** Restart `pnpm desktop`. Capability changes also
  regenerate the schemas under `src-tauri/gen/schemas/`.
- **`Cargo.toml` (workspace or member):** A bare save can cause Tauri's watcher to skip the rebuild
  because no `.rs` file changed. Stop and rerun `pnpm desktop` after editing Cargo manifests.
- **`components.json` (shadcn config):** Read only when running `pnpm dlx shadcn add` (or similar
  generators); not consulted at runtime.

## Common Tauri pitfalls

These are the failure modes that have actually bitten this codebase. Reach for them when the dev
loop misbehaves.

- **Stale capability cache.** If RPC calls start returning "Not allowed" or sidecar exec fails after
  editing `src-tauri/capabilities/default.json`, delete `src-tauri/target/debug/.fingerprint` *only
  if* a normal rebuild does not help, then rerun `pnpm desktop`. Generated files in
  `src-tauri/gen/schemas/` will be regenerated by `tauri-build`.
- **Sidecar not found in dev.** `opengrep_binary_path()` in `src-tauri/src/analysis/pipeline/mod.rs`
  resolves `binaries/opengrep` (unsuffixed) in dev and `binaries/opengrep-<target-triple>` in
  release. If `security.scan` returns "binary not found", confirm the unsuffixed file exists in
  `src-tauri/binaries/` and is executable (`chmod +x`).
- **`build.frontendDist = "../out"` is empty.** `pnpm bundle:desktop` (and CI release builds) require
  `pnpm build` to have produced the `out/` directory first. The `beforeBuildCommand` covers this,
  but if you run `tauri build` directly without going through pnpm, you must build the frontend
  yourself.
- **Frontend can't reach the bridge in browser-only mode.** Anything that calls
  `invoke("rpc", …)` from `src/lib/tauri.ts` only works inside the Tauri shell. Loading
  `http://localhost:3000` in a plain browser will throw "window.__TAURI__ is undefined" style
  errors. Use `pnpm desktop`, not `pnpm dev`, for end-to-end testing.
- **Devtools toggling.** Devtools auto-open in debug builds (`window.open_devtools()` guarded by
  `#[cfg(debug_assertions)]`). They will not open in `pnpm bundle:desktop` output. Use
  `pnpm build:desktop` for a release-shaped binary that still has devtools available.
- **`projects.getSnapshot` returns null silently.** Historical bug pattern: serde failures inside
  `Database::get_snapshot` used to be swallowed. They are now logged + propagated through
  `internal_error` (`src-tauri/src/lib.rs::dispatch_rpc`, `projects.getSnapshot` arm). If you add a
  new field to `CitySnapshot`, make sure existing rows still deserialize (`#[serde(default)]`) or
  bump the schema and migrate.
- **CSP is disabled.** `app.security.csp` is `null` in `tauri.conf.json`. Inline scripts and remote
  resources load freely in dev. Do not rely on that staying true forever — keep dev habits CSP-safe.

## File-by-file responsibilities

High-level only; for the full data flow see [docs/ARCHITECTURE.md](./ARCHITECTURE.md).

### `crates/codecity-core/` — pure analysis library

- `src/lib.rs` — Module roots + the public re-exports (`create_snapshot`, `recompute_snapshot`,
  `parse_files`, `parse_file_batch`, `resolve_internal_imports_full`, `AnalysisParser`,
  `CitySnapshot`, `LayoutMode`, `TsConfigAliases`, `ZigDeps`). Anything not re-exported here is
  considered internal.
- `src/discovery.rs` — Filesystem walk rules: which extensions are "source", which directories to
  skip (`node_modules`, `.git`, `dist`, `target`, `__pycache__`, `vendor`, `.venv`, lockfiles, …).
- `src/parser.rs` — Tree-sitter parsers + per-language symbol extraction. Owns `AnalysisParser`,
  `ParsedFile`, `FileType`, `CallSite`, the language table, and import resolution
  (`resolve_internal_imports_full`, `TsConfigAliases`, `ZigDeps`).
- `src/network.rs` — Louvain community detection, entry points, hubs, FCoSE coordinates. Honors
  `CODECITY_TIMING` for per-phase profiling.
- `src/layout/` — District placement, building dimensions, `CitySnapshot` assembly
  (`create_snapshot`, `recompute_snapshot`).

### `crates/codecity-cli/` — `codecity` command-line tool

- `src/main.rs` — `clap` definitions for the `analyze`, `network`, and `inspect` subcommands.
  Runs the same `codecity-core` pipeline the desktop app uses, with a timeout and gitignore
  controls.

### `crates/codecity-mcp/` — MCP server

- `src/main.rs` — Binary entry. Parses `--snapshot` / `--repo` / `--source-root` / `--no-gitskip`,
  initializes the rmcp stdio transport. Logs go to **stderr only**; stdout is the JSON-RPC wire.
- `src/server.rs` — `CodecityMcp` — MCP tool implementations: `overview`, `explain`, `find_path`,
  `find_callers`, `find_callees`, `entry_points`, `hubs`.
- `src/loader.rs` — Snapshot loading + on-disk caching (toggleable via `CODECITY_MCP_NO_CACHE`).
- `src/query.rs` — Read-only query helpers over a loaded `CitySnapshot`.
- `src/lib.rs` — Module roots and the public surface for the binary.

### `src-tauri/` — desktop app crate

- `src/main.rs` — Boots `codecity_lib::run()`.
- `src/lib.rs` — Tauri builder, plugin registration (`shell`, `dialog`, `updater`, `process`),
  `AppState`, and the entire JSON-RPC dispatcher: `rpc` (the single `#[tauri::command]`) plus
  `dispatch_rpc` which maps every method name to its handler. Note: this dispatcher is in
  `lib.rs`, not a separate `commands.rs` file.
- `src/analysis/mod.rs` — Re-exports for the `analysis` namespace.
- `src/analysis/auth.rs` — GitHub device-code OAuth + `gh` CLI session import.
- `src/analysis/db.rs` — `rusqlite::Connection` wrapper (`Database`). Owns schema, projects,
  parsed files, snapshots, settings (GitHub token), security scans, and findings.
- `src/analysis/github.rs` — GitHub REST helpers (list repos, fetch commits, fetch file
  content, parse `owner/repo` from URL).
- `src/analysis/pipeline/mod.rs` — End-to-end analysis orchestration: `analyze`,
  `enqueue_analyze`, `enqueue_refresh`, archive/clone fetch, source discovery, parse, persist,
  progress reporting.
- `src/analysis/pipeline/cancellation.rs` — Cooperative cancellation tokens for in-flight scans.
- `src/analysis/pipeline/security.rs` — opengrep sidecar runner: spawn, stream JSON, persist
  findings.
- `src/analysis/pipeline/security_types.rs` — Wire types for the security scan handlers.
- `tauri.conf.json` — App identity, window, bundle targets, sidecar declaration, updater feed.
- `capabilities/default.json` — Permission grants (see CONFIGURATION.md for the list).
- `binaries/` — Bundled sidecars; currently only `opengrep` (multi-target-triple).
- `gen/schemas/` — Generated permission manifests. Do not edit by hand.

### `src/` — Next.js frontend (App Router)

- `app/` — Routes: `dashboard`, `project`, `analyze`, `explore`, `repos`. Each route loads a
  page that ultimately hydrates `useCityStore` and renders city panels.
- `components/city/` — The city and everything around it:
  - the 3D scene: `city-scene.tsx`, `instanced-buildings.tsx`, `building-material.ts`,
    `lighting.tsx`, `ground.tsx`, `district-ground.tsx`, `city-atmosphere.tsx`,
    `dependency-pipes.tsx`, `camera-controller.tsx`, `building-labels.tsx`, `selection-marker.tsx`
  - the other views: `city-2d-canvas.tsx`, `city-network-canvas.tsx`
  - the shell: `project-shell.tsx` (sidebar, toolbar, panels), `side-panel.tsx` (file details),
    `file-tree.tsx`, `extension-filter.tsx`, `district-legend.tsx`, `commit-timeline.tsx`,
    `security-sidebar.tsx`, `settings-panel.tsx`, `help-dialog.tsx`
  - the editor: `editor-pane.tsx`, `use-editor-store.ts`, `markdown-preview.tsx`
  - state: `use-city-store.tsx`
- `components/dashboard/` — Sidebar, project list, GitHub repos, new-analysis dialog.
- `components/ui/` — Shared low-level UI primitives (used in addition to `src/ui/components/`).
  `icons.ts` is the one place icons are imported from (Phosphor); `app-icon.tsx` renders them.
- `hooks/` — `use-mobile`, `use-scroll`.
- `lib/tauri.ts` — JSON-RPC client; every backend call goes through `invoke("rpc", …)` here.
- `lib/security.ts` — Security scan polling helper.
- `lib/app-updater.ts` — Tauri updater glue.
- `lib/types/city.ts` — TS mirror of `CitySnapshot`. Keep in sync with the Rust struct.
- `lib/visualization/` — Building dimensions, city bounds, color utilities.
- `ui/` — Local shadcn-style primitives (`ui/components/`), helpers (`ui/lib/`), and the
  Tailwind v4 CSS entry (`ui/styles/globals.css`).

### Root

- `Cargo.toml` — Workspace root: members, shared dep versions, the full tree-sitter grammar set.
- `package.json` — pnpm scripts, JS dependencies, package manager pin.
- `next.config.ts` — Next.js: `output: "export"`, SVGR rule, `images.unoptimized`.
- `components.json` — shadcn / Efferd configuration.
- `tsconfig.json` — TypeScript settings + path aliases (`@/*`, `@codecity/ui/*`).
- `postcss.config.mjs` — Tailwind v4 plugin.
- `schemas/` — JSON Schema definitions (`shadcn-components.schema.json`).
- `scripts/` — Build / packaging helpers (`start-server.js`, `prod-start.js`).
- `homepage/` — A separate Next.js project for the marketing site (its own `tsconfig.json`).
- `docs/` — Project documentation. This file lives here.

## How to add a new RPC command

The RPC layer is one function in one file. Adding a method is a four-step append.

1. **Define the params struct** in `src-tauri/src/lib.rs` (top of file, alongside the existing
   `AnalyzeParams`, `IdParams`, etc.):

   ```rust
   #[derive(Debug, Deserialize)]
   #[serde(rename_all = "camelCase")]
   struct MyNewParams {
       project_id: String,
       limit: Option<usize>,
   }
   ```

   `rename_all = "camelCase"` is the convention — the frontend sends `projectId`, the struct
   field is `project_id`.

2. **Implement the handler** in the relevant `analysis::*` module (or inline in `lib.rs` for
   trivial cases). Return something `serde::Serialize` and propagate errors with the existing
   `internal_error` / `invalid_params` helpers.

3. **Add a match arm** to `dispatch_rpc` (`src-tauri/src/lib.rs`, around line 187). Pattern:

   ```rust
   "myNamespace.myMethod" => {
       let params: MyNewParams = parse_params(params)?;
       let result = my_handler(&state.db, &params).map_err(internal_error)?;
       to_value(result)
   }
   ```

   Method names follow `namespace.action` (`analysis.analyze`, `projects.list`, `github.getUser`,
   `security.scan`). Unknown methods fall through to a `-32601` "Method not found" error — no
   panic, but the frontend sees a clean JSON-RPC error.

4. **Wire the frontend**: add a typed wrapper in `src/lib/tauri.ts` that calls
   `invoke("rpc", { request: { jsonrpc: "2.0", id, method: "myNamespace.myMethod", params } })`
   and validates / unwraps the response. Keep response types in `src/lib/types/` so the TS side
   stays a mirror of the Rust struct (`#[serde(rename_all = "camelCase")]` already aligns the
   field names).

If the new method spawns a long-running task (analysis, scan, refresh), look at
`enqueue_analyze`, `enqueue_refresh`, and `enqueue_security_scan` in
`src-tauri/src/analysis/pipeline/mod.rs` — they share a pattern: insert a "processing" row,
spawn a tokio task, write progress + results back to SQLite, support cancellation via the
`cancellation.rs` token. Reuse that shape rather than inventing a new one.

## How to add a new tree-sitter language

Adding a language touches two places: the workspace `Cargo.toml` and the language table in the
parser.

1. **Pick the grammar crate** from `crates.io`. Match the existing naming convention
   (`tree-sitter-<lang>`).

2. **Pin the version** in `Cargo.toml` `[workspace.dependencies]`:

   ```toml
   tree-sitter-newlang = "X.Y"
   ```

   Adjacent entries (`tree-sitter-typescript`, `tree-sitter-python`, …) are good references for
   the right syntax.

3. **Take it as a real dependency** in `crates/codecity-core/Cargo.toml`:

   ```toml
   tree-sitter-newlang = { workspace = true }
   ```

   This is what actually pulls the grammar into the binary. The workspace pin alone is not
   enough.

4. **Map the file extension** to a `FileType` variant in
   `crates/codecity-core/src/parser.rs::FileType::from_path` (around line 200). Add the variant
   itself to the `FileType` enum if it does not already exist, and to the string conversions
   used by `language` (`FileType::Newlang => "NewLang"`).

5. **Register the grammar** in `language_table()` (`crates/codecity-core/src/parser.rs`, around
   line 400):

   ```rust
   (FileType::Newlang, tree_sitter_newlang::LANGUAGE.into()),
   ```

   The comment above the table is explicit: "Adding a language is a single-line append here plus
   a dispatch arm in `walk_tree` — no struct fields, no `match`/init pair." Honor that.

6. **Extend `walk_tree` / symbol extraction** if you want functions, classes, types, or imports
   pulled out — otherwise the new language parses to an empty `ParsedFile` but still contributes
   line counts, file size, and graph nodes. Look at how an adjacent language (e.g. Rust at line
   1144) walks node kinds, names, and ranges.

7. **Add a test fixture.** The parser module has inline `#[cfg(test)]` tests asserting per-language
   detection (e.g. `assert_eq!(parsed.file_type, FileType::Rust)`). Mirror one for your new
   language.

8. **Rebuild from clean.** `cargo build -p codecity-core && cargo build -p src-tauri`. Tree-sitter
   ABI mismatches surface as `set_language` failures — `AnalysisParser::new()` silently skips
   incompatible grammars, so check `cargo build` output for warnings if the new grammar fails to
   register.

## Debug logging

CodeCity uses the standard Rust `log` facade with `env_logger`. Two switches matter day-to-day:

- **`RUST_LOG`** — global log level filter. The CLI and MCP binaries default to `info`
  (`env_logger::Env::default().default_filter_or("info")`). Override per-module to focus:

  ```bash
  RUST_LOG=codecity=debug,codecity_core=trace pnpm desktop
  ```

  The desktop app inherits whatever `RUST_LOG` is set when `pnpm desktop` runs. The
  `codecity-mcp` binary intentionally forces all logs to **stderr** so they do not corrupt the
  stdio JSON-RPC wire; setting `RUST_LOG` there is safe.

- **`CODECITY_TIMING`** — set to any value (typically `1`) to enable per-phase timing in the
  network-analysis pass (`crates/codecity-core/src/network.rs:41`):

  ```bash
  CODECITY_TIMING=1 cargo run -p codecity-cli -- analyze .
  ```

  Output is one line per phase, written to stderr, in the form
  `[network] <label>  <duration>ms`. Off by default — the env lookup is cheap so the macro stays
  in production builds.

- **`CODECITY_MCP_NO_CACHE`** — set to any value to bypass the MCP loader's on-disk snapshot
  cache (`crates/codecity-mcp/src/loader.rs`). Use when you're rebuilding snapshots and want a
  fresh analyze every run.

The desktop app surfaces `log::info!` / `log::error!` calls in the terminal that ran
`pnpm desktop` and, in debug builds, in DevTools. Notable always-on log points:

- `analysis::pipeline::analyze` — "Downloading repo archive: …" / "Cloning repo: …" / final
  counts (`mod.rs:330`, `mod.rs:416`, `mod.rs:1152`).
- `analysis::pipeline::security` — scan start, finding count, completion (`security.rs:48`,
  `security.rs:118`).
- `dispatch_rpc::projects.getSnapshot` — `log::error!` on serde / schema failures (intentional;
  silent snapshot-load failures used to be brutal to debug).

For frontend debugging, devtools open automatically in `pnpm desktop` (debug-asserted in
`src-tauri/src/lib.rs::run` setup). The Zustand store (`src/components/city/use-city-store.tsx`)
holds the live snapshot — inspecting it in DevTools is the fastest way to understand what the
renderer sees.

## Pretty-printing JSON snapshots

The `CitySnapshot` JSON is large and unindented by default. Three ways to get a readable view:

1. **CLI `--pretty`**: 

   ```bash
   cargo run -p codecity-cli -- analyze /path/to/project --json --pretty
   ```

   `--pretty` (or any `--output <file>` invocation) routes through `serde_json::to_string_pretty`
   in `crates/codecity-cli/src/main.rs` (around line 156). When writing to a file, pretty is the
   default; when writing to stdout, pass `--pretty` explicitly.

2. **CLI `inspect`**:

   ```bash
   cargo run -p codecity-cli -- inspect snapshot.json
   cargo run -p codecity-cli -- inspect snapshot.json --node src/lib/foo.ts
   ```

   `inspect` is pretty-by-default — it always uses `to_string_pretty` (see `main.rs:237`). `--node`
   prints just the entry for one file path, which is the fastest way to sanity-check parser
   output without scrolling past every other file.

3. **Pipe through `jq`** for ad-hoc queries:

   ```bash
   cargo run -p codecity-cli -- analyze . --json | jq '.stats'
   cargo run -p codecity-cli -- analyze . --json | jq '.network.communities | length'
   ```

The same data is available from the desktop app via `projects.getSnapshot` — DevTools' "Copy as
JSON" on a Zustand selector gives you an in-memory dump if reproducing through the CLI is
inconvenient.

## Adding UI components

UI primitives follow the shadcn pattern, configured via `components.json`:

- `style`: `mira`
- `tailwind.css`: `src/ui/styles/globals.css`
- `tailwind.baseColor`: `zinc`, `cssVariables`: `true`
- `iconLibrary`: `phosphor`
- Aliases (resolved by both `tsconfig.json` and the shadcn generator):
  - `components` → `@/components`
  - `hooks` → `@/hooks`
  - `lib` → `@/lib`
  - `utils` → `@codecity/ui/lib/utils`
  - `ui` → `@codecity/ui/components`

To add a primitive from the shadcn registry:

```bash
pnpm dlx shadcn@latest add button
```

The generator reads `components.json`, drops the file under `src/ui/components/`, and resolves
import paths via the aliases above. After adding, the typical import shape is:

```ts
import { Button } from "@codecity/ui/components/button"
import { cn } from "@codecity/ui/lib/utils"
```

A custom registry `@efferd` (`https://efferd.com/r/{style}/{name}.json`) is also configured;
pass `@efferd/<name>` to the shadcn CLI to install from it.

For city-specific 3D and panel components (anything backed by `useCityStore`), keep them under
`src/components/city/` and follow the existing naming (kebab-case file, PascalCase export).

## Branch conventions

There is no documented branch-naming rule. The current default branch is `main`. Feature
branches in this tree have used `feat/<topic>` (e.g. `feat/security-scan`) — match that if you
do not have a reason to deviate.

## PR process

From [CONTRIBUTING.md](../CONTRIBUTING.md):

- Keep changes focused.
- Include screenshots for UI changes.
- Run the checks before opening a PR:

  ```bash
  pnpm type-check
  pnpm build
  cd src-tauri && cargo check
  ```

- Use Conventional Commits when possible (e.g. `feat: add local folder analysis`,
  `fix(security): match security button style to switcher pills`).
- For Rust-heavy changes, also run `cargo clippy --workspace --all-targets` and
  `cargo fmt --all --check`. Neither is required by CI today, but both catch issues early.
- If you added a new RPC command, mention the method name and params in the PR description so
  reviewers can grep `dispatch_rpc` quickly.
- If you added or changed schema-shaped data (`CitySnapshot`, security records, parsed files),
  call it out and confirm existing rows still deserialize.
