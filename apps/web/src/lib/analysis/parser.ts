import { Project, SyntaxKind } from "ts-morph"
import type { SourceFile } from "ts-morph"
import * as path from "path"

export interface ParsedFile {
  path: string
  lines: number
  functions: { name: string; exported: boolean; lines: number }[]
  types: { name: string; kind: "type" | "interface" | "enum" }[]
  classes: { name: string }[]
  imports: string[]
  complexity: number
  isReactComponent: boolean
  hasUnusedExports: boolean
}

/** SyntaxKinds that contribute to cyclomatic complexity */
const COMPLEXITY_KINDS = new Set([
  SyntaxKind.IfStatement,
  SyntaxKind.ForStatement,
  SyntaxKind.ForInStatement,
  SyntaxKind.ForOfStatement,
  SyntaxKind.WhileStatement,
  SyntaxKind.DoStatement,
  SyntaxKind.CaseClause,
  SyntaxKind.CatchClause,
  SyntaxKind.ConditionalExpression, // ternary
  SyntaxKind.BinaryExpression, // checked for && and ||
])

/** SyntaxKinds that indicate JSX usage */
const JSX_KINDS = new Set([
  SyntaxKind.JsxElement,
  SyntaxKind.JsxSelfClosingElement,
  SyntaxKind.JsxFragment,
])

/**
 * Resolve a relative import specifier to a normalized file path.
 * E.g., "./foo" from "src/bar/baz.ts" resolves to "src/bar/foo"
 */
function resolveImportPath(
  importSpecifier: string,
  currentFilePath: string,
  allPaths: Set<string>
): string | null {
  if (!importSpecifier.startsWith(".")) {
    return null
  }

  const currentDir = path.posix.dirname(currentFilePath)
  const resolved = path.posix.normalize(
    path.posix.join(currentDir, importSpecifier)
  )

  // Try exact matches with extensions, then index files
  const candidates = [
    resolved,
    `${resolved}.ts`,
    `${resolved}.tsx`,
    `${resolved}/index.ts`,
    `${resolved}/index.tsx`,
  ]

  for (const candidate of candidates) {
    if (allPaths.has(candidate)) {
      return candidate
    }
  }

  // Return the resolved path with .ts as best guess
  return `${resolved}.ts`
}

/**
 * Parse a single TypeScript file and extract structural information.
 */
export function parseTypeScriptFile(
  filePath: string,
  content: string,
  project: Project,
  allPaths: Set<string>
): ParsedFile {
  let sourceFile: SourceFile
  try {
    sourceFile = project.createSourceFile(filePath, content, {
      overwrite: true,
    })
  } catch {
    // If file creation fails, return minimal data
    return {
      path: filePath,
      lines: content.split("\n").length,
      functions: [],
      types: [],
      classes: [],
      imports: [],
      complexity: 1,
      isReactComponent: false,
      hasUnusedExports: false,
    }
  }

  const lines = sourceFile.getEndLineNumber()

  // 1. Extract functions (top-level + class methods)
  const functions: ParsedFile["functions"] = []

  for (const fn of sourceFile.getFunctions()) {
    const name = fn.getName() ?? "anonymous"
    const exported =
      fn.hasExportKeyword() || fn.hasDefaultKeyword()
    const startLine = fn.getStartLineNumber()
    const endLine = fn.getEndLineNumber()
    functions.push({ name, exported, lines: endLine - startLine + 1 })
  }

  // Also extract arrow functions / const declarations that are exported function expressions
  for (const varStmt of sourceFile.getVariableStatements()) {
    const isExported = varStmt.hasExportKeyword()
    for (const decl of varStmt.getDeclarations()) {
      const initializer = decl.getInitializer()
      if (initializer) {
        const kind = initializer.getKind()
        if (
          kind === SyntaxKind.ArrowFunction ||
          kind === SyntaxKind.FunctionExpression
        ) {
          const name = decl.getName()
          const startLine = decl.getStartLineNumber()
          const endLine = decl.getEndLineNumber()
          functions.push({
            name,
            exported: isExported,
            lines: endLine - startLine + 1,
          })
        }
      }
    }
  }

  // Class methods
  for (const cls of sourceFile.getClasses()) {
    for (const method of cls.getMethods()) {
      const name = `${cls.getName() ?? "Anonymous"}.${method.getName()}`
      const startLine = method.getStartLineNumber()
      const endLine = method.getEndLineNumber()
      functions.push({
        name,
        exported: false,
        lines: endLine - startLine + 1,
      })
    }
  }

  // 2. Extract types
  const types: ParsedFile["types"] = []

  for (const ta of sourceFile.getTypeAliases()) {
    types.push({ name: ta.getName(), kind: "type" })
  }
  for (const iface of sourceFile.getInterfaces()) {
    types.push({ name: iface.getName(), kind: "interface" })
  }
  for (const en of sourceFile.getEnums()) {
    types.push({ name: en.getName(), kind: "enum" })
  }

  // 3. Extract classes
  const classes = sourceFile
    .getClasses()
    .map((cls) => ({ name: cls.getName() ?? "Anonymous" }))

  // 4. Extract imports (only relative)
  const imports: string[] = []
  for (const importDecl of sourceFile.getImportDeclarations()) {
    const specifier = importDecl.getModuleSpecifierValue()
    if (specifier.startsWith(".") || specifier.startsWith("..")) {
      const resolved = resolveImportPath(specifier, filePath, allPaths)
      if (resolved) {
        imports.push(resolved)
      }
    }
  }

  // 5. Compute complexity
  let complexity = 1 // base complexity
  sourceFile.forEachDescendant((node) => {
    const kind = node.getKind()
    if (COMPLEXITY_KINDS.has(kind)) {
      if (kind === SyntaxKind.BinaryExpression) {
        const opKind = node
          .getChildAtIndex(1)
          ?.getKind()
        if (
          opKind === SyntaxKind.AmpersandAmpersandToken ||
          opKind === SyntaxKind.BarBarToken
        ) {
          complexity++
        }
      } else {
        complexity++
      }
    }
  })

  // 6. Detect React component
  let isReactComponent = false

  // Check for JSX syntax
  sourceFile.forEachDescendant((node) => {
    if (JSX_KINDS.has(node.getKind())) {
      isReactComponent = true
    }
  })

  // Also check for React import
  if (!isReactComponent) {
    for (const importDecl of sourceFile.getImportDeclarations()) {
      const specifier = importDecl.getModuleSpecifierValue()
      if (specifier === "react" || specifier === "React") {
        isReactComponent = true
        break
      }
    }
  }

  // 7. hasUnusedExports: set false initially, resolved in batch step
  const hasUnusedExports = false

  return {
    path: filePath,
    lines,
    functions,
    types,
    classes,
    imports,
    complexity,
    isReactComponent,
    hasUnusedExports,
  }
}

/**
 * Parse all files and compute cross-file relationships (unused exports).
 */
export function parseAllFiles(
  files: Map<string, string>,
  onProgress?: (progress: number) => void
): ParsedFile[] {
  const project = new Project({
    useInMemoryFileSystem: true,
    compilerOptions: {
      allowJs: true,
      jsx: 2, // React
      target: 99, // ESNext
      module: 99, // ESNext
      moduleResolution: 100, // Bundler
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
    const result = parseTypeScriptFile(filePath, content, project, allPaths)
    parsed.push(result)
    completed++
    onProgress?.(completed / total)
  }

  // Build a set of all imported paths across all files
  const allImportedPaths = new Set<string>()
  for (const file of parsed) {
    for (const imp of file.imports) {
      allImportedPaths.add(imp)
    }
  }

  // Detect unused exports:
  // A file has unused exports if it has exported declarations
  // but is not imported by any other file
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
