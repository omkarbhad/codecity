<!-- generated-by: gsd-doc-writer -->
# Testing

CodeCity is a Tauri 2 desktop app with a Next.js/React frontend and a Rust
workspace backend. **At the time of writing, the test surface is intentionally
small and Rust-only**: a handful of focused unit tests live alongside the
modules they cover (`#[cfg(test)] mod tests { ... }`), there are no
integration test directories, no frontend test runner is wired up, and CI
does not run `cargo test`. This document describes what exists today, how to
run it, and a pragmatic manual QA loop for the desktop flow.

If you are adding a non-trivial change, please grow this surface — see
[Writing new tests](#writing-new-tests) and [Recommended testing patterns going forward](#recommended-testing-patterns-going-forward).

## Test framework and setup

| Layer | Framework | Status |
|---|---|---|
| Rust (`codecity-core`, `codecity-mcp`, `src-tauri`) | Built-in `cargo test` + `#[cfg(test)]` inline modules | In use (37 tests across 8 files) |
| Rust (`codecity-cli`) | — | No tests yet |
| Frontend (`src/`, Next.js / React / Three.js) | None configured | No test runner (no Jest, Vitest, Playwright, etc. in `devDependencies`) |
| End-to-end (Tauri WebDriver, Playwright, etc.) | None configured | Not wired up |

Prerequisites to run the Rust tests are the same as the regular Rust build —
see `GETTING-STARTED.md` (or the README) for toolchain setup. No extra
test-only dependencies are required; everything uses the standard library
test harness.

## Running tests

All commands are run from the repository root.

### Run the entire Rust workspace

```bash
cargo test --workspace
```

This covers all four members declared in the root `Cargo.toml`
(`crates/codecity-core`, `crates/codecity-cli`, `crates/codecity-mcp`,
`src-tauri`). The `codecity-cli` crate currently has no tests, so this
command exercises the other three.

### Run tests for a single crate

```bash
cargo test -p codecity-core
cargo test -p codecity-mcp
cargo test -p codecity         # this is the src-tauri crate
```

The `src-tauri` package name is `codecity` (see `src-tauri/Cargo.toml`),
not `src-tauri`.

### Run a single test module or test function

```bash
# Run every test in a module
cargo test -p codecity-core discovery::tests

# Run one specific test by name (substring match)
cargo test -p codecity-core skip_dir_known_entries
cargo test -p codecity tokenize_query   # not a real test — example pattern
```

### Show stdout from passing tests

```bash
cargo test --workspace -- --nocapture
```

### Frontend "tests"

There is no JavaScript/TypeScript test runner configured. The closest thing
in `package.json` is a typecheck pass, which is what CI relies on as a
correctness gate today:

```bash
pnpm type-check       # tsc --noEmit on the desktop app
pnpm lint             # alias of the same command
pnpm lint:homepage    # tsc --noEmit on the marketing homepage
```

These are static checks, not tests, but they are the only automated
verification that currently runs against the frontend code.

## What's currently covered

As of this writing, the Rust workspace contains **37 unit tests across 8
files**. They are intentionally narrow — each one pins down the contract of
a specific pure-ish helper. None of them spin up Tauri, the WebView, the
analysis pipeline as a whole, or SQLite-backed flows end-to-end.

| File | Tests | What it covers |
|---|---|---|
| `crates/codecity-core/src/discovery.rs` | 7 | Filesystem walker filters: `should_skip_dir`, `should_skip_file`, supported extensions and filenames, binary-file detection via NUL byte. |
| `crates/codecity-core/src/layout/color.rs` | 7 | City layout color helpers (deterministic color assignment, palette correctness). |
| `crates/codecity-core/src/parser.rs` | 4 | Tree-sitter parser wrapper — language dispatch and basic AST behavior. |
| `crates/codecity-mcp/src/query.rs` | 6 | `tokenize_query` for the MCP search tool: underscore/dash splitting, camelCase splitting, path/extension splitting, single-char filtering, empty input. |
| `src-tauri/src/analysis/db.rs` | 5 | SQLite persistence: schema bring-up, round-tripping rows for analysis artifacts. |
| `src-tauri/src/analysis/pipeline/cancellation.rs` | 3 | Cooperative cancellation token semantics for long-running scans. |
| `src-tauri/src/analysis/pipeline/security.rs` | 3 | Mapping Opengrep scanner JSON output into internal finding rows; default severity handling for unknown/missing values. |
| `src-tauri/src/analysis/pipeline/security_types.rs` | 2 | Serde shapes for the security pipeline (parsing scanner output). |

Notable gaps you should be aware of when planning work:

- **No tests for `codecity-cli`** — the `codecity analyze` command path is currently exercised only by hand.
- **No tests for Tauri command handlers** — IPC commands that the frontend calls (e.g. analysis start/stop, snapshot reads) have no automated coverage.
- **No tests for the Next.js / React / R3F frontend** — including the Three.js city scene, Zustand stores, and React Query hooks.
- **No end-to-end test of the desktop app** — there is no headless WebDriver, Playwright, or `tauri-driver` setup.

Be honest about this in PR descriptions: a green `cargo test --workspace`
means the small set above passes, not that the app is verified end-to-end.

## Writing new tests

### Rust — inline unit tests (current convention)

Every existing test lives in a `#[cfg(test)] mod tests { ... }` block at the
**bottom of the file under test**, using `use super::*;` to reach private
items. Keep new tests in the same style unless you have a reason not to.

```rust
// crates/codecity-core/src/discovery.rs
#[cfg(test)]
mod tests {
    use super::*;
    use std::path::PathBuf;

    #[test]
    fn skip_dir_known_entries() {
        assert!(should_skip_dir("node_modules"));
        assert!(should_skip_dir(".git"));
        assert!(!should_skip_dir("src"));
    }
}
```

Guidelines we already follow in the existing tests:

- **One assertion theme per test.** Tests have short, descriptive names
  (`skip_file_lockfiles`, `unknown_severity_defaults_to_info`) and assert
  one behavior each.
- **Test private helpers directly.** Because tests live in the same file,
  you can exercise non-`pub` items via `use super::*;`. Prefer this over
  forcing things `pub` just to test them.
- **Build fixtures inline.** See `run_with_one` in
  `src-tauri/src/analysis/pipeline/security.rs` for an example of a small
  helper that builds a JSON fixture inside the test module.
- **Pure logic over I/O.** Existing tests avoid touching the real filesystem,
  database, or network. When you must, scope the I/O tightly (the DB tests
  in `src-tauri/src/analysis/db.rs` use temporary databases via `rusqlite`'s
  `:memory:` / temp-file patterns — follow that example).

### Rust — integration tests (not yet used)

If you add a test that exercises multiple modules together, prefer a
crate-level integration test directory, e.g.
`crates/codecity-core/tests/walker_smoke.rs`. None exist today; creating
the first one is fine, just keep it small and document any fixture
directories you add.

### Naming

- Test function names are `snake_case`, describe the scenario, and avoid
  generic names like `test1`. Examples already in the tree:
  `splits_underscore_and_dash`, `binary_detection_via_nul`,
  `missing_severity_defaults_to_info`.
- The test module is conventionally named `mod tests` (one file in the tree
  uses `mod tokenize_tests` for clarity when the file has multiple
  unrelated helper groups — both are fine).

## Coverage requirements

**None configured.** There is no `cargo-tarpaulin`, `cargo-llvm-cov`, or
similar coverage tooling wired into the repo or CI, and no minimum
coverage threshold is enforced. Adding coverage measurement is an open
opportunity — see the recommendations below.

## CI integration

The only workflow in the repo is `.github/workflows/release.yml`. It is
triggered on `v*` tag pushes and `workflow_dispatch`, builds the Tauri
desktop app on macOS (Apple Silicon + Intel), Windows, and Linux, and
publishes the GitHub release. Its single correctness step is:

```yaml
- name: Typecheck
  run: pnpm type-check
```

It does **not** run `cargo test`, `cargo clippy`, `cargo fmt --check`, or
any frontend tests. Until that changes, contributors should run
`cargo test --workspace` and `pnpm type-check` locally before opening a PR.

There is no PR-triggered CI workflow at the time of writing.

## Manual QA loop for the desktop app

Because the end-to-end path (Tauri shell ↔ Rust commands ↔ SQLite ↔ Three.js
city) has no automated coverage, the manual loop below is the de-facto
acceptance test. Run it before shipping anything that touches the analysis
pipeline, the 3D scene, or persistence.

1. **Start the desktop app in dev mode.**

   ```bash
   pnpm install            # only needed once
   pnpm desktop            # alias for `tauri dev`
   ```

   This launches the Next.js dev server on port 3000 and opens the Tauri
   window pointed at it. Hot reload works for the frontend; Rust changes
   trigger a recompile.

2. **Pick a project to analyze.** Use the in-app picker to open a local
   repository. Good smoke-test targets:
   - This repo (`/Users/<you>/.../codecity`) — small, mixed Rust + TS.
   - A medium TypeScript repo (e.g. one of your own Next.js projects).
   - A repo containing files that should be skipped (`node_modules`,
     `*.lock`, `*.min.js`, binary blobs) — verifies the discovery filters
     covered by `discovery.rs` unit tests are wired through correctly.

3. **Watch the analysis pipeline.** Confirm progress events arrive in the
   UI, that cancellation works (start a scan, cancel it, verify the
   process exits cleanly — this exercises the code that the
   `cancellation.rs` unit tests model).

4. **Verify the city renders.** The Three.js scene should populate with
   buildings/districts, hover tooltips should resolve, and selecting a
   building should open the file in the side panel.

5. **Verify persistence.** Quit the app, relaunch, and confirm the most
   recent analysis is still available (data lives in the SQLite store
   exercised by `src-tauri/src/analysis/db.rs`).

6. **Run the security scan** (if your change touches it). Trigger the
   security panel; confirm Opengrep findings appear with the correct
   severity grouping. This is the user-visible side of the
   `pipeline/security.rs` and `pipeline/security_types.rs` code.

7. **Production build smoke test.** Before tagging a release:

   ```bash
   pnpm build:desktop      # tauri build --debug --no-bundle
   ```

   This catches build-time issues that `tauri dev` masks (release-mode
   feature flags, missing `tauri.conf.json` capabilities, etc.).

Record anything that broke in the PR description so reviewers know which
parts of the manual loop you actually exercised.

## Recommended testing patterns going forward

The current setup is fine for a young codebase, but here is the shortlist of
high-leverage additions, roughly in priority order:

1. **Add a PR CI workflow** that runs `cargo test --workspace`,
   `cargo clippy --workspace -- -D warnings`, `cargo fmt --all -- --check`,
   and `pnpm type-check`. This alone would prevent the largest class of
   regressions today.
2. **Add integration tests for the analysis pipeline** under
   `crates/codecity-core/tests/`. Drive `analyze` against a tiny fixture
   project committed to the repo and assert on the resulting snapshot
   shape — this is the highest-value untested code path.
3. **Add tests for Tauri command handlers** in `src-tauri/src/` so the
   IPC surface the frontend depends on has at least a contract test.
   Tauri 2 supports unit-testing command functions directly without
   spinning up a window.
4. **Wire up a frontend test runner.** Vitest pairs well with Next.js +
   React Testing Library and would let us cover the Zustand stores,
   React Query hooks, and pure presentational components without
   needing a real browser.
5. **Add an end-to-end smoke test** (Playwright against the Next.js dev
   server, or `tauri-driver` against a built binary) that runs the
   manual QA loop above against a tiny committed fixture repo.
6. **Add coverage reporting** (`cargo llvm-cov`) once there are enough
   tests for coverage numbers to be meaningful, and set a soft baseline
   in CI rather than a hard threshold.

When you act on any of these, update this document and the relevant
section of `ARCHITECTURE.md` so the state-of-the-world stays honest.
