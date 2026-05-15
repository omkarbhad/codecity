<!-- generated-by: gsd-doc-writer -->
# Configuration

CodeCity is a Tauri 2 desktop application with a Next.js frontend and a Rust workspace
backend. Its configuration is split across three layers:

- **Build-time configuration** — Tauri (`src-tauri/tauri.conf.json`), Next.js
  (`next.config.ts`), TypeScript (`tsconfig.json`), Tailwind/PostCSS, shadcn
  (`components.json`), and the Cargo workspace (`Cargo.toml`).
- **Runtime capabilities** — Tauri permission grants in `src-tauri/capabilities/`.
- **Environment variables** — `.env` / `.env.local` consumed by the Next.js layer,
  plus a handful of Rust-side flags read via `std::env::var`.

## Environment variables

The canonical list of environment variables lives in `.env.example`. Copy it to
`.env.local` and fill in the values before running the Next.js dev server.

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Required | _(none)_ | Postgres connection string for the dashboard backend. Example value in `.env.example` points at Neon. <!-- VERIFY: production Neon endpoint --> |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Required | _(empty)_ | Firebase Web SDK API key. Exposed to the browser (`NEXT_PUBLIC_` prefix). |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Required | _(empty)_ | Firebase auth domain (e.g. `your-project.firebaseapp.com`). |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Required | _(empty)_ | Firebase project ID. |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Required | _(empty)_ | Firebase storage bucket. |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Required | _(empty)_ | Firebase Cloud Messaging sender ID. |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Required | _(empty)_ | Firebase app ID. |
| `GITHUB_TOKEN` | Optional | _(empty)_ | GitHub Personal Access Token used for repo analysis / API rate-limit headroom. |
| `KV_REST_API_URL` | Optional | _(empty)_ | Upstash Redis REST endpoint for progress tracking. <!-- VERIFY: which workflows depend on Upstash --> |
| `KV_REST_API_TOKEN` | Optional | _(empty)_ | Upstash Redis REST token paired with `KV_REST_API_URL`. |
| `ADMIN_EMAIL` | Optional | _(empty)_ | Email address granted admin privileges in the dashboard. |
| `SKIP_AUTH` | Optional | unset | When set to `"true"`, bypasses auth for local development. Commented out by default in `.env.example`. |

### Rust-side environment flags

These are read from inside the workspace crates via `std::env::var`. They are
runtime-only and have no `.env.example` entry.

| Variable | Consumer | Effect |
|----------|----------|--------|
| `CODECITY_TIMING` | `codecity-core` (`crates/codecity-core/src/network.rs`) | If set (any value), enables network-analysis timing logs. |
| `CODECITY_MCP_NO_CACHE` | `codecity-mcp` (`crates/codecity-mcp/src/loader.rs`) | If set, disables the on-disk snapshot cache the MCP server uses. |

> The Tauri desktop process itself does not read project-level environment
> variables — Firebase / Postgres / Upstash configuration is consumed by the
> Next.js dashboard, not the native shell.

## Build-time configuration files

### Tauri (`src-tauri/tauri.conf.json`)

Top-level fields that govern how the desktop app is built and packaged:

- `productName`: `CodeCity`
- `version`: `0.1.1`
- `identifier`: `com.codecity.desktop`
- `build.beforeDevCommand`: `pnpm dev`
- `build.devUrl`: `http://localhost:3000/dashboard`
- `build.beforeBuildCommand`: `pnpm build`
- `build.frontendDist`: `../out` (Next.js static export output)
- `app.windows[0]`: title `CodeCity`, `1280x800`, resizable, centered, not
  fullscreen.
- `app.security.csp`: `null` — no Content Security Policy is enforced. Change
  this before shipping to production users handling untrusted content.
- `bundle.active`: `true`
- `bundle.createUpdaterArtifacts`: `true`
- `bundle.targets`: `"all"` (build every target supported on the host platform)
- `bundle.externalBin`: `["binaries/opengrep"]` — the opengrep sidecar (see
  Security scan section below).
- `bundle.resources`: `["../licenses/LICENSE.opengrep"]` — the LGPL-2.1 license
  text shipped alongside the binary.
- `bundle.icon`: PNG / ICNS / ICO icons under `src-tauri/icons/`.
- `plugins.shell.open`: `true` — allows the shell plugin to open URLs.
- `plugins.updater.endpoints`:
  `https://github.com/MagnovaAI/codecity/releases/latest/download/latest.json`
  <!-- VERIFY: the public-facing updater feed URL -->
- `plugins.updater.pubkey`: minisign public key embedded in `tauri.conf.json`.

### Tauri capabilities (`src-tauri/capabilities/default.json`)

Capabilities declare which Tauri commands the frontend window is permitted to
invoke. The single `default` capability applies to the `main` window and grants:

- `core:default` — Tauri's baseline command set.
- `shell:allow-open` — open URLs / files in the OS default handler.
- `dialog:allow-open` — native file / folder picker dialogs.
- `updater:default` — check for and apply updates.
- `process:allow-restart` — restart the app (used after applying an update).
- `shell:allow-execute` scoped to the opengrep sidecar
  (`binaries/opengrep`, `sidecar: true`, `args: true`).

Generated permission manifests in `src-tauri/gen/schemas/` (`acl-manifests.json`,
`capabilities.json`, `desktop-schema.json`, `macOS-schema.json`) are produced
from these inputs by `tauri-build` and should not be edited by hand.

### Security scan (opengrep sidecar)

The security-scan feature shells out to a bundled
[opengrep](https://github.com/opengrep/opengrep) binary via the Tauri sidecar
mechanism. Configuration is split across three places:

- **Bundling**: `tauri.conf.json` declares `bundle.externalBin = ["binaries/opengrep"]`.
- **Permission**: `capabilities/default.json` grants
  `shell:allow-execute` scoped to `binaries/opengrep` with `sidecar: true,
  args: true`.
- **Binaries**: `src-tauri/binaries/` holds one file per target triple, named
  with the triple suffix (e.g. `opengrep-aarch64-apple-darwin`,
  `opengrep-x86_64-apple-darwin`, `opengrep-x86_64-pc-windows-msvc.exe`,
  `opengrep-x86_64-unknown-linux-gnu`). Only `opengrep-aarch64-apple-darwin`
  is currently committed; the rest are fetched by CI before `tauri build`.
  <!-- VERIFY: CI workflow that downloads opengrep release binaries -->

At runtime, `src-tauri/src/analysis/pipeline/mod.rs::opengrep_binary_path()`
resolves the binary relative to the current executable (with the target-triple
suffix in release builds, or unsuffixed in dev). The scan invocation is:

```
opengrep scan --config auto --json <project_root>
```

opengrep is LGPL-2.1; invoking it as a separate process preserves the LGPL
boundary. The license text is bundled via `bundle.resources` and lives at
`licenses/LICENSE.opengrep`.

### Next.js (`next.config.ts`)

- `output: "export"` — static export; the build emits to `out/` which Tauri
  consumes via `build.frontendDist`.
- `images.unoptimized: true` — required for static export.
- `compiler.removeConsole: false` — `console.*` calls are preserved in
  production builds.
- `turbopack.rules`: `*.svg` files are processed by `@svgr/webpack`.

### TypeScript (`tsconfig.json`)

- `target`: `ES2017`, `module`: `esnext`, `moduleResolution`: `bundler`.
- `strict: true`, `noEmit: true`, `jsx: "react-jsx"`.
- `lib`: `dom`, `dom.iterable`, `esnext`.
- Path aliases:
  - `@/*` → `./src/*`
  - `@codecity/ui/*` → `./src/ui/*`
- Includes: `next-env.d.ts`, `**/*.ts`, `**/*.tsx`, `.next/types/**/*.ts`,
  `.next/dev/types/**/*.ts`.
- Excludes: `node_modules`, `homepage` (the marketing site has its own
  `tsconfig.json`).

### Tailwind / PostCSS

- `postcss.config.mjs` registers the single plugin `@tailwindcss/postcss`
  (Tailwind v4).
- There is no dedicated `tailwind.config.*` — Tailwind v4 reads configuration
  directly from the CSS entry point at `src/ui/styles/globals.css` (referenced
  by `components.json` `tailwind.css`).

### shadcn / Efferd (`components.json`)

- `style`: `mira`
- `rsc`: `true`, `tsx`: `true`
- `tailwind.css`: `src/ui/styles/globals.css`
- `tailwind.baseColor`: `zinc`
- `tailwind.cssVariables`: `true`
- `iconLibrary`: `lucide`
- Aliases: `components` → `@/components`, `hooks` → `@/hooks`,
  `lib` → `@/lib`, `utils` → `@codecity/ui/lib/utils`,
  `ui` → `@codecity/ui/components`.
- Custom registry `@efferd` → `https://efferd.com/r/{style}/{name}.json`.

### Cargo workspace (`Cargo.toml`)

The repository root is a Cargo workspace (`resolver = "2"`) with four members:

- `crates/codecity-core` — pure code-analysis library (tree-sitter parsing,
  import resolution, network analysis, city layout). Zero I/O, zero app deps.
- `crates/codecity-cli` — thin CLI wrapper (`codecity analyze ...`).
- `crates/codecity-mcp` — MCP server exposing snapshot queries over rmcp stdio.
- `src-tauri` — the desktop app (RPC, persistence, HTTP fetches).

`default-members = ["src-tauri"]` so a bare `cargo build` from the repo root
builds the desktop app.

Workspace-shared package metadata:

- `version`: `0.1.1`
- `edition`: `2021`
- `license`: `MIT`

Workspace-shared dependency versions (pinned in `[workspace.dependencies]`)
include `serde 1`, `serde_json 1`, `tokio 1`, `tree-sitter 0.26`, `clap 4`,
`rmcp 1.6`, plus the full tree-sitter language grammar set. Member crates
reference them with `.workspace = true` to avoid version drift.

### Tauri crate (`src-tauri/Cargo.toml`)

- `name`: `codecity`, `default-run`: `codecity`
- `[lib]`: `name = "codecity_lib"`, `crate-type = ["staticlib", "cdylib", "rlib"]`
- `build-dependencies`: `tauri-build = "2"` (no extra features)
- Direct dependencies:
  - `codecity-core` (path dep on `../crates/codecity-core`)
  - `tauri 2` (no extra features)
  - Tauri plugins: `tauri-plugin-shell 2`, `tauri-plugin-dialog 2`,
    `tauri-plugin-updater 2`, `tauri-plugin-process 2`
  - `rusqlite 0.32` with the `bundled` feature
  - `reqwest 0.12` with `json`
  - `tokio 1` with `full`
  - `uuid 1` with `v4`, `chrono 0.4` with `serde`
  - `flate2 1`, `dirs 6`, `zip 2`
  - Workspace-shared: `serde`, `serde_json`, `log`, `env_logger`,
    `once_cell`, `regex`, `thiserror`

No Cargo feature flags are exposed on `src-tauri` itself; build-time variation
is driven entirely by `tauri-build` and `tauri.conf.json`.

## Required vs optional settings

The Tauri / Cargo / Next.js configuration files listed above must all be
present — the project will not build without them. The environment variables
table marks which `.env` keys are required versus optional. There is no
explicit startup validation that throws on missing env vars in the Rust code;
missing Firebase / Postgres credentials surface as runtime errors from the
respective client libraries in the Next.js dashboard.

## Defaults

- All non-`NEXT_PUBLIC_` env vars default to empty strings as shown in
  `.env.example`.
- `SKIP_AUTH` is unset by default (auth enforced).
- Tauri window defaults: `1280 x 800`, resizable, centered, windowed.
- opengrep is invoked with `--config auto` — its rule set is whatever
  opengrep's `auto` resolver picks at run time. <!-- VERIFY: pinned opengrep ruleset version -->

## Per-environment overrides

There are no `.env.development`, `.env.production`, or `.env.test` files
committed to the repo. The standard Next.js precedence applies: `.env.local`
takes priority over `.env`, and `NODE_ENV`-suffixed files would be loaded if
present. <!-- VERIFY: hosted deployment env-var management (Vercel / Neon / Upstash dashboards) -->

The desktop app has no separate environment-overlay mechanism — environment
overrides are a Next.js concern only.
