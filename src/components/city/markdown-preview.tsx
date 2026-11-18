"use client"

import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import rehypeRaw from "rehype-raw"
import rehypeSanitize from "rehype-sanitize"

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

/** Rendered Markdown/MDX, sanitized (see the rehype plugins). */
export function MarkdownPreview({ source, mdx = false }: { source: string; mdx?: boolean }) {
  return (
    <div className="mx-auto max-w-[860px] px-8 py-6">
      {mdx && (
        <div className="mb-4 rounded-[10px] bg-(--bg-card) px-3 py-2 text-[12px] text-(--muted)">
          MDX preview shows imports, exports and custom components as inline code.
        </div>
      )}
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      // Raw HTML in a README is parsed, then sanitized with GitHub's rules
      // (no iframes, scripts, event handlers or styles), so a repo can't
      // run code inside the app.
      rehypePlugins={[rehypeRaw, rehypeSanitize]}
      unwrapDisallowed
      allowElement={(element) =>
        KNOWN_HTML_TAGS.has(element.tagName)
      }
      components={{
        h1: ({ children }) => <h1 className="mb-4 border-b border-(--border-pixel) pb-3 text-[26px] font-semibold tracking-[-0.01em] text-(--cream)">{children}</h1>,
        h2: ({ children }) => <h2 className="mt-9 mb-3 text-[19px] font-semibold tracking-[-0.01em] text-(--cream)">{children}</h2>,
        h3: ({ children }) => <h3 className="mt-6 mb-2 text-[16px] font-semibold text-(--cream)">{children}</h3>,
        h4: ({ children }) => <h4 className="mt-4 mb-2 text-[14px] font-semibold text-(--cream-dark)">{children}</h4>,
        p: ({ children }) => <p className="mb-3.5 text-[14px] leading-[1.7] text-(--cream-dark)">{children}</p>,
        a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-(--cream) underline decoration-(--dim) underline-offset-[3px] transition-colors hover:decoration-(--cream)">{children}</a>,
        ul: ({ children }) => <ul className="mb-3.5 list-disc space-y-1.5 pl-6 text-[14px] leading-[1.7] text-(--cream-dark) marker:text-(--dim)">{children}</ul>,
        ol: ({ children }) => <ol className="mb-3.5 list-decimal space-y-1.5 pl-6 text-[14px] leading-[1.7] text-(--cream-dark) marker:text-(--muted)">{children}</ol>,
        li: ({ children }) => <li className="text-(--cream-dark)">{children}</li>,
        blockquote: ({ children }) => <blockquote className="my-4 border-l-2 border-(--border-light) pl-4 text-(--muted)">{children}</blockquote>,
        hr: () => <hr className="my-8 border-t border-(--border-pixel)" />,
        strong: ({ children }) => <strong className="font-semibold text-(--cream)">{children}</strong>,
        em: ({ children }) => <em className="italic text-(--cream-dark)">{children}</em>,
        del: ({ children }) => <del className="text-(--muted) line-through">{children}</del>,
        code: ({ className, children }) => {
          const isBlock = className?.includes("language-")
          if (isBlock) {
            return <code className={`${className} font-mono text-[12px]`}>{children}</code>
          }
          return <code className="rounded-[6px] bg-(--bg-raised) px-1.5 py-0.5 font-mono text-[12.5px] text-(--cream)">{children}</code>
        },
        pre: ({ children }) => <pre className="mb-4 overflow-x-auto rounded-[10px] border border-(--border-pixel) bg-(--bg-deep) p-4 font-mono text-[12.5px] leading-[1.65]">{children}</pre>,
        table: ({ children }) => <div className="mb-3 overflow-x-auto"><table className="w-full border-collapse text-[12px]">{children}</table></div>,
        thead: ({ children }) => <thead className="bg-(--bg-card)">{children}</thead>,
        th: ({ children }) => <th className="border border-(--border-pixel) px-3 py-2 text-left text-[12px] font-semibold text-(--cream)">{children}</th>,
        td: ({ children }) => <td className="border border-(--border-pixel) px-3 py-2 text-[13px] text-(--cream-dark)">{children}</td>,
        img: ({ src, alt }) => <img src={src} alt={alt ?? ""} className="my-2 max-w-full border border-(--border-pixel) rounded-md" />,
        input: ({ checked, ...props }) => {
          if (props.type === "checkbox") {
            return <input type="checkbox" checked={checked} readOnly className="mr-1.5 accent-primary" />
          }
          return <input {...props} />
        },
        details: ({ children }) => <details className="mb-3 overflow-hidden border border-(--border-pixel) rounded-md">{children}</details>,
        summary: ({ children }) => <summary className="cursor-pointer bg-(--bg-card) px-3 py-2 text-[13px] font-medium text-(--cream) transition-colors hover:bg-(--bg-raised)">{children}</summary>,
      }}
    >
      {prepareMarkdownPreview(source, mdx ? "mdx" : "markdown")}
    </ReactMarkdown>
    </div>
  )
}
