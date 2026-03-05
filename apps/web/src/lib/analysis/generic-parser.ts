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

  // CSS selectors as "functions"
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
      if (typeof parsed === "object" && parsed !== null) {
        for (const key of Object.keys(parsed)) {
          functions.push({ name: key, exported: true, lines: 1 })
        }
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
    const scriptRegex = /<script[^>]*src=["']([^"']+)["']/g
    let match: RegExpExecArray | null
    while ((match = scriptRegex.exec(content)) !== null) {
      externalImports.push(match[1])
    }
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
