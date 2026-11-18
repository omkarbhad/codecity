// Helpers shared by the editor: language ids, function lookup, GitHub links.

export function getLang(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase() ?? ""
  const map: Record<string, string> = {
    ts: "typescript", tsx: "typescript", js: "javascript", jsx: "javascript",
    py: "python", rs: "rust", go: "go", java: "java", c: "c", cpp: "cpp",
    h: "c", hpp: "cpp", cu: "cpp", cuh: "cpp", ptx: "asm", ll: "llvm",
    hlsl: "glsl", wgsl: "glsl", css: "css", scss: "css", html: "html", json: "json",
    md: "markdown", mdx: "mdx", yaml: "yaml", yml: "yaml", toml: "toml", sh: "bash",
    zsh: "bash", rb: "ruby", php: "php", swift: "swift", kt: "kotlin",
  }
  return map[ext] ?? "text"
}

// Find the line number where a function is defined
export function findFunctionLine(code: string, functionName: string, lang: string): number | null {
  const lines = code.split("\n")

  // Language-specific patterns
  const patterns: RegExp[] = []

  if (["typescript", "javascript"].includes(lang)) {
    patterns.push(
      new RegExp(`\\bfunction\\s+${escapeRegex(functionName)}\\b`),
      new RegExp(`\\b${escapeRegex(functionName)}\\s*[:=]\\s*(?:async\\s+)?(?:function|\\()`),
      new RegExp(`\\b(?:const|let|var)\\s+${escapeRegex(functionName)}\\s*=`),
      new RegExp(`\\b${escapeRegex(functionName)}\\s*\\(`),
      new RegExp(`\\bexport\\s+(?:default\\s+)?(?:async\\s+)?function\\s+${escapeRegex(functionName)}\\b`),
    )
  } else if (lang === "python") {
    patterns.push(new RegExp(`^\\s*(?:async\\s+)?def\\s+${escapeRegex(functionName)}\\b`))
  } else if (lang === "go") {
    patterns.push(new RegExp(`^func\\s+(?:\\(.*?\\)\\s+)?${escapeRegex(functionName)}\\b`))
  } else if (lang === "rust") {
    patterns.push(new RegExp(`\\bfn\\s+${escapeRegex(functionName)}\\b`))
  } else {
    patterns.push(new RegExp(`\\b${escapeRegex(functionName)}\\s*\\(`))
  }

  for (let i = 0; i < lines.length; i++) {
    for (const pat of patterns) {
      if (pat.test(lines[i])) return i
    }
  }

  return null
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

export function cleanErrorMessage(message: string): string {
  return message.replace(/\s+\(-?\d+\)$/, "")
}

export function getGitHubFileUrl(repoUrl: string, filePath: string, line: number | null): string | null {
  if (!/^https?:\/\/(www\.)?github\.com\//.test(repoUrl)) return null
  return `${repoUrl.replace(/\.git$/, "")}/blob/HEAD/${filePath}${line !== null ? `#L${line + 1}` : ""}`
}

