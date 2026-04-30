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
    h: "c", hpp: "cpp", css: "css", scss: "css", html: "html", json: "json",
    md: "markdown", mdx: "markdown", yaml: "yaml", yml: "yaml", toml: "toml", sh: "bash",
    zsh: "bash", rb: "ruby", php: "php", swift: "swift", kt: "kotlin",
  }
  return map[ext] ?? "text"
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
        if (kind === "comment") className = "text-white/30 italic"
        else if (kind === "string") className = "text-emerald-400/80"
        else if (kind === "number") className = "text-amber-400/80"
        else if (kind === "type") className = "text-cyan-400/80"
        else if (kind === "decorator") className = "text-purple-400/80"
        else if (kind === "word" && KEYWORDS.has(text)) className = "text-purple-400/90 font-medium"
        else if (kind === "punctuation") className = "text-white/40"

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
      .catch((err) => setError(err.message))
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

  const githubUrl = repoUrl
    ? `${repoUrl.replace(/\.git$/, "")}/blob/main/${filePath}${targetLine !== null ? `#L${targetLine + 1}` : ""}`
    : null

  return (
    <div className="absolute inset-0 z-40 flex flex-col bg-[#0a0a0f]/98 backdrop-blur-sm">
      {/* Header */}
      <div className="flex items-center h-9 px-3 border-b border-white/[0.06] shrink-0 gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <img
            src={`/icons/vscode/${getFileIcon(fileName)}`}
            alt=""
            className="w-4 h-4 shrink-0"
          />
          <span className="text-[11px] font-medium text-white/90 truncate">{fileName}</span>
          {filePath && filePath !== fileName && (
            <span className="text-[10px] text-white/30 truncate hidden sm:inline">
              {filePath?.slice(0, -(fileName.length + 1)) || ""}
            </span>
          )}
          <button
            onClick={handleCopyPath}
            className="shrink-0 p-0.5 rounded hover:bg-white/[0.06] text-white/40 hover:text-white/65 transition-colors"
            title={filePath ?? ""}
          >
            {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
          </button>
          {functionName && (
            <>
              <div className="w-px h-3 bg-white/[0.06]" />
              <span className="text-[10px] text-primary font-medium">
                {functionName}()
              </span>
            </>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {githubUrl && (
            <a
              href={githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center w-6 h-6 rounded-md text-white/40 hover:text-white/65 hover:bg-white/[0.06] transition-colors"
              title="Open on GitHub"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
          <button
            onClick={closeCodeViewer}
            className="flex items-center justify-center w-6 h-6 rounded-md text-white/40 hover:text-white/65 hover:bg-white/[0.06] transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Code area */}
      <div ref={scrollRef} className="flex-1 overflow-auto overscroll-contain scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
        {loading && (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-5 h-5 text-white/40 animate-spin" />
          </div>
        )}

        {error && (
          <div className="flex items-center justify-center h-full">
            <p className="text-xs text-red-400/80">{error}</p>
          </div>
        )}

        {code && lang === "markdown" && (
          <div className="markdown-body px-8 py-6 max-w-[900px] mx-auto">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeRaw]}
              unwrapDisallowed
              allowElement={(element) =>
                KNOWN_HTML_TAGS.has(element.tagName)
              }
              components={{
                h1: ({ children }) => <h1 className="text-[22px] font-semibold text-white/95 pb-2 mb-4 border-b border-white/[0.08]">{children}</h1>,
                h2: ({ children }) => <h2 className="text-[18px] font-semibold text-white/90 pb-1.5 mb-3 mt-8 border-b border-white/[0.06]">{children}</h2>,
                h3: ({ children }) => <h3 className="text-[15px] font-semibold text-white/85 mb-2 mt-6">{children}</h3>,
                h4: ({ children }) => <h4 className="text-[13px] font-semibold text-white/80 mb-2 mt-4">{children}</h4>,
                p: ({ children }) => <p className="text-[13px] leading-[1.7] text-white/70 mb-3">{children}</p>,
                a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/80 underline decoration-primary/30 hover:decoration-primary/60 transition-colors">{children}</a>,
                ul: ({ children }) => <ul className="text-[13px] leading-[1.7] text-white/70 mb-3 pl-6 list-disc space-y-1">{children}</ul>,
                ol: ({ children }) => <ol className="text-[13px] leading-[1.7] text-white/70 mb-3 pl-6 list-decimal space-y-1">{children}</ol>,
                li: ({ children }) => <li className="text-white/70">{children}</li>,
                blockquote: ({ children }) => <blockquote className="border-l-[3px] border-white/10 pl-4 my-3 text-white/50 italic">{children}</blockquote>,
                hr: () => <hr className="border-white/[0.08] my-6" />,
                strong: ({ children }) => <strong className="font-semibold text-white/85">{children}</strong>,
                em: ({ children }) => <em className="italic text-white/70">{children}</em>,
                del: ({ children }) => <del className="text-white/40 line-through">{children}</del>,
                code: ({ className, children }) => {
                  const isBlock = className?.includes("language-")
                  if (isBlock) {
                    return <code className={`${className} text-[12px]`}>{children}</code>
                  }
                  return <code className="px-1.5 py-0.5 rounded bg-white/[0.06] border border-white/[0.08] text-[12px] text-primary/90 font-mono">{children}</code>
                },
                pre: ({ children }) => <pre className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-4 mb-3 overflow-x-auto text-[12px] leading-[1.6] font-mono" style={{ fontFamily: "'JetBrains Mono', 'Fira Code', 'SF Mono', 'Menlo', monospace" }}>{children}</pre>,
                table: ({ children }) => <div className="overflow-x-auto mb-3"><table className="w-full text-[12px] border-collapse">{children}</table></div>,
                thead: ({ children }) => <thead className="bg-white/[0.04]">{children}</thead>,
                th: ({ children }) => <th className="text-left text-white/70 font-semibold px-3 py-2 border border-white/[0.08]">{children}</th>,
                td: ({ children }) => <td className="text-white/60 px-3 py-2 border border-white/[0.06]">{children}</td>,
                img: ({ src, alt }) => <img src={src} alt={alt ?? ""} className="rounded-lg max-w-full my-2" />,
                input: ({ checked, ...props }) => {
                  if (props.type === "checkbox") {
                    return <input type="checkbox" checked={checked} readOnly className="mr-1.5 accent-primary" />
                  }
                  return <input {...props} />
                },
                details: ({ children }) => <details className="mb-3 border border-white/[0.06] rounded-lg overflow-hidden">{children}</details>,
                summary: ({ children }) => <summary className="px-3 py-2 cursor-pointer text-[13px] text-white/80 font-medium bg-white/[0.02] hover:bg-white/[0.04] transition-colors">{children}</summary>,
              }}
            >
              {code}
            </ReactMarkdown>
          </div>
        )}

        {code && lang !== "markdown" && (
          <div className="text-[12px] leading-[20px] min-w-fit" style={{ fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', 'SF Mono', 'Menlo', 'Monaco', 'Consolas', monospace" }}>
            {lines.map((line, i) => {
              const isTarget = targetLine !== null && i === targetLine
              const inRange = targetLine !== null && i >= targetLine && i < targetLine + 20
              return (
                <div
                  key={i}
                  ref={isTarget ? targetLineRef : undefined}
                  className={
                    isTarget
                      ? "flex bg-primary/[0.12] border-l-2 border-primary"
                      : inRange
                        ? "flex bg-primary/[0.04]"
                        : "flex hover:bg-white/[0.02]"
                  }
                >
                  <span className="w-12 shrink-0 text-right pr-4 select-none text-white/20 tabular-nums">
                    {i + 1}
                  </span>
                  <span className="text-white/75 whitespace-pre pr-4">
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
