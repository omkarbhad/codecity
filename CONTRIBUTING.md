# Contributing to CodeCity

Thanks for your interest in contributing to CodeCity! This guide will help you get started.

## Getting Started

1. **Fork** the repository on GitHub
2. **Clone** your fork locally:
   ```bash
   git clone https://github.com/<your-username>/codecity.git
   cd codecity
   ```
3. **Install dependencies:**
   ```bash
   pnpm install
   ```
4. **Set up environment variables:**
   ```bash
   cp .env.example .env.local
   # Fill in the required values (see README for details)
   ```
5. **Start the dev server:**
   ```bash
   pnpm dev
   ```

## Development Workflow

1. Create a branch from `main`:
   ```bash
   git checkout -b feature/your-feature
   ```
2. Make your changes
3. Ensure type checking passes:
   ```bash
   pnpm type-check
   ```
4. Build to verify nothing is broken:
   ```bash
   pnpm build
   ```
5. Commit your changes (see [Commit Convention](#commit-convention))
6. Push to your fork and open a Pull Request

## Project Structure

This is a **Turborepo monorepo** with pnpm workspaces:

| Path | Description |
|---|---|
| `apps/web` | Next.js 15 frontend + API routes |
| `apps/mcp-server` | MCP server for AI integrations |
| `packages/core` | Analysis engine (AST parsing, dependency graphs) |
| `packages/ui` | Shared component library (shadcn/ui based) |

## Commit Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add commit timeline to visualization
fix: correct building height calculation for empty files
refactor: extract dependency parser into core package
style: update glassmorphic panel borders
docs: add environment variable documentation
```

**Prefixes:** `feat`, `fix`, `refactor`, `style`, `docs`, `test`, `chore`

## Pull Requests

- **Open an issue first** for non-trivial changes to discuss the approach
- Keep PRs focused — one feature or fix per PR
- Include a clear description of what changed and why
- Add screenshots for UI changes
- Ensure `pnpm type-check` and `pnpm build` pass

## Code Style

- **TypeScript** is required for all code
- **Tailwind CSS v4** for styling — use design tokens, avoid arbitrary values
- **Server Components by default** — only add `'use client'` when necessary
- Follow existing patterns in the codebase for consistency

## Areas for Contribution

Here are some good first areas to contribute to:

- **Language parsers** — Add support for new languages in `packages/core`
- **3D visualization** — Improve building aesthetics, add new visual mappings
- **Accessibility** — Improve keyboard navigation and screen reader support
- **Documentation** — Improve inline docs, add JSDoc comments
- **Bug fixes** — Check the [issues](https://github.com/omkarbhad/codecity/issues) tab

## Questions?

Open an issue or start a discussion on GitHub. We're happy to help!

---

Thank you for contributing!
