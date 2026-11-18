<!-- generated-by: gsd-doc-writer -->
# Contributing to CodeCity

Thanks for your interest in contributing. CodeCity is a Tauri desktop app
with a Next.js frontend and a Rust backend (workspace crates plus the Tauri
shell). This document covers how to file issues, the development workflow,
the lint/format checks we run, and the licensing rules to follow.

## Code of Conduct

This repository does not yet ship a `CODE_OF_CONDUCT.md`. In the meantime,
please be respectful in issues, pull requests, and review discussions. Bad
faith, harassment, or personal attacks will not be tolerated and may result
in a contribution being closed without further review.

## Reporting Issues

Issues are tracked on GitHub at
<https://github.com/omkarbhad/codecity/issues>. No issue templates are
configured yet, so please include the following yourself:

- **Summary** — one sentence describing the bug or feature request.
- **Steps to reproduce** — a minimal sequence that triggers the problem.
- **Expected vs. actual behavior** — what you thought would happen, and what
  did.
- **Environment** — OS and version, app version (`package.json` and the
  Cargo workspace are pinned to the same version, currently `0.1.1`), and
  whether you are running `pnpm dev` (web) or `pnpm desktop` (Tauri).
- **Logs / screenshots** — relevant console output, Rust panics, or UI
  screenshots for visual bugs.

For security-sensitive reports, please open a private channel with the
maintainers rather than filing a public issue.

## Development Setup

Prerequisites and full local-setup instructions live in `README.md` and the
companion docs. The short form:

```bash
pnpm install              # installs JS deps (pnpm 9.15.0, pinned in package.json)
pnpm dev                  # Next.js dev server on :3000
pnpm desktop              # Tauri desktop shell (Rust + WebView)
```

The Rust workspace is rooted at `Cargo.toml` and contains the crates
`codecity-core`, `codecity-cli`, `codecity-mcp`, and the Tauri shell at
`src-tauri/`. Rust edition is `2021`, license is `MIT`.

## Branch & PR Workflow

- Branch off `main`. Use short, descriptive names. Recent practice in this
  repo uses topic-style prefixes such as `feat/security-scan`,
  `fix/<area>`, or `docs/<area>`.
- Keep each PR focused on a single concern. Split unrelated changes into
  separate PRs — they are easier to review and revert.
- Rebase rather than merge `main` into your branch when you need to update
  it, so history stays linear.
- Include screenshots or short clips for any UI change in the city view,
  dashboard, or sidebars.
- Run all the checks listed in [Code Style & Checks](#code-style--checks)
  locally before opening the PR.
- Reference any related issue with `Closes #N` or `Refs #N` in the PR
  description.

## Commit Message Style

The project uses [Conventional Commits](https://www.conventionalcommits.org/)
with optional scopes. The recent `git log` shows the established prefixes
in use:

- `feat:`, `feat(<scope>):` — new functionality (e.g., `feat(security):
  security sidebar and scan button`).
- `fix:`, `fix(<scope>):` — bug fixes (e.g., `fix(mcp): identify server as
  codecity-mcp instead of rmcp`).
- `docs:`, `docs(<scope>):` — documentation only (e.g., `docs: add opengrep
  LGPL-2.1 third-party license notice`).
- `refactor:`, `refactor(<scope>):` — code restructuring without behavior
  change.
- `perf:`, `perf(<scope>):` — performance improvements.
- `chore:`, `chore(<scope>):` — build, deps, release housekeeping.
- `ci:` — changes to GitHub Actions or other CI config.

Scopes seen in history include `security`, `mcp`, `core`, `cli`, `db`,
`network`, `ui`, `deps`, `release`, and `zig`. Reuse an existing scope when
your change fits one; introduce a new scope only when it genuinely names a
new area of the codebase.

Keep the subject line under ~72 characters, written in the imperative mood,
with no trailing period.

## Code Style & Checks

There is no `.eslintrc`, `.prettierrc`, `biome.json`, or `rustfmt.toml`
committed at the time of writing, so the formatters use their default
configurations. Run the following before pushing:

### TypeScript / Next.js

```bash
pnpm lint            # tsc --noEmit on the main app
pnpm lint:homepage   # tsc --noEmit on homepage/
pnpm type-check      # alias for tsc --noEmit
pnpm build           # next build — catches build-time errors
```

`pnpm lint` is currently a TypeScript no-emit type-check rather than ESLint
— treat type errors as build-breaking.

### Rust

Run these from the repo root (the workspace covers all crates):

```bash
cargo fmt --all -- --check     # format check; drop --check to apply
cargo clippy --workspace --all-targets -- -D warnings
cargo check --workspace
```

For Tauri-specific changes you can also exercise the desktop build:

```bash
pnpm build:desktop    # tauri build --debug --no-bundle
```

Heavy analysis should live in Rust (`crates/codecity-core` and friends).
Keep TypeScript focused on UI and thin Tauri command wrappers — see
`docs/ARCHITECTURE.md` for the boundary.

## Adding a New Language or Tool

CodeCity's analysis pipeline is centered in `crates/codecity-core`. When
adding support for a new language or external tool, do all of the following:

1. **Parser registration** — wire up the relevant tree-sitter grammar (or
   sidecar tool) inside `crates/codecity-core`. Keep grammar selection
   data-driven; do not hard-code paths into the UI layer.
2. **Import / symbol resolution** — extend the resolver and graph builders
   in `codecity-core` so the new language flows into the same network and
   city-layout pipeline used by everything else.
3. **CLI surface** — if the change affects analysis output, ensure
   `crates/codecity-cli` still produces a valid snapshot.
4. **MCP surface** — if it changes the snapshot shape, update
   `crates/codecity-mcp` and its tool descriptions so agents see consistent
   data.
5. **Sidecar binaries** — if you bundle an external tool (the way
   `opengrep` is bundled today), declare it in `src-tauri/tauri.conf.json`
   under `bundle.externalBin`, scope shell permissions in
   `src-tauri/capabilities/`, and include its upstream license under
   `licenses/` (see [Third-Party Licenses](#third-party-licenses)).
6. **Docs** — update `docs/ARCHITECTURE.md` and, if user-facing,
   `docs/CONFIGURATION.md` and `README.md`.

## Third-Party Licenses

CodeCity itself is MIT-licensed (`LICENSE` at the repo root). The bundled
[opengrep](https://github.com/opengrep/opengrep) sidecar is distributed
under **LGPL-2.1**; its license text is shipped at
`licenses/LICENSE.opengrep` and bundled into Tauri builds via
`bundle.resources` in `src-tauri/tauri.conf.json`. When updating or
replacing opengrep, keep this license file in sync with the upstream
release and verify the bundle configuration still references it.

When adding any new third-party binary or library with a copyleft or
attribution-required license:

- Place the upstream license text under `licenses/` (named
  `LICENSE.<tool>` to match the existing convention).
- Reference it from `bundle.resources` in `src-tauri/tauri.conf.json` if it
  ships in the installer.
- Note the dependency and its license in your PR description.

## Questions

If you are unsure whether a change fits, open a draft PR or a discussion
issue early. Small, iterative reviews beat large surprise patches.
