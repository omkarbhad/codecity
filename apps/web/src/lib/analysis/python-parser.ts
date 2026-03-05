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

    const exported = indent === 0 && !name.startsWith("_")
    functions.push({ name, exported, lines: endLine - startLine + 1 })
  }

  // Classes
  const classes: { name: string }[] = []
  const classRegex = /^(\s*)class\s+(\w+)/gm
  while ((match = classRegex.exec(content)) !== null) {
    classes.push({ name: match[2] })

    const classIndent = match[1].length
    const classContent = content.substring(match.index)
    const innerMethodRegex = new RegExp(`^\\s{${classIndent + 2},}def\\s+(\\w+)\\s*\\(`, "gm")
    let methodMatch: RegExpExecArray | null
    while ((methodMatch = innerMethodRegex.exec(classContent)) !== null) {
      const methodName = methodMatch[1]
      if (methodName === "__init__") continue
      functions.push({
        name: `${match[2]}.${methodName}`,
        exported: !methodName.startsWith("_"),
        lines: 5,
      })
    }
  }

  // Imports
  const imports: string[] = []
  const externalImports: string[] = []

  const fromImportRegex = /^from\s+([\w.]+)\s+import/gm
  while ((match = fromImportRegex.exec(content)) !== null) {
    const source = match[1]
    if (source.startsWith(".")) {
      const resolved = resolvePythonImport(source, filePath, allPaths)
      if (resolved) imports.push(resolved)
    } else {
      externalImports.push(source.split(".")[0])
    }
  }

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

  const specialTypeRegex = /class\s+(\w+)\s*\(\s*(?:TypedDict|Protocol|NamedTuple)/g
  while ((match = specialTypeRegex.exec(content)) !== null) {
    types.push({ name: match[1], kind: "interface" })
  }

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
