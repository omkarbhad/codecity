"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { X, Loader2, ExternalLink, Copy, Check } from "lucide-react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import rehypeRaw from "rehype-raw"
import { getIconForFile as _getIconForFile } from "vscode-icons-js"
import { useCityStore } from "./use-city-store"
import { getSourceFile } from "@/lib/tauri"

function getFileIcon(name: string): string {
  const icon = _getIconForFile(name) ?? "default_file.svg"
  return icon.includes("_light_") ? icon.replace("_light_", "_") : icon
}

const KNOWN_HTML_TAGS = new Set([
  "a","abbr","address","area","article","aside","audio","b","base","bdi","bdo",
  "blockquote","body","br","button","canvas","caption","cite","code","col",
  "colgroup","data","datalist","dd","del","details","dfn","dialog","div","dl",
  "dt","em","embed","fieldset","figcaption","figure","footer","form","h1","h2",
  "h3","h4","h5","h6","head","header","hgroup","hr","html","i","iframe","img",
  "input","ins","kbd","label","legend","li","link","main","map","mark","menu",
  "meta","meter","nav","noscript","object","ol","optgroup","option","output",
  "p","picture","pre","progress","q","rp","rt","ruby","s","samp","script",
  "search","section","select","slot","small","source","span","strong","style",
  "sub","summary","sup","table","tbody","td","template","textarea","tfoot","th",
  "thead","time","title","tr","track","u","ul","var","video","wbr",
])

// Language detection for syntax highlighting class hints
function getLang(path: string): string {
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

function prepareMarkdownPreview(code: string, lang: string): string {
  if (lang !== "mdx") return code

  return code
    .split("\n")
    .map((line) => {
      if (/^\s*(import|export)\s/.test(line)) {
        return `\`${line.replace(/`/g, "\\`")}\``
      }
      if (/^\s*<\/?[A-Z][\w.:-]*(\s|>|\/>)/.test(line)) {
        return `\`${line.replace(/`/g, "\\`")}\``
      }
      return line
    })
    .join("\n")
}

// Simple keyword-aware syntax highlighting (no external deps)
function tokenizeLine(line: string, lang: string): React.ReactNode[] {
  if (lang === "json" || lang === "text" || lang === "markdown") {
    return [<span key="0">{line}</span>]
  }

  const tokens: React.ReactNode[] = []
  let remaining = line
  let idx = 0

  const KEYWORDS = new Set([
    "import", "export", "from", "const", "let", "var", "function", "return",
    "if", "else", "for", "while", "do", "switch", "case", "break", "continue",
    "class", "extends", "implements", "interface", "type", "enum", "namespace",
    "new", "this", "super", "typeof", "instanceof", "in", "of", "as",
    "async", "await", "yield", "try", "catch", "finally", "throw",
    "default", "void", "null", "undefined", "true", "false",
    "public", "private", "protected", "static", "readonly", "abstract",
    "def", "self", "None", "True", "False", "lambda", "with", "pass", "raise",
    "fn", "pub", "mut", "impl", "struct", "trait", "use", "mod", "crate",
    "func", "package", "defer", "go", "chan", "select", "range",
  ])

  // Pattern: strings, comments, keywords, numbers
  const patterns: [RegExp, string][] = [
    [/^(\/\/.*|#.*)/, "comment"],
    [/^(\/\*[\s\S]*?\*\/)/, "comment"],
    [/^("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)/, "string"],
    [/^(\b\d+\.?\d*(?:e[+-]?\d+)?\b)/, "number"],
    [/^(\b[A-Z][A-Za-z0-9_]*\b)/, "type"],
    [/^(@\w+)/, "decorator"],
    [/^(\b\w+\b)/, "word"],
    [/^(\s+)/, "space"],
    [/^([^\s\w]+)/, "punctuation"],
  ]

  while (remaining.length > 0) {
    let matched = false
    for (const [re, kind] of patterns) {
      const m = remaining.match(re)
      if (m) {
        const text = m[0]
        let className = ""
        if (kind === "comment") className = "text-(--dim) italic"
        else if (kind === "string") className = "text-(--lime)"
        else if (kind === "number") className = "text-(--sev-med)"
        else if (kind === "type") className = "text-(--sev-low)"
        else if (kind === "decorator") className = "text-(--sev-high)"
        else if (kind === "word" && KEYWORDS.has(text)) className = "text-(--sev-high) font-medium"
        else if (kind === "punctuation") className = "text-(--muted)"

        tokens.push(
          className
            ? <span key={idx} className={className}>{text}</span>
            : <span key={idx}>{text}</span>
        )
        remaining = remaining.slice(text.length)
        idx++
        matched = true
        break
      }
    }
    if (!matched) {
      tokens.push(<span key={idx}>{remaining[0]}</span>)
      remaining = remaining.slice(1)
      idx++
    }
  }

  return tokens
}

// Find the line number where a function is defined
function findFunctionLine(code: string, functionName: string, lang: string): number | null {
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

function cleanErrorMessage(message: string): string {
  return message.replace(/\s+\(-?\d+\)$/, "")
}

function getGitHubFileUrl(repoUrl: string, filePath: string, line: number | null): string | null {
  if (!/^https?:\/\/(www\.)?github\.com\//.test(repoUrl)) return null
  return `${repoUrl.replace(/\.git$/, "")}/blob/main/${filePath}${line !== null ? `#L${line + 1}` : ""}`
}

export function CodeViewer() {
  const codeViewer = useCityStore((s) => s.codeViewer)
  const closeCodeViewer = useCityStore((s) => s.closeCodeViewer)
  const repoUrl = useCityStore((s) => s.repoUrl)

  const [code, setCode] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const targetLineRef = useRef<HTMLDivElement>(null)

  const filePath = codeViewer?.filePath ?? null
  const functionName = codeViewer?.functionName ?? null
  const lang = filePath ? getLang(filePath) : "text"

  // Fetch file content
  useEffect(() => {
    if (!filePath || !repoUrl) return

    setLoading(true)
    setError(null)
    setCode(null)

    getSourceFile(repoUrl, filePath)
      .then(setCode)
      .catch((err) => setError(cleanErrorMessage(err instanceof Error ? err.message : "Could not load source file")))
      .finally(() => setLoading(false))
  }, [filePath, repoUrl])

  // Scroll to function once code is loaded
  useEffect(() => {
    if (!code || !functionName) return

    // Small delay to let DOM render
    const timer = setTimeout(() => {
      targetLineRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })
    }, 100)

    return () => clearTimeout(timer)
  }, [code, functionName])

  // Escape to close
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && codeViewer) {
        e.preventDefault()
        e.stopPropagation()
        closeCodeViewer()
      }
    }
    window.addEventListener("keydown", handleKeyDown, true)
    return () => window.removeEventListener("keydown", handleKeyDown, true)
  }, [codeViewer, closeCodeViewer])

  const handleCopyPath = useCallback(() => {
    if (!filePath) return
    navigator.clipboard.writeText(filePath).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }, [filePath])

  if (!codeViewer) return null

  const fileName = filePath?.split("/").pop() ?? ""
  const targetLine = code && functionName ? findFunctionLine(code, functionName, lang) : null
  const lines = code?.split("\n") ?? []
  const isMarkdownPreview = lang === "markdown" || lang === "mdx"
  const previewCode = code ? prepareMarkdownPreview(code, lang) : ""

  const githubUrl = repoUrl && filePath ? getGitHubFileUrl(repoUrl, filePath, targetLine) : null

  return (
    <div className="absolute inset-0 z-40 flex flex-col bg-(--bg-deep)">
      {/* Header */}
      <div className="flex h-9 shrink-0 items-center gap-2 border-b-2 border-(--border-pixel) bg-(--bg-card) px-3">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <img
            src={`/icons/vscode/${getFileIcon(fileName)}`}
            alt=""
            className="size-4 shrink-0"
          />
          <span className="truncate font-mono text-[11px] font-semibold text-(--cream)">{fileName}</span>
          {filePath && filePath !== fileName && (
            <span className="hidden truncate font-mono text-[10px] text-(--muted) sm:inline">
              <span className="text-(--dim)">~</span> {filePath?.slice(0, -(fileName.length + 1)) || ""}
            </span>
          )}
          <button
            onClick={handleCopyPath}
            className="shrink-0 rounded-none p-0.5 text-(--muted) transition-colors hover:bg-(--bg-raised) hover:text-(--cream)"
            title={filePath ?? ""}
          >
            {copied ? <Check className="size-3 text-(--lime)" /> : <Copy className="size-3" />}
          </button>
          {functionName && (
            <>
              <div className="h-3 w-px bg-(--border-pixel)" />
              <span className="font-mono text-[10px] font-medium text-primary">
                {functionName}()
              </span>
            </>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {githubUrl && (
            <a
              href={githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-6 w-6 items-center justify-center rounded-none border-2 border-transparent text-(--muted) transition-colors hover:border-(--border-pixel) hover:bg-(--bg-raised) hover:text-(--cream)"
              title="Open on GitHub"
            >
              <ExternalLink className="size-3.5" />
            </a>
          )}
          <button
            onClick={closeCodeViewer}
            className="flex h-6 w-6 items-center justify-center rounded-none border-2 border-transparent text-(--muted) transition-colors hover:border-(--border-pixel) hover:bg-(--bg-raised) hover:text-(--cream)"
          >
            <X className="size-3.5" />
          </button>
        </div>
      </div>

      {/* Code area */}
      <div ref={scrollRef} className="flex-1 overflow-auto overscroll-contain scroll-thin">
        {loading && (
          <div className="flex h-full items-center justify-center gap-2">
            <Loader2 className="size-5 animate-spin text-primary" />
            <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-(--cream-dark)">Loading source</span>
          </div>
        )}

        {error && (
          <div className="flex h-full items-center justify-center p-4">
            <div className="border-2 border-(--sev-high) bg-[color-mix(in_srgb,var(--sev-high)_8%,transparent)] px-4 py-3 font-mono text-[11px] text-(--sev-high)">
              {error}
            </div>
          </div>
        )}

        {code && isMarkdownPreview && (
          <div className="markdown-body mx-auto max-w-[900px] px-8 py-6">
            {lang === "mdx" && (
              <div className="mb-4 border-2 border-(--border-pixel) bg-(--bg-card) px-3 py-2 font-mono text-[11px] text-(--cream-dark)">
                <span className="text-(--dim)">{">"}</span> MDX preview preserves imports, exports, and custom components as inline code.
              </div>
            )}
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeRaw]}
              unwrapDisallowed
              allowElement={(element) =>
                KNOWN_HTML_TAGS.has(element.tagName)
              }
              components={{
                h1: ({ children }) => <h1 className="mb-4 border-b-2 border-(--border-pixel) pb-2 text-[22px] font-semibold text-(--cream)">{children}</h1>,
                h2: ({ children }) => <h2 className="mt-8 mb-3 border-b-2 border-dashed border-(--border-pixel) pb-1.5 text-[18px] font-semibold text-(--cream)">{children}</h2>,
                h3: ({ children }) => <h3 className="mt-6 mb-2 text-[15px] font-semibold text-(--cream)">{children}</h3>,
                h4: ({ children }) => <h4 className="mt-4 mb-2 text-[13px] font-semibold text-(--cream-dark)">{children}</h4>,
                p: ({ children }) => <p className="mb-3 text-[13px] leading-[1.7] text-(--cream-dark)">{children}</p>,
                a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary underline decoration-(--lime-shadow) underline-offset-2 transition-colors hover:decoration-primary">{children}</a>,
                ul: ({ children }) => <ul className="mb-3 list-disc space-y-1 pl-6 text-[13px] leading-[1.7] text-(--cream-dark)">{children}</ul>,
                ol: ({ children }) => <ol className="mb-3 list-decimal space-y-1 pl-6 text-[13px] leading-[1.7] text-(--cream-dark)">{children}</ol>,
                li: ({ children }) => <li className="text-(--cream-dark)">{children}</li>,
                blockquote: ({ children }) => <blockquote className="my-3 border-l-2 border-primary pl-4 italic text-(--cream-dark)">{children}</blockquote>,
                hr: () => <hr className="my-6 border-t-2 border-dashed border-(--border-pixel)" />,
                strong: ({ children }) => <strong className="font-semibold text-(--cream)">{children}</strong>,
                em: ({ children }) => <em className="italic text-(--cream-dark)">{children}</em>,
                del: ({ children }) => <del className="text-(--muted) line-through">{children}</del>,
                code: ({ className, children }) => {
                  const isBlock = className?.includes("language-")
                  if (isBlock) {
                    return <code className={`${className} text-[12px]`}>{children}</code>
                  }
                  return <code className="border-2 border-(--border-pixel) bg-(--bg-card) px-1.5 py-px font-mono text-[12px] text-primary">{children}</code>
                },
                pre: ({ children }) => <pre className="mb-3 overflow-x-auto border-2 border-(--border-pixel) bg-(--bg-card) p-4 font-mono text-[12px] leading-[1.6]" style={{ fontFamily: "'JetBrains Mono', 'Fira Code', 'SF Mono', 'Menlo', monospace" }}>{children}</pre>,
                table: ({ children }) => <div className="mb-3 overflow-x-auto"><table className="w-full border-collapse text-[12px]">{children}</table></div>,
                thead: ({ children }) => <thead className="bg-(--bg-card)">{children}</thead>,
                th: ({ children }) => <th className="border-2 border-(--border-pixel) px-3 py-2 text-left font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-(--cream)">{children}</th>,
                td: ({ children }) => <td className="border-2 border-(--border-pixel) px-3 py-2 text-(--cream-dark)">{children}</td>,
                img: ({ src, alt }) => <img src={src} alt={alt ?? ""} className="my-2 max-w-full border-2 border-(--border-pixel)" />,
                input: ({ checked, ...props }) => {
                  if (props.type === "checkbox") {
                    return <input type="checkbox" checked={checked} readOnly className="mr-1.5 accent-primary" />
                  }
                  return <input {...props} />
                },
                details: ({ children }) => <details className="mb-3 overflow-hidden border-2 border-(--border-pixel)">{children}</details>,
                summary: ({ children }) => <summary className="cursor-pointer bg-(--bg-card) px-3 py-2 font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-(--cream) transition-colors hover:bg-(--bg-raised)">{children}</summary>,
              }}
            >
              {previewCode}
            </ReactMarkdown>
          </div>
        )}

        {code && !isMarkdownPreview && (
          <div className="min-w-fit text-[12px] leading-[20px]" style={{ fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', 'SF Mono', 'Menlo', 'Monaco', 'Consolas', monospace" }}>
            {lines.map((line, i) => {
              const isTarget = targetLine !== null && i === targetLine
              const inRange = targetLine !== null && i >= targetLine && i < targetLine + 20
              return (
                <div
                  key={i}
                  ref={isTarget ? targetLineRef : undefined}
                  className={
                    isTarget
                      ? "flex border-l-2 border-primary bg-[color-mix(in_srgb,var(--lime)_14%,transparent)]"
                      : inRange
                        ? "flex bg-[color-mix(in_srgb,var(--lime)_5%,transparent)]"
                        : "flex border-l-2 border-transparent hover:bg-(--bg-raised)"
                  }
                >
                  <span className="w-12 shrink-0 select-none pr-4 text-right text-(--dim) tabular-nums">
                    {i + 1}
                  </span>
                  <span className="whitespace-pre pr-4 text-(--cream)">
                    {tokenizeLine(line, lang)}
                  </span>
                </div>
              )
            })}
            {/* Bottom padding */}
            <div className="h-32" />
          </div>
        )}
      </div>
    </div>
  )
}
