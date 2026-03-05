import { Project, SyntaxKind } from "ts-morph"
import type { SourceFile } from "ts-morph"
import * as path from "path"
import type { FileType, TypeData } from "../types/city"
import { parsePythonFile } from "./python-parser"
import { parseGenericFile } from "./generic-parser"

export interface ParsedFile {
  path: string
  lines: number
  functions: { name: string; exported: boolean; lines: number }[]
  types: TypeData[]
  classes: { name: string }[]
  imports: string[]
  externalImports: string[]
  decorators: string[]
  complexity: number
  isReactComponent: boolean
  hasUnusedExports: boolean
  fileType: FileType
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
  SyntaxKind.ConditionalExpression,
  SyntaxKind.BinaryExpression,
])

/** SyntaxKinds that indicate JSX usage */
const JSX_KINDS = new Set([
  SyntaxKind.JsxElement,
  SyntaxKind.JsxSelfClosingElement,
  SyntaxKind.JsxFragment,
])

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

  return `${resolved}.ts`
}

export function parseTypeScriptFile(
  filePath: string,
  content: string,
  project: Project,
  allPaths: Set<string>
): ParsedFile {
  const ext = filePath.split(".").pop() ?? ""
  const fileType: FileType = ["ts", "tsx"].includes(ext) ? "typescript" : "javascript"

  let sourceFile: SourceFile
  try {
    sourceFile = project.createSourceFile(filePath, content, {
      overwrite: true,
    })
  } catch {
    return {
      path: filePath,
      lines: content.split("\n").length,
      functions: [],
      types: [],
      classes: [],
      imports: [],
      externalImports: [],
      decorators: [],
      complexity: 1,
      isReactComponent: false,
      hasUnusedExports: false,
      fileType,
    }
  }

  const lines = sourceFile.getEndLineNumber()

  // Extract functions
  const functions: ParsedFile["functions"] = []

  for (const fn of sourceFile.getFunctions()) {
    const name = fn.getName() ?? "anonymous"
    const exported = fn.hasExportKeyword() || fn.hasDefaultKeyword()
    const startLine = fn.getStartLineNumber()
    const endLine = fn.getEndLineNumber()
    functions.push({ name, exported, lines: endLine - startLine + 1 })
  }

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

  // Extract types
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

  // Extract classes
  const classes = sourceFile
    .getClasses()
    .map((cls) => ({ name: cls.getName() ?? "Anonymous" }))

  // Extract imports (relative + external)
  const imports: string[] = []
  const externalImports: string[] = []

  for (const importDecl of sourceFile.getImportDeclarations()) {
    const specifier = importDecl.getModuleSpecifierValue()
    if (specifier.startsWith(".") || specifier.startsWith("..")) {
      const resolved = resolveImportPath(specifier, filePath, allPaths)
      if (resolved) {
        imports.push(resolved)
      }
    } else {
      externalImports.push(specifier.split("/")[0])
    }
  }

  // Extract decorators (only classes and class methods have decorators in TS)
  const decorators: string[] = []
  for (const cls of sourceFile.getClasses()) {
    for (const dec of cls.getDecorators()) {
      decorators.push(dec.getName())
    }
    for (const method of cls.getMethods()) {
      for (const dec of method.getDecorators()) {
        decorators.push(dec.getName())
      }
    }
  }

  // Compute complexity
  let complexity = 1
  sourceFile.forEachDescendant((node) => {
    const kind = node.getKind()
    if (COMPLEXITY_KINDS.has(kind)) {
      if (kind === SyntaxKind.BinaryExpression) {
        const opKind = node.getChildAtIndex(1)?.getKind()
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

  // Detect React component
  let isReactComponent = false
  sourceFile.forEachDescendant((node) => {
    if (JSX_KINDS.has(node.getKind())) {
      isReactComponent = true
    }
  })
  if (!isReactComponent) {
    for (const importDecl of sourceFile.getImportDeclarations()) {
      const specifier = importDecl.getModuleSpecifierValue()
      if (specifier === "react" || specifier === "React") {
        isReactComponent = true
        break
      }
    }
  }

  return {
    path: filePath,
    lines,
    functions,
    types,
    classes,
    imports,
    externalImports: [...new Set(externalImports)],
    decorators: [...new Set(decorators)],
    complexity,
    isReactComponent,
    hasUnusedExports: false,
    fileType,
  }
}

function getFileTypeFromExt(ext: string): FileType {
  if (["ts", "tsx"].includes(ext)) return "typescript"
  if (["js", "jsx", "mjs", "cjs"].includes(ext)) return "javascript"
  if (ext === "py") return "python"
  if (["css", "scss", "less", "sass"].includes(ext)) return "css"
  if (["json", "yaml", "yml", "toml", "ini", "env"].includes(ext)) return "config"
  if (["html", "htm", "xml", "svg", "md", "mdx"].includes(ext)) return "markup"
  return "other"
}

export function parseAllFiles(
  files: Map<string, string>,
  onProgress?: (progress: number) => void
): { parsed: ParsedFile[]; warnings: string[] } {
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
  const warnings: string[] = []
  let completed = 0
  const total = files.size

  for (const [filePath, content] of files) {
    const ext = filePath.split(".").pop()?.toLowerCase() ?? ""

    try {
      let result: ParsedFile
      if (["ts", "tsx"].includes(ext)) {
        result = parseTypeScriptFile(filePath, content, project, allPaths)
      } else if (ext === "py") {
        result = parsePythonFile(filePath, content, allPaths)
      } else {
        result = parseGenericFile(filePath, content, allPaths)
      }
      parsed.push(result)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.warn(`Parse error for ${filePath}: ${msg}`)
      warnings.push(`${filePath}: ${msg}`)
      parsed.push({
        path: filePath,
        lines: content.split("\n").length,
        functions: [],
        types: [],
        classes: [],
        imports: [],
        externalImports: [],
        decorators: [],
        complexity: 1,
        isReactComponent: false,
        hasUnusedExports: false,
        fileType: getFileTypeFromExt(ext),
      })
    }

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

  return { parsed, warnings }
}
