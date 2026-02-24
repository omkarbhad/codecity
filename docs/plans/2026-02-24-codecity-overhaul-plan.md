# CodeCity Overhaul Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Wire up the real analysis pipeline, add multi-language support (Python, CSS, etc.), rebuild UI with Shadcn V2 Mira, add road-style dependency pipes, fix performance, and bypass auth.

**Architecture:** Keep existing Next.js 15 + R3F monorepo. Extend the analysis pipeline with new parsers for Python (regex AST) and generic files (CSS, JSON, Go, etc.). Replace mock API routes with real Prisma DB calls backed by an in-memory cache. Rebuild all UI panels using Shadcn Mira components. Replace per-file meshes with InstancedMesh. Ground-level CatmullRom dependency roads.

**Tech Stack:** Next.js 15, React 19, Three.js/R3F, Prisma (PostgreSQL), ts-morph, Shadcn V2 Mira, Tailwind CSS 4, @tanstack/react-query

---

## Task 1: Auth Bypass + Environment Setup

**Files:**
- Modify: `apps/web/src/middleware.ts` (lines 1-33)
- Modify: `apps/web/src/app/providers.tsx` (lines 1-8)
- Modify: `apps/web/src/auth.ts`
- Create: `apps/web/.env.local`

**Step 1: Update middleware to support SKIP_AUTH**

In `apps/web/src/middleware.ts`, replace the entire file:

```typescript
import NextAuth from "next-auth"
import authConfig from "./auth.config"

const { auth } = NextAuth(authConfig)

export default auth((req) => {
  const skipAuth = process.env.SKIP_AUTH === "true"
  const isLoggedIn = !!req.auth || skipAuth
  const { pathname } = req.nextUrl

  // Protected routes — require login (or SKIP_AUTH)
  if (pathname.startsWith("/dashboard") && !isLoggedIn) {
    return Response.redirect(new URL("/login", req.nextUrl))
  }
  if (pathname.startsWith("/admin") && !isLoggedIn) {
    return Response.redirect(new URL("/login", req.nextUrl))
  }
  if (pathname.startsWith("/analyze") && !isLoggedIn) {
    return Response.redirect(new URL("/login", req.nextUrl))
  }

  // Redirect logged-in users away from login page
  if (pathname === "/login" && isLoggedIn) {
    return Response.redirect(new URL("/dashboard", req.nextUrl))
  }
})

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}
```

**Step 2: Create .env.local with SKIP_AUTH**

Create `apps/web/.env.local`:
```
SKIP_AUTH=true
GITHUB_TOKEN=
DATABASE_URL="postgresql://localhost:5432/codecity?schema=public"
```

**Step 3: Update providers to handle mock session**

In `apps/web/src/app/providers.tsx`, update to provide a mock session when SKIP_AUTH is set. The `SessionProvider` from next-auth will work with no session — the middleware bypass handles the routing. No change needed here beyond ensuring it doesn't crash without a real session.

**Step 4: Update API routes to handle SKIP_AUTH**

Create a helper function for API auth that respects SKIP_AUTH. Create `apps/web/src/lib/auth-helpers.ts`:

```typescript
import { auth } from "@/auth"

const MOCK_USER = {
  id: "dev-user",
  name: "Dev User",
  email: "dev@codecity.local",
  role: "ADMIN" as const,
}

export async function getSessionUser() {
  if (process.env.SKIP_AUTH === "true") {
    return MOCK_USER
  }
  const session = await auth()
  if (!session?.user) return null
  return {
    id: (session.user as any).id ?? "unknown",
    name: session.user.name ?? "User",
    email: session.user.email ?? "",
    role: ((session.user as any).role ?? "USER") as "USER" | "ADMIN",
  }
}
```

**Step 5: Commit**

```bash
git add apps/web/src/middleware.ts apps/web/src/lib/auth-helpers.ts apps/web/.env.local apps/web/src/app/providers.tsx
git commit -m "feat: add auth bypass with SKIP_AUTH env var"
```

---

## Task 2: In-Memory Cache Layer

**Files:**
- Create: `apps/web/src/lib/cache.ts`

**Step 1: Create the cache module**

```typescript
interface CacheEntry<T> {
  data: T
  expiry: number
}

class LRUCache {
  private store = new Map<string, CacheEntry<any>>()
  private maxSize: number

  constructor(maxSize = 100) {
    this.maxSize = maxSize
  }

  get<T>(key: string): T | null {
    const entry = this.store.get(key)
    if (!entry) return null
    if (Date.now() > entry.expiry) {
      this.store.delete(key)
      return null
    }
    // Move to end (most recently used)
    this.store.delete(key)
    this.store.set(key, entry)
    return entry.data as T
  }

  set<T>(key: string, data: T, ttlMs: number): void {
    // Evict oldest if at capacity
    if (this.store.size >= this.maxSize) {
      const oldest = this.store.keys().next().value
      if (oldest) this.store.delete(oldest)
    }
    this.store.set(key, { data, expiry: Date.now() + ttlMs })
  }

  delete(key: string): void {
    this.store.delete(key)
  }

  clear(): void {
    this.store.clear()
  }
}

// Singleton caches
export const analysisCache = new LRUCache(50)    // CitySnapshot cache, 30 min TTL
export const queryCache = new LRUCache(200)       // DB query cache, 60s TTL

export const CACHE_TTL = {
  analysis: 30 * 60 * 1000,  // 30 minutes
  query: 60 * 1000,          // 60 seconds
} as const
```

**Step 2: Commit**

```bash
git add apps/web/src/lib/cache.ts
git commit -m "feat: add in-memory LRU cache for analysis results and queries"
```

---

## Task 3: Extend Types for Multi-Language Support

**Files:**
- Modify: `apps/web/src/lib/types/city.ts` (lines 1-53)
- Modify: `apps/web/src/lib/analysis/parser.ts` (lines 5-15 — ParsedFile interface)

**Step 1: Update city types**

In `apps/web/src/lib/types/city.ts`, replace the full file:

```typescript
export type FileType = "typescript" | "javascript" | "python" | "css" | "config" | "markup" | "other"

export interface CitySnapshot {
  files: FileData[]
  districts: DistrictData[]
  stats: CityStats
}

export interface FileData {
  path: string
  lines: number
  functions: FunctionData[]
  types: TypeData[]
  classes: { name: string }[]
  imports: string[]
  importedBy: string[]
  externalImports: string[]
  decorators: string[]
  complexity: number
  isReactComponent: boolean
  hasUnusedExports: boolean
  fileType: FileType
  position: { x: number; z: number }
  district: string
}

export interface FunctionData {
  name: string
  exported: boolean
  lines: number
}

export interface TypeData {
  name: string
  kind: "type" | "interface" | "enum" | "class" | "decorator" | "selector"
}

export interface DistrictData {
  name: string
  color: string
  files: string[]
  bounds: { x: number; z: number; width: number; depth: number }
}

export interface CityStats {
  totalFiles: number
  totalFunctions: number
  totalLines: number
  totalTypes: number
  totalImports: number
  unusedExports: number
}

export const DISTRICT_COLORS = [
  "#22d3ee", "#34d399", "#4d94ff", "#fbbf24",
  "#a78bfa", "#fb923c", "#f472b6", "#2dd4bf",
  "#84cc16", "#ef4444", "#818cf8", "#f59e0b",
] as const
```

**Step 2: Update ParsedFile interface in parser.ts**

In `apps/web/src/lib/analysis/parser.ts`, update the `ParsedFile` interface (lines 5-15):

```typescript
import type { FileType } from "../types/city"

export interface ParsedFile {
  path: string
  lines: number
  functions: { name: string; exported: boolean; lines: number }[]
  types: { name: string; kind: string }[]
  classes: { name: string }[]
  imports: string[]
  externalImports: string[]
  decorators: string[]
  complexity: number
  isReactComponent: boolean
  hasUnusedExports: boolean
  fileType: FileType
}
```

Also update `parseTypeScriptFile` return to include the new fields (`externalImports`, `decorators`, `fileType`). Extract external imports from import declarations where specifier doesn't start with `.`:

Add after the imports loop (around line 184):
```typescript
// Extract external imports
const externalImports: string[] = []
for (const importDecl of sourceFile.getImportDeclarations()) {
  const specifier = importDecl.getModuleSpecifierValue()
  if (!specifier.startsWith(".") && !specifier.startsWith("..")) {
    externalImports.push(specifier.split("/")[0])
  }
}
```

Add decorator extraction:
```typescript
// Extract decorators
const decorators: string[] = []
for (const fn of sourceFile.getFunctions()) {
  for (const dec of fn.getDecorators()) {
    decorators.push(dec.getName())
  }
}
for (const cls of sourceFile.getClasses()) {
  for (const dec of cls.getDecorators()) {
    decorators.push(dec.getName())
  }
}
```

Set `fileType` based on extension:
```typescript
const ext = filePath.split(".").pop() ?? ""
const fileType: FileType = ["ts", "tsx"].includes(ext) ? "typescript" : "javascript"
```

Update the return statement to include `externalImports`, `decorators`, `fileType`.

**Step 3: Commit**

```bash
git add apps/web/src/lib/types/city.ts apps/web/src/lib/analysis/parser.ts
git commit -m "feat: extend types for multi-language support (fileType, externalImports, decorators)"
```

---

## Task 4: Python Parser

**Files:**
- Create: `apps/web/src/lib/analysis/python-parser.ts`

**Step 1: Create the Python parser**

Full regex-based AST parser for Python files. Handles:
- `def function_name(args) -> ReturnType:` — function extraction with line counting via indent tracking
- `class ClassName(Base):` — class extraction with method detection
- `import x` / `from x import y` / `from . import x` — import extraction (relative + external)
- Complexity: `if/elif/for/while/try/except/with/and/or` counting
- Decorators: `@decorator_name` detection
- Type hints: `-> Type` and `: Type` for type data

```typescript
import type { ParsedFile } from "./parser"
import type { FileType } from "../types/city"

export function parsePythonFile(
  filePath: string,
  content: string,
  allPaths: Set<string>
): ParsedFile {
  const lines = content.split("\n")
  const lineCount = lines.length

  // Functions
  const functions: ParsedFile["functions"] = []
  const funcRegex = /^(\s*)def\s+(\w+)\s*\(/gm
  let match: RegExpExecArray | null

  while ((match = funcRegex.exec(content)) !== null) {
    const indent = match[1].length
    const name = match[2]
    const startLine = content.substring(0, match.index).split("\n").length

    // Find function end by indent level
    let endLine = startLine
    for (let i = startLine; i < lines.length; i++) {
      const line = lines[i]
      if (line.trim() === "") continue
      const lineIndent = line.match(/^(\s*)/)?.[1].length ?? 0
      if (i > startLine && lineIndent <= indent && line.trim() !== "") break
      endLine = i + 1
    }

    // Check if exported (module-level, indent=0, or __all__)
    const exported = indent === 0 && !name.startsWith("_")
    functions.push({ name, exported, lines: endLine - startLine + 1 })
  }

  // Classes
  const classes: { name: string }[] = []
  const classRegex = /^(\s*)class\s+(\w+)/gm
  while ((match = classRegex.exec(content)) !== null) {
    classes.push({ name: match[2] })

    // Also extract methods within this class
    const classIndent = match[1].length
    const classStart = content.substring(0, match.index).split("\n").length
    const methodRegex = /^\s{4,}def\s+(\w+)\s*\(/gm
    const classContent = content.substring(match.index)
    let methodMatch: RegExpExecArray | null
    const innerMethodRegex = new RegExp(`^\\s{${classIndent + 2},}def\\s+(\\w+)\\s*\\(`, "gm")
    while ((methodMatch = innerMethodRegex.exec(classContent)) !== null) {
      const methodName = methodMatch[1]
      if (methodName === "__init__") continue
      functions.push({
        name: `${match[2]}.${methodName}`,
        exported: !methodName.startsWith("_"),
        lines: 5, // approximate
      })
    }
  }

  // Imports
  const imports: string[] = []
  const externalImports: string[] = []

  // from x import y
  const fromImportRegex = /^from\s+([\w.]+)\s+import/gm
  while ((match = fromImportRegex.exec(content)) !== null) {
    const source = match[1]
    if (source.startsWith(".")) {
      // Relative import — resolve path
      const resolved = resolvePythonImport(source, filePath, allPaths)
      if (resolved) imports.push(resolved)
    } else {
      externalImports.push(source.split(".")[0])
    }
  }

  // import x
  const importRegex = /^import\s+([\w.]+)/gm
  while ((match = importRegex.exec(content)) !== null) {
    const source = match[1]
    externalImports.push(source.split(".")[0])
  }

  // Types (type hints)
  const types: ParsedFile["types"] = []
  const typeAliasRegex = /^(\w+)\s*(?::\s*TypeAlias\s*)?=\s*(?:Union|Optional|List|Dict|Tuple|Type|Literal)/gm
  while ((match = typeAliasRegex.exec(content)) !== null) {
    types.push({ name: match[1], kind: "type" })
  }

  // Detect TypedDict, Protocol, NamedTuple as types
  const specialTypeRegex = /class\s+(\w+)\s*\(\s*(?:TypedDict|Protocol|NamedTuple)/g
  while ((match = specialTypeRegex.exec(content)) !== null) {
    types.push({ name: match[1], kind: "interface" })
  }

  // Enums
  const enumRegex = /class\s+(\w+)\s*\(\s*(?:Enum|IntEnum|StrEnum|Flag)/g
  while ((match = enumRegex.exec(content)) !== null) {
    types.push({ name: match[1], kind: "enum" })
  }

  // Decorators
  const decorators: string[] = []
  const decoratorRegex = /^@(\w+)/gm
  while ((match = decoratorRegex.exec(content)) !== null) {
    decorators.push(match[1])
  }

  // Complexity
  const complexityPatterns = /\b(if|elif|else|for|while|try|except|with|and|or|assert)\b/g
  let complexity = 1
  while (complexityPatterns.exec(content) !== null) complexity++

  return {
    path: filePath,
    lines: lineCount,
    functions,
    types,
    classes,
    imports,
    externalImports: [...new Set(externalImports)],
    decorators: [...new Set(decorators)],
    complexity,
    isReactComponent: false,
    hasUnusedExports: false,
    fileType: "python",
  }
}

function resolvePythonImport(
  source: string,
  currentFilePath: string,
  allPaths: Set<string>
): string | null {
  const currentDir = currentFilePath.split("/").slice(0, -1).join("/")
  const dotCount = source.match(/^\.+/)?.[0].length ?? 0
  const modulePart = source.substring(dotCount)

  let base = currentDir
  for (let i = 1; i < dotCount; i++) {
    base = base.split("/").slice(0, -1).join("/")
  }

  const modulePath = modulePart.replace(/\./g, "/")
  const candidates = modulePath
    ? [
        `${base}/${modulePath}.py`,
        `${base}/${modulePath}/__init__.py`,
      ]
    : [`${base}/__init__.py`]

  for (const c of candidates) {
    if (allPaths.has(c)) return c
  }
  return null
}
```

**Step 2: Commit**

```bash
git add apps/web/src/lib/analysis/python-parser.ts
git commit -m "feat: add Python parser with function/class/import/complexity extraction"
```

---

## Task 5: Generic File Parser (CSS, JSON, HTML, Go, Rust, etc.)

**Files:**
- Create: `apps/web/src/lib/analysis/generic-parser.ts`

**Step 1: Create the generic parser**

Handles all non-TS/non-Python files with per-language-family regex extraction:

```typescript
import type { ParsedFile } from "./parser"
import type { FileType } from "../types/city"

function getFileType(ext: string): FileType {
  if (["css", "scss", "less", "sass"].includes(ext)) return "css"
  if (["json", "yaml", "yml", "toml", "ini", "env"].includes(ext)) return "config"
  if (["html", "htm", "xml", "svg", "md", "mdx"].includes(ext)) return "markup"
  if (["js", "jsx", "mjs", "cjs"].includes(ext)) return "javascript"
  return "other"
}

export function parseGenericFile(
  filePath: string,
  content: string,
  allPaths: Set<string>
): ParsedFile {
  const ext = filePath.split(".").pop()?.toLowerCase() ?? ""
  const lines = content.split("\n")
  const lineCount = lines.length
  const fileType = getFileType(ext)

  let functions: ParsedFile["functions"] = []
  let types: ParsedFile["types"] = []
  let classes: { name: string }[] = []
  let imports: string[] = []
  let externalImports: string[] = []
  let complexity = 1
  let isReactComponent = false

  switch (fileType) {
    case "css":
      ({ functions, types, imports, externalImports, complexity } =
        parseCssFile(content, filePath, allPaths))
      break
    case "config":
      ({ functions, types, imports, externalImports } =
        parseConfigFile(content, ext, filePath))
      break
    case "markup":
      ({ functions, imports, externalImports, complexity } =
        parseMarkupFile(content, ext, filePath, allPaths))
      break
    case "javascript":
      ({ functions, types, classes, imports, externalImports, complexity, isReactComponent } =
        parseJavaScriptFile(content, filePath, allPaths))
      break
    default:
      ({ functions, classes, imports, externalImports, complexity } =
        parseOtherLanguage(content, ext, filePath, allPaths))
      break
  }

  return {
    path: filePath,
    lines: lineCount,
    functions,
    types,
    classes,
    imports,
    externalImports: [...new Set(externalImports)],
    decorators: [],
    complexity,
    isReactComponent,
    hasUnusedExports: false,
    fileType,
  }
}

function parseCssFile(content: string, filePath: string, allPaths: Set<string>) {
  const functions: ParsedFile["functions"] = []
  const types: ParsedFile["types"] = []
  const imports: string[] = []
  const externalImports: string[] = []

  // CSS selectors as "functions" (named blocks)
  const selectorRegex = /^([.#][\w-]+(?:\s*[,>+~]\s*[.#]?[\w-]+)*)\s*\{/gm
  let match: RegExpExecArray | null
  while ((match = selectorRegex.exec(content)) !== null) {
    functions.push({ name: match[1].trim(), exported: true, lines: 1 })
  }

  // @import
  const importRegex = /@import\s+(?:url\()?["']([^"']+)["']/g
  while ((match = importRegex.exec(content)) !== null) {
    const src = match[1]
    if (src.startsWith(".") || src.startsWith("/")) {
      const dir = filePath.split("/").slice(0, -1).join("/")
      const resolved = `${dir}/${src}`.replace(/\/\.\//g, "/")
      if (allPaths.has(resolved)) imports.push(resolved)
    } else {
      externalImports.push(src)
    }
  }

  // CSS variables as types
  const varRegex = /--[\w-]+(?=\s*:)/g
  while ((match = varRegex.exec(content)) !== null) {
    types.push({ name: match[0], kind: "type" })
  }

  // SCSS variables
  const scssVarRegex = /\$([\w-]+)\s*:/g
  while ((match = scssVarRegex.exec(content)) !== null) {
    types.push({ name: `$${match[1]}`, kind: "type" })
  }

  // @media queries as complexity
  const mediaCount = (content.match(/@media/g) || []).length
  const nestingDepth = Math.max(...content.split("\n").map(l => {
    let depth = 0, max = 0
    for (const c of l) { if (c === "{") max = Math.max(max, ++depth); if (c === "}") depth-- }
    return max
  }))
  const complexity = 1 + mediaCount + nestingDepth

  return { functions, types, imports, externalImports, complexity }
}

function parseConfigFile(content: string, ext: string, filePath: string) {
  const functions: ParsedFile["functions"] = []
  const types: ParsedFile["types"] = []
  const imports: string[] = []
  const externalImports: string[] = []

  if (ext === "json") {
    try {
      const parsed = JSON.parse(content)
      // Top-level keys as "functions"
      if (typeof parsed === "object" && parsed !== null) {
        for (const key of Object.keys(parsed)) {
          functions.push({ name: key, exported: true, lines: 1 })
        }
        // Extract dependencies for package.json
        if (parsed.dependencies) {
          externalImports.push(...Object.keys(parsed.dependencies))
        }
        if (parsed.devDependencies) {
          externalImports.push(...Object.keys(parsed.devDependencies))
        }
      }
    } catch { /* invalid JSON */ }
  }

  if (ext === "yaml" || ext === "yml") {
    // Top-level keys
    const keyRegex = /^(\w[\w-]*)\s*:/gm
    let match: RegExpExecArray | null
    while ((match = keyRegex.exec(content)) !== null) {
      functions.push({ name: match[1], exported: true, lines: 1 })
    }
  }

  return { functions, types, imports, externalImports }
}

function parseMarkupFile(content: string, ext: string, filePath: string, allPaths: Set<string>) {
  const functions: ParsedFile["functions"] = []
  const imports: string[] = []
  const externalImports: string[] = []

  if (ext === "html" || ext === "htm") {
    // Script tags
    const scriptRegex = /<script[^>]*src=["']([^"']+)["']/g
    let match: RegExpExecArray | null
    while ((match = scriptRegex.exec(content)) !== null) {
      externalImports.push(match[1])
    }
    // Link tags
    const linkRegex = /<link[^>]*href=["']([^"']+\.css[^"']*)["']/g
    while ((match = linkRegex.exec(content)) !== null) {
      const src = match[1]
      if (src.startsWith(".")) {
        const dir = filePath.split("/").slice(0, -1).join("/")
        const resolved = `${dir}/${src}`.replace(/\/\.\//g, "/")
        if (allPaths.has(resolved)) imports.push(resolved)
      }
    }
  }

  if (ext === "md" || ext === "mdx") {
    // Headings as "functions"
    const headingRegex = /^(#{1,6})\s+(.+)/gm
    let match: RegExpExecArray | null
    while ((match = headingRegex.exec(content)) !== null) {
      functions.push({ name: match[2].trim(), exported: true, lines: 1 })
    }
  }

  const complexity = 1

  return { functions, imports, externalImports, complexity }
}

function parseJavaScriptFile(content: string, filePath: string, allPaths: Set<string>) {
  const functions: ParsedFile["functions"] = []
  const types: ParsedFile["types"] = []
  const classes: { name: string }[] = []
  const imports: string[] = []
  const externalImports: string[] = []

  // Functions
  const funcPatterns = [
    /(?:export\s+)?(?:async\s+)?function\s+(\w+)/g,
    /(?:export\s+)?const\s+(\w+)\s*=\s*(?:async\s+)?\(/g,
    /(?:export\s+)?const\s+(\w+)\s*=\s*(?:async\s+)?\w*\s*=>\s*/g,
  ]
  const skip = new Set(["if", "else", "for", "while", "switch", "catch", "return", "import", "from", "require", "constructor"])

  for (const pattern of funcPatterns) {
    let match: RegExpExecArray | null
    while ((match = pattern.exec(content)) !== null) {
      if (!skip.has(match[1]) && match[1].length < 40) {
        const exported = /export\s/.test(content.substring(Math.max(0, match.index - 10), match.index + 5))
        functions.push({ name: match[1], exported, lines: 5 })
      }
    }
  }

  // Classes
  const classRegex = /(?:export\s+)?class\s+(\w+)/g
  let match: RegExpExecArray | null
  while ((match = classRegex.exec(content)) !== null) {
    classes.push({ name: match[1] })
  }

  // Imports
  const importRegex = /import\s+(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)(?:\s*,\s*(?:\{[^}]*\}|\*\s+as\s+\w+|\w+))*\s+from\s+)?['"]([^'"]+)['"]/g
  while ((match = importRegex.exec(content)) !== null) {
    const src = match[1]
    if (src.startsWith(".") || src.startsWith("/")) {
      const dir = filePath.split("/").slice(0, -1).join("/")
      const resolved = `${dir}/${src}`.replace(/\/\.\//g, "/")
      const candidates = [resolved, `${resolved}.js`, `${resolved}.jsx`, `${resolved}/index.js`, `${resolved}/index.jsx`]
      for (const c of candidates) {
        if (allPaths.has(c)) { imports.push(c); break }
      }
    } else {
      externalImports.push(src.split("/")[0])
    }
  }

  // Require
  const requireRegex = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g
  while ((match = requireRegex.exec(content)) !== null) {
    const src = match[1]
    if (!src.startsWith(".")) externalImports.push(src.split("/")[0])
  }

  const complexity = 1 + (content.match(/\b(if|else|for|while|switch|case|catch|&&|\|\||\?\?)\b/g) || []).length
  const isReactComponent = /\b(React\.|JSX\.|useState|useEffect|useRef|useCallback|useMemo|<\w+[\s/>])/.test(content)

  return { functions, types, classes, imports, externalImports, complexity, isReactComponent }
}

function parseOtherLanguage(content: string, ext: string, filePath: string, allPaths: Set<string>) {
  const functions: ParsedFile["functions"] = []
  const classes: { name: string }[] = []
  const imports: string[] = []
  const externalImports: string[] = []

  // Go
  if (ext === "go") {
    const goFuncRegex = /func\s+(?:\(\w+\s+\*?\w+\)\s+)?(\w+)\s*\(/g
    let match: RegExpExecArray | null
    while ((match = goFuncRegex.exec(content)) !== null) {
      const exported = match[1][0] === match[1][0].toUpperCase()
      functions.push({ name: match[1], exported, lines: 5 })
    }
    const goImportRegex = /"([^"]+)"/g
    while ((match = goImportRegex.exec(content)) !== null) {
      externalImports.push(match[1].split("/").pop() ?? match[1])
    }
  }

  // Rust
  if (ext === "rs") {
    const rsFuncRegex = /(?:pub\s+)?fn\s+(\w+)/g
    let match: RegExpExecArray | null
    while ((match = rsFuncRegex.exec(content)) !== null) {
      const exported = content.substring(Math.max(0, match.index - 5), match.index).includes("pub")
      functions.push({ name: match[1], exported, lines: 5 })
    }
    const rsStructRegex = /(?:pub\s+)?struct\s+(\w+)/g
    while ((match = rsStructRegex.exec(content)) !== null) {
      classes.push({ name: match[1] })
    }
    const rsUseRegex = /use\s+([\w:]+)/g
    while ((match = rsUseRegex.exec(content)) !== null) {
      externalImports.push(match[1].split("::")[0])
    }
  }

  // Java / Kotlin
  if (["java", "kt"].includes(ext)) {
    const javaFuncRegex = /(?:public|private|protected|static|\s)+\s+\w+\s+(\w+)\s*\(/g
    let match: RegExpExecArray | null
    while ((match = javaFuncRegex.exec(content)) !== null) {
      if (!["if", "for", "while", "switch", "catch"].includes(match[1])) {
        functions.push({ name: match[1], exported: true, lines: 5 })
      }
    }
    const javaClassRegex = /(?:public\s+)?class\s+(\w+)/g
    while ((match = javaClassRegex.exec(content)) !== null) {
      classes.push({ name: match[1] })
    }
    const javaImportRegex = /import\s+([\w.]+)/g
    while ((match = javaImportRegex.exec(content)) !== null) {
      externalImports.push(match[1].split(".")[0])
    }
  }

  // Ruby
  if (ext === "rb") {
    const rbFuncRegex = /def\s+(\w+)/g
    let match: RegExpExecArray | null
    while ((match = rbFuncRegex.exec(content)) !== null) {
      functions.push({ name: match[1], exported: true, lines: 5 })
    }
    const rbClassRegex = /class\s+(\w+)/g
    while ((match = rbClassRegex.exec(content)) !== null) {
      classes.push({ name: match[1] })
    }
    const rbRequireRegex = /require\s+['"]([^'"]+)['"]/g
    while ((match = rbRequireRegex.exec(content)) !== null) {
      externalImports.push(match[1])
    }
  }

  // PHP
  if (ext === "php") {
    const phpFuncRegex = /function\s+(\w+)\s*\(/g
    let match: RegExpExecArray | null
    while ((match = phpFuncRegex.exec(content)) !== null) {
      functions.push({ name: match[1], exported: true, lines: 5 })
    }
    const phpClassRegex = /class\s+(\w+)/g
    while ((match = phpClassRegex.exec(content)) !== null) {
      classes.push({ name: match[1] })
    }
  }

  // Swift
  if (ext === "swift") {
    const swiftFuncRegex = /func\s+(\w+)/g
    let match: RegExpExecArray | null
    while ((match = swiftFuncRegex.exec(content)) !== null) {
      functions.push({ name: match[1], exported: true, lines: 5 })
    }
    const swiftClassRegex = /(?:class|struct|enum)\s+(\w+)/g
    while ((match = swiftClassRegex.exec(content)) !== null) {
      classes.push({ name: match[1] })
    }
  }

  const complexity = 1 + (content.match(/\b(if|else|for|while|switch|case|catch|match)\b/g) || []).length

  return { functions, classes, imports, externalImports, complexity }
}
```

**Step 2: Commit**

```bash
git add apps/web/src/lib/analysis/generic-parser.ts
git commit -m "feat: add generic parser for CSS, JSON, HTML, Go, Rust, Java, Ruby, PHP, Swift"
```

---

## Task 6: Extend GitHub Fetcher + Wire Parser Dispatch

**Files:**
- Modify: `apps/web/src/lib/analysis/github.ts` (lines 34-48, 50-53, 108-113)
- Modify: `apps/web/src/lib/analysis/parser.ts` (parseAllFiles function, lines 247-300)
- Modify: `apps/web/src/lib/analysis/pipeline.ts` (lines 1-77)
- Modify: `apps/web/src/lib/analysis/layout.ts` (lines 1-197)

**Step 1: Update github.ts file filter**

Replace `SKIP_PATTERNS` (line 35-44) and `isTypeScriptFile` (lines 50-53) and the filter in `fetchRepoTree` (lines 108-113):

```typescript
const SKIP_PATTERNS = [
  "node_modules",
  "dist",
  ".next",
  "__tests__",
  "/test/",
  ".test.",
  ".spec.",
  ".d.ts",
  ".stories.",
  "/build/",
  "/coverage/",
  ".min.",
  "/vendor/",
  "/__pycache__/",
  "/.git/",
]

const SUPPORTED_EXTENSIONS = new Set([
  // TypeScript/JavaScript
  "ts", "tsx", "js", "jsx", "mjs", "cjs",
  // Python
  "py",
  // Stylesheets
  "css", "scss", "less", "sass",
  // Markup
  "html", "htm", "md", "mdx",
  // Config
  "json", "yaml", "yml",
  // Other languages
  "go", "rs", "java", "kt", "rb", "php", "swift",
])

function isSupportedFile(path: string): boolean {
  const ext = path.split(".").pop()?.toLowerCase() ?? ""
  return SUPPORTED_EXTENSIONS.has(ext)
}
```

Update the filter in `fetchRepoTree` to use `isSupportedFile` instead of `isTypeScriptFile`.

**Step 2: Update parseAllFiles with parser dispatch**

In `parser.ts`, update `parseAllFiles` to route files to the correct parser:

```typescript
import { parsePythonFile } from "./python-parser"
import { parseGenericFile } from "./generic-parser"

export function parseAllFiles(
  files: Map<string, string>,
  onProgress?: (progress: number) => void
): ParsedFile[] {
  // ts-morph project for TS files only
  const project = new Project({
    useInMemoryFileSystem: true,
    compilerOptions: {
      allowJs: true,
      jsx: 2,
      target: 99,
      module: 99,
      moduleResolution: 100,
      strict: false,
      noEmit: true,
      skipLibCheck: true,
    },
  })

  const allPaths = new Set(files.keys())
  const parsed: ParsedFile[] = []
  let completed = 0
  const total = files.size

  for (const [filePath, content] of files) {
    const ext = filePath.split(".").pop()?.toLowerCase() ?? ""

    let result: ParsedFile
    if (["ts", "tsx"].includes(ext)) {
      result = parseTypeScriptFile(filePath, content, project, allPaths)
    } else if (ext === "py") {
      result = parsePythonFile(filePath, content, allPaths)
    } else {
      result = parseGenericFile(filePath, content, allPaths)
    }

    parsed.push(result)
    completed++
    onProgress?.(completed / total)
  }

  // Cross-file unused exports detection
  const allImportedPaths = new Set<string>()
  for (const file of parsed) {
    for (const imp of file.imports) {
      allImportedPaths.add(imp)
    }
  }

  for (const file of parsed) {
    const hasExports =
      file.functions.some((f) => f.exported) ||
      file.types.length > 0 ||
      file.classes.length > 0
    if (hasExports && !allImportedPaths.has(file.path)) {
      file.hasUnusedExports = true
    }
  }

  return parsed
}
```

**Step 3: Update layout.ts to handle new fields**

In `layout.ts`, update `layoutCity` to pass through the new fields (`externalImports`, `decorators`, `fileType`):

In the `result.push()` block (around line 162-175), add:
```typescript
externalImports: file.externalImports ?? [],
decorators: file.decorators ?? [],
fileType: file.fileType ?? "other",
```

**Step 4: Update pipeline.ts to handle multi-language**

Update the progress messages in `pipeline.ts` to say "source files" instead of "TypeScript files":

```typescript
// Line 33: change "TypeScript files" to "source files"
onProgress("downloading-files", 0.1, `Found ${tree.length} source files`)

// Line 40-44: change error message
if (tree.length === 0) {
  throw new Error(
    `No supported source files found in ${owner}/${repo}. ` +
    `Supported: TypeScript, JavaScript, Python, CSS, HTML, JSON, Go, Rust, Java, and more.`
  )
}

// Line 58: change "Parsing TypeScript..." to "Parsing source files..."
onProgress("parsing", 0.5, "Parsing source files...")
```

**Step 5: Commit**

```bash
git add apps/web/src/lib/analysis/github.ts apps/web/src/lib/analysis/parser.ts apps/web/src/lib/analysis/layout.ts apps/web/src/lib/analysis/pipeline.ts
git commit -m "feat: extend pipeline for multi-language support (Python, CSS, Go, Rust, etc.)"
```

---

## Task 7: Wire Real API Routes

**Files:**
- Modify: `apps/web/src/app/api/analyze/route.ts` (lines 1-47 — full rewrite)
- Modify: `apps/web/src/app/api/analyze/[id]/progress/route.ts` (lines 1-95 — full rewrite)
- Modify: `apps/web/src/app/api/projects/[id]/snapshot/route.ts` (lines 1-13 — full rewrite)
- Modify: `apps/web/src/app/api/projects/route.ts` (lines 1-96 — full rewrite)
- Modify: `apps/web/src/app/api/projects/[id]/route.ts` (lines 1-57 — full rewrite)
- Modify: `apps/web/src/app/project/[id]/page.tsx` (lines 1-87 — full rewrite)
- Create: `apps/web/src/lib/analysis/progress-store.ts`

**Step 1: Create server-side progress store**

Create `apps/web/src/lib/analysis/progress-store.ts` — in-memory store for pipeline progress per project:

```typescript
export interface ProgressState {
  stage: string
  progress: number
  message: string
  error?: string
  completed: boolean
}

const progressMap = new Map<string, ProgressState>()

export function setProgress(projectId: string, state: ProgressState) {
  progressMap.set(projectId, state)
}

export function getProgress(projectId: string): ProgressState | null {
  return progressMap.get(projectId) ?? null
}

export function clearProgress(projectId: string) {
  progressMap.delete(projectId)
}
```

**Step 2: Rewrite POST /api/analyze**

Replace `apps/web/src/app/api/analyze/route.ts` entirely — validate URL, create a DB project record (or use in-memory fallback), kick off analysis in background, return projectId.

The route should:
1. Validate the repo URL using `parseGitHubUrl`
2. Generate a unique project ID (use `crypto.randomUUID()`)
3. Check the analysis cache — if cached, store immediately and return
4. Start the real `analyzeRepository()` pipeline in a background promise (don't await it)
5. Update progress via `setProgress()` as the pipeline runs
6. On completion, store the result in the analysis cache
7. Return `{ projectId }` immediately

**Step 3: Rewrite GET /api/analyze/[id]/progress SSE**

Replace the mock SSE with a real polling loop that reads from `getProgress(id)`:

```typescript
export const dynamic = "force-dynamic"

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder()

      function send(data: object) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      }

      const interval = setInterval(() => {
        const progress = getProgress(id)
        if (!progress) {
          send({ stage: "pending", progress: 0, message: "Waiting for analysis to start..." })
          return
        }

        send({
          stage: progress.stage,
          progress: Math.round(progress.progress * 100),
          message: progress.message,
        })

        if (progress.completed) {
          send({ stage: "complete", progress: 100, message: "Analysis complete!" })
          clearInterval(interval)
          controller.close()
        }

        if (progress.error) {
          send({ stage: "error", progress: 0, message: progress.error })
          clearInterval(interval)
          controller.close()
        }
      }, 500)

      // Timeout after 5 minutes
      setTimeout(() => {
        clearInterval(interval)
        send({ stage: "error", progress: 0, message: "Analysis timed out" })
        controller.close()
      }, 5 * 60 * 1000)
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  })
}
```

**Step 4: Rewrite GET /api/projects/[id]/snapshot**

Read from analysis cache (keyed by project ID), return the CitySnapshot JSON:

```typescript
import { analysisCache } from "@/lib/cache"

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const snapshot = analysisCache.get(`project:${id}`)
  if (!snapshot) {
    return Response.json({ error: "Snapshot not found" }, { status: 404 })
  }
  return Response.json(snapshot)
}
```

**Step 5: Rewrite /api/projects routes**

Replace mock data with cache-backed storage. Use a simple in-memory project store (Map) since we're not requiring DB setup yet. Store project metadata in `queryCache`.

**Step 6: Rewrite /app/project/[id]/page.tsx**

Remove hardcoded `SAMPLE_CITY_DATA`. Fetch real snapshot from `/api/projects/${id}/snapshot`. Show loading state while fetching. Pass real data to `ProjectVisualization`.

**Step 7: Commit**

```bash
git add apps/web/src/lib/analysis/progress-store.ts apps/web/src/app/api/analyze/ apps/web/src/app/api/projects/ apps/web/src/app/project/
git commit -m "feat: wire real analysis pipeline to API routes with progress tracking"
```

---

## Task 8: Road-Style Dependency Pipes

**Files:**
- Modify: `apps/web/src/components/city/dependency-pipes.tsx` (lines 1-173 — full rewrite)

**Step 1: Rewrite dependency-pipes.tsx with ground-level roads**

Replace the entire file with ground-level L-shaped CatmullRom curves:

Key changes from current implementation:
- `srcPos.y = 0.4` and `tgtPos.y = 0.4` (ground level, not building midpoint)
- Midpoint at `(srcPos.x, 0.4, tgtPos.z)` for L-shaped routing
- CatmullRom tension `0.05` for smooth cornering
- Thicker tubes: solid radius `0.07`, glow radius `0.175`
- 2-3 flow particles per pipe at `t = 0.15, 0.5, 0.85`
- Particle traverse speed: 8 seconds full loop
- Max 20 pipes per selection
- Core opacity `0.65`, glow opacity `0.1`

**Step 2: Commit**

```bash
git add apps/web/src/components/city/dependency-pipes.tsx
git commit -m "feat: road-style ground-level dependency pipes with L-shaped routing"
```

---

## Task 9: Performance — Instanced Buildings

**Files:**
- Create: `apps/web/src/components/city/instanced-buildings.tsx`
- Modify: `apps/web/src/components/city/city-scene.tsx` (replace Building map with InstancedBuildings)

**Step 1: Create instanced-buildings.tsx**

Use `THREE.InstancedMesh` with a single BoxGeometry. For each file:
- Compute transform matrix (position, scale for height/width)
- Set per-instance color from `instanceColor`
- Handle hover/selection via raycasting `instanceId`
- Decorations (antenna, dome, ring, floor lines) still use individual meshes but only for the selected/hovered building

This reduces draw calls from N (one per building) to 1 for the main geometry.

**Step 2: Update city-scene.tsx**

Replace the `{snapshot.files.map(file => <Building />)}` loop with `<InstancedBuildings snapshot={snapshot} />`.

**Step 3: Commit**

```bash
git add apps/web/src/components/city/instanced-buildings.tsx apps/web/src/components/city/city-scene.tsx
git commit -m "perf: replace per-file meshes with InstancedMesh for buildings"
```

---

## Task 10: Performance — Split City Store + Wire Search

**Files:**
- Modify: `apps/web/src/components/city/use-city-store.tsx` (lines 1-64 — full rewrite)
- Modify: `apps/web/src/components/city/search-bar.tsx` (lines 1-47)

**Step 1: Split city store into granular contexts**

Replace single context with 4 separate contexts to prevent cross-concern re-renders:
- `SelectedFileContext` — `selectedFile` + `setSelectedFile`
- `HoveredFileContext` — `hoveredFile` + `setHoveredFile`
- `VisualizationModeContext` — `visualizationMode` + `setVisualizationMode`
- `SearchContext` — `searchQuery` + `setSearchQuery`

Each with its own provider. `CityStoreProvider` composes all 4.

**Step 2: Wire search to building visibility**

In the instanced buildings component, filter instances based on `searchQuery`:
- If query is empty, show all
- If query exists, only show buildings where path, function names, or type names match (case-insensitive)
- Set non-matching instance scale to 0 (effectively hiding them)

**Step 3: Commit**

```bash
git add apps/web/src/components/city/use-city-store.tsx apps/web/src/components/city/search-bar.tsx
git commit -m "perf: split city store into granular contexts, wire search to building visibility"
```

---

## Task 11: UI Overhaul — Shadcn Mira Setup + Global Styles

**Files:**
- Modify: `packages/ui/components.json` (change style to "mira")
- Modify: `packages/ui/src/styles/globals.css` (lines 1-184 — extend)
- Install: additional Shadcn components if needed via CLI

**Step 1: Align Shadcn style to Mira**

Update `packages/ui/components.json` style from `"new-york"` to `"mira"`.

**Step 2: Regenerate Shadcn components with Mira style**

Run: `cd packages/ui && npx shadcn@latest add badge button card dialog dropdown-menu input progress select separator sheet table tabs toggle tooltip --overwrite`

**Step 3: Extend globals.css**

Add glassmorphism utilities, panel styles, and HTML-matching CSS:

```css
/* Glassmorphism panels */
.glass-panel {
  background: rgba(10, 10, 16, 0.92);
  backdrop-filter: blur(12px);
  border: 1px solid theme(--color-border);
  border-radius: 12px;
}

/* Top bar gradient */
.top-bar-gradient {
  background: linear-gradient(180deg, rgba(7,7,12,0.97) 0%, rgba(7,7,12,0) 100%);
  pointer-events: none;
}
.top-bar-gradient > * {
  pointer-events: auto;
}

/* Mode toolbar active state */
.mode-btn-active {
  background: theme(--color-primary);
  color: #fff;
  box-shadow: 0 0 10px theme(--color-primary / 0.35);
}

/* Search input expand on focus */
.search-expand {
  width: 200px;
  transition: width 0.2s ease;
}
.search-expand:focus {
  width: 260px;
  border-color: theme(--color-primary);
  box-shadow: 0 0 0 2px theme(--color-primary / 0.12);
}
```

**Step 4: Commit**

```bash
git add packages/ui/components.json packages/ui/src/styles/globals.css
git commit -m "feat: align Shadcn to Mira style, add glassmorphism and panel utilities"
```

---

## Task 12: UI Overhaul — Visualization Page

**Files:**
- Modify: `apps/web/src/components/city/project-visualization.tsx` (lines 1-86 — full rewrite)
- Create: `apps/web/src/components/city/top-bar.tsx`
- Create: `apps/web/src/components/city/left-panel.tsx`
- Create: `apps/web/src/components/city/side-panel.tsx`
- Create: `apps/web/src/components/city/bottom-bar.tsx`
- Create: `apps/web/src/components/city/city-tooltip.tsx`
- Create: `apps/web/src/components/city/controls-help.tsx`
- Modify: `apps/web/src/components/city/minimap.tsx` (throttle redraws)

**Step 1: Create top-bar.tsx**

Match HTML file's top bar:
- Logo (CC icon + "CodeCity v0.2")
- Repo badge (clickable, shows owner/repo)
- Mode toolbar (5 buttons: Dependencies, Complexity, Unused Code, File Size, Types)
- Search input (monospace, expands on focus)
- Gradient fade background, pointer-events passthrough

**Step 2: Create left-panel.tsx**

Compose: Minimap, DistrictLegend (with fly-to-district), ControlsHelp, FileTree
- Fixed 200px width, glassmorphism
- Legend items clickable (fly camera to district center)

**Step 3: Create side-panel.tsx**

Match HTML file's side panel exactly:
- Header with file name + colored dot + close button
- Stat grid: 2×3 (Lines, Functions, Complexity, Types, Imports, Imported By)
- Flags row (React Component, Potentially Unused, Classes)
- Functions list (monospace, exported badge `⬡`, unused marking `✕`)
- Types list (kind badge)
- Dependencies: clickable tags (imports=blue, importedBy=red, external=purple)
- Slide-in from right, glassmorphism, 340px width

**Step 4: Create bottom-bar.tsx**

Match HTML: centered glassmorphism pill with 6 stats: Files, Functions, Imports, Unused, Lines, Types

**Step 5: Create city-tooltip.tsx**

Fixed position tooltip that follows the mouse cursor. Shows: file name (with colored district dot), line count, function count, type count, complexity.

**Step 6: Create controls-help.tsx**

Small panel showing: LMB Select, RMB Orbit, Scroll Zoom, R Reset

**Step 7: Rewrite project-visualization.tsx**

Compose all new panels into the HTML-matching layout:
```
TopBar (fixed top, gradient)
LeftPanel (fixed left 200px)
CitySceneCanvas (fills remaining space)
SidePanel (fixed right 340px, slide-in on select)
BottomBar (fixed bottom center)
CityTooltip (follows mouse)
```

**Step 8: Throttle minimap**

In minimap.tsx, add a frame counter to only redraw every 10 frames:
```typescript
const frameCount = useRef(0)
useEffect(() => {
  // ... existing code ...
  // Only redraw if frameCount % 10 === 0 or selectedFile changed
})
```

**Step 9: Commit**

```bash
git add apps/web/src/components/city/
git commit -m "feat: rebuild visualization page matching HTML reference layout"
```

---

## Task 13: UI Overhaul — Home Page

**Files:**
- Modify: `apps/web/src/components/home/hero-section.tsx` (lines 1-72)
- Modify: `apps/web/src/components/home/repo-input.tsx` (lines 1-122)
- Modify: `apps/web/src/components/home/feature-cards.tsx` (lines 1-67)
- Modify: `apps/web/src/components/home/footer.tsx` (lines 1-36)

**Step 1: Rebuild hero-section.tsx with Shadcn**

Use Shadcn `Card` for the demo scene container. Clean typography. Match HTML file's landing aesthetic.

**Step 2: Rebuild repo-input.tsx with Shadcn**

Use Shadcn `Input` + `Button` in a flex group. Quick picks as Shadcn `Badge` variant="outline". Error display in a styled container matching HTML's `.landing-error`.

**Step 3: Rebuild feature-cards.tsx with Shadcn**

Shadcn `Card` components with consistent glassmorphism, neon-red accent lines.

**Step 4: Update footer.tsx**

Clean up with Shadcn `Separator`, consistent font treatment.

**Step 5: Commit**

```bash
git add apps/web/src/components/home/
git commit -m "feat: rebuild home page with Shadcn Mira components"
```

---

## Task 14: UI Overhaul — Dashboard

**Files:**
- Modify: `apps/web/src/app/dashboard/page.tsx` (lines 1-60)
- Modify: `apps/web/src/components/dashboard/my-projects-tab.tsx` (lines 1-175)
- Modify: `apps/web/src/components/dashboard/explore-tab.tsx` (lines 1-116)
- Modify: `apps/web/src/components/dashboard/new-analysis-dialog.tsx` (lines 1-135)

**Step 1: Rebuild dashboard page with Shadcn Tabs**

Use Shadcn `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent`. Clean layout with proper spacing.

**Step 2: Rebuild my-projects-tab.tsx**

Shadcn `Card` for project items, `Badge` for status, `DropdownMenu` for actions, `Button` for new analysis.

**Step 3: Rebuild explore-tab.tsx**

Shadcn `Input` for search, `Card` grid for projects. Remove placeholder SVG thumbnails (use colored gradient backgrounds based on district data instead).

**Step 4: Rebuild new-analysis-dialog.tsx**

Shadcn `Dialog`, `DialogContent`, `DialogHeader`, `Input`, `Select`, `Button`. Replace hand-rolled modal with proper Shadcn dialog.

**Step 5: Commit**

```bash
git add apps/web/src/app/dashboard/ apps/web/src/components/dashboard/
git commit -m "feat: rebuild dashboard with Shadcn Mira components"
```

---

## Task 15: UI Overhaul — Analysis Progress Page

**Files:**
- Modify: `apps/web/src/app/analyze/[id]/page.tsx` (lines 1-205)

**Step 1: Rebuild with Shadcn Progress**

Use Shadcn `Progress` component. Match HTML file's landing progress section:
- Accent red progress bar with glow
- Monospace stage labels
- Progress stats display
- Clean error state

Keep the city silhouette animation (it's a nice touch) but clean it up with proper CSS variables.

**Step 2: Commit**

```bash
git add apps/web/src/app/analyze/
git commit -m "feat: rebuild analysis progress page with Shadcn Mira"
```

---

## Task 16: Install React Query + Wire Client Data Fetching

**Files:**
- Modify: `apps/web/package.json` (add @tanstack/react-query)
- Modify: `apps/web/src/app/providers.tsx` (add QueryClientProvider)
- Modify: `apps/web/src/components/dashboard/my-projects-tab.tsx` (use useQuery)
- Modify: `apps/web/src/components/dashboard/explore-tab.tsx` (use useQuery)

**Step 1: Install React Query**

Run: `cd apps/web && pnpm add @tanstack/react-query`

**Step 2: Add QueryClientProvider to providers.tsx**

```typescript
"use client"
import "@/lib/suppress-three-warnings"
import { SessionProvider } from "next-auth/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useState } from "react"

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: { staleTime: 5 * 60 * 1000 },
    },
  }))

  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>{children}</SessionProvider>
    </QueryClientProvider>
  )
}
```

**Step 3: Update dashboard tabs to use useQuery**

Replace `useEffect` + `useState` fetch patterns with `useQuery`:

```typescript
const { data: projects, isLoading } = useQuery({
  queryKey: ["projects", "mine"],
  queryFn: () => fetch("/api/projects").then(r => r.json()),
})
```

**Step 4: Commit**

```bash
git add apps/web/package.json apps/web/src/app/providers.tsx apps/web/src/components/dashboard/
git commit -m "feat: add React Query for client-side data caching"
```

---

## Task 17: Final Integration + Cleanup

**Files:**
- Remove: `apps/web/src/lib/sample-city-data.ts` (no longer needed)
- Update: any remaining imports of `SAMPLE_CITY_DATA`
- Modify: `apps/web/src/components/city/demo-scene.tsx` (keep sample data for homepage demo only)

**Step 1: Remove sample-city-data from non-demo usage**

Search all files importing `SAMPLE_CITY_DATA`. The only legitimate use is in `demo-scene.tsx` for the homepage. Remove it from:
- `api/projects/[id]/snapshot/route.ts` (now reads from cache)
- `app/project/[id]/page.tsx` (now fetches real data)

**Step 2: Verify all mock markers are gone**

Search for `// Mock` comments across the codebase. All API routes should now use real data or cache-backed data.

**Step 3: Test the full flow**

1. Start dev server: `pnpm dev`
2. Navigate to homepage — verify demo scene loads, UI is clean
3. Enter a GitHub URL (e.g., `excalidraw/excalidraw`) — verify analysis starts
4. Watch progress page — verify real SSE progress updates
5. View city visualization — verify real data renders with road-style pipes
6. Click buildings — verify side panel shows real file data
7. Test search — verify buildings filter
8. Test mode switching — verify colors change
9. Check dashboard — verify projects list

**Step 4: Commit**

```bash
git add -A
git commit -m "feat: complete codecity overhaul — real pipeline, multi-lang, road pipes, Shadcn Mira UI"
```

---

## Task Summary

| # | Task | Key Files | Estimated Scope |
|---|------|-----------|----------------|
| 1 | Auth bypass | middleware.ts, auth-helpers.ts | Small |
| 2 | Cache layer | cache.ts | Small |
| 3 | Extended types | city.ts, parser.ts | Small |
| 4 | Python parser | python-parser.ts | Medium |
| 5 | Generic parser | generic-parser.ts | Medium |
| 6 | Pipeline wiring | github.ts, parser.ts, pipeline.ts, layout.ts | Medium |
| 7 | Real API routes | 5 API route files + progress-store.ts + project page | Large |
| 8 | Road-style pipes | dependency-pipes.tsx | Medium |
| 9 | Instanced buildings | instanced-buildings.tsx, city-scene.tsx | Medium |
| 10 | Store split + search | use-city-store.tsx, search-bar.tsx | Medium |
| 11 | Shadcn Mira setup | components.json, globals.css | Small |
| 12 | Visualization page UI | 7 new/modified component files | Large |
| 13 | Home page UI | 4 component files | Medium |
| 14 | Dashboard UI | 4 component files | Medium |
| 15 | Progress page UI | 1 page file | Small |
| 16 | React Query | providers.tsx, dashboard tabs | Small |
| 17 | Integration + cleanup | Remove mocks, test flow | Medium |
