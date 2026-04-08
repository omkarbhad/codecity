"use client"

import { useState, useRef, useEffect, useMemo } from "react"
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"
import { Send, Loader2, Bot, User, Trash2 } from "lucide-react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import type { CitySnapshot } from "@/lib/types/city"

interface ChatPanelProps {
  snapshot: CitySnapshot
  projectName: string
}

export function ChatPanel({ snapshot, projectName }: ChatPanelProps) {
  const [input, setInput] = useState("")
  const scrollRef = useRef<HTMLDivElement>(null)

  // Build context from snapshot stats (memoized to avoid sort on every render)
  const context = useMemo(() => {
    const top5 = snapshot.files
      .slice()
      .sort((a, b) => b.complexity - a.complexity)
      .slice(0, 5)
      .map((f) => `${f.path} (complexity: ${f.complexity}, lines: ${f.lines})`)
      .join("; ")
    return `Project: ${projectName}
Files: ${snapshot.stats.totalFiles}, Lines: ${snapshot.stats.totalLines}, Functions: ${snapshot.stats.totalFunctions}
Types: ${snapshot.stats.totalTypes}, Imports: ${snapshot.stats.totalImports}, Unused exports: ${snapshot.stats.unusedExports}
Districts: ${snapshot.districts.map((d) => d.name).join(", ")}
Top files by complexity: ${top5}`
  }, [snapshot, projectName])

  const { messages, sendMessage, status, setMessages } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
      body: { context },
    }),
  })

  const isLoading = status === "submitted" || status === "streaming"

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return
    sendMessage({ text: input })
    setInput("")
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto overscroll-contain scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent p-3 space-y-3"
      >
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center px-4 gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Bot className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-[11px] text-white/60 font-medium">CodeCity AI</p>
              <p className="text-[10px] text-white/35 mt-1">
                Ask about your codebase structure, dependencies, or code quality.
              </p>
            </div>
          </div>
        )}

        {messages.map((message) => (
          <div key={message.id} className="flex gap-2">
            <div className="shrink-0 mt-0.5">
              {message.role === "user" ? (
                <div className="w-5 h-5 rounded bg-white/[0.08] flex items-center justify-center">
                  <User className="w-3 h-3 text-white/50" />
                </div>
              ) : (
                <div className="w-5 h-5 rounded bg-primary/15 flex items-center justify-center">
                  <Bot className="w-3 h-3 text-primary" />
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              {message.parts.map((part, i) => {
                if (part.type === "text") {
                  return (
                    <div
                      key={`${message.id}-${i}`}
                      className="text-[11px] leading-relaxed text-white/80 prose prose-invert prose-xs max-w-none [&_pre]:bg-white/[0.04] [&_pre]:border [&_pre]:border-white/[0.06] [&_pre]:rounded-md [&_pre]:p-2 [&_pre]:text-[10px] [&_pre]:overflow-x-auto [&_code]:text-[10px] [&_code]:text-primary/80 [&_p]:my-1.5 [&_ul]:my-1 [&_ol]:my-1 [&_li]:my-0.5 [&_h1]:text-[13px] [&_h2]:text-[12px] [&_h3]:text-[11px] [&_h1]:font-semibold [&_h2]:font-semibold [&_h3]:font-medium [&_a]:text-primary/80 [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:border-white/10 [&_blockquote]:pl-2 [&_blockquote]:text-white/50 [&_table]:text-[10px] [&_th]:px-2 [&_th]:py-1 [&_td]:px-2 [&_td]:py-1 [&_th]:border [&_th]:border-white/10 [&_td]:border [&_td]:border-white/10"
                    >
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {part.text}
                      </ReactMarkdown>
                    </div>
                  )
                }
                return null
              })}
            </div>
          </div>
        ))}

        {status === "submitted" && (
          <div className="flex gap-2">
            <div className="w-5 h-5 rounded bg-primary/15 flex items-center justify-center shrink-0">
              <Bot className="w-3 h-3 text-primary" />
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-white/40">
              <Loader2 className="w-3 h-3 animate-spin" />
              Thinking...
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-white/[0.06] p-2">
        {messages.length > 0 && (
          <div className="flex justify-end mb-1.5">
            <button
              onClick={() => setMessages([])}
              className="flex items-center gap-1 text-[9px] text-white/30 hover:text-white/50 transition-colors"
            >
              <Trash2 className="w-2.5 h-2.5" />
              Clear
            </button>
          </div>
        )}
        <form onSubmit={handleSubmit} className="flex gap-1.5">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading}
            placeholder="Ask about this codebase..."
            className="flex-1 bg-white/[0.04] border border-white/[0.06] rounded-md px-2.5 py-1.5 text-[11px] text-white/80 placeholder:text-white/30 outline-none focus:border-white/15 focus:bg-white/[0.06] transition-all disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="flex items-center justify-center w-7 h-7 rounded-md bg-primary/15 border border-primary/20 text-primary hover:bg-primary/25 transition-all disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
          >
            <Send className="w-3 h-3" />
          </button>
        </form>
      </div>
    </div>
  )
}

