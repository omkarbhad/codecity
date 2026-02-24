"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { ArrowRight } from "lucide-react"

const QUICK_PICKS = [
  { name: "zustand", url: "https://github.com/pmndrs/zustand" },
  { name: "tRPC", url: "https://github.com/trpc/trpc" },
  { name: "excalidraw", url: "https://github.com/excalidraw/excalidraw" },
  { name: "create-t3-app", url: "https://github.com/t3-oss/create-t3-app" },
  { name: "next.js", url: "https://github.com/vercel/next.js" },
]

export function RepoInput() {
  const [url, setUrl] = useState("")
  const [focused, setFocused] = useState(false)
  const router = useRouter()
  const { data: session } = useSession()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!url.trim()) return

    if (!session) {
      router.push("/login")
      return
    }

    router.push(`/dashboard?analyze=${encodeURIComponent(url)}`)
  }

  return (
    <section className="relative border-t border-border/30 py-20 animate-fade-up delay-400">
      <div className="mx-auto max-w-2xl px-6 text-center">
        <h2 className="font-mono text-xs tracking-[0.2em] uppercase text-accent text-glow-amber">
          Try it now
        </h2>
        <p className="mt-2 text-lg font-medium text-foreground">
          Paste a GitHub repository URL
        </p>

        <form onSubmit={handleSubmit} className="mt-8 flex gap-3">
          <div className={`relative flex-1 transition-all duration-300 ${focused ? "glow-cyan" : ""}`}>
            <input
              type="url"
              placeholder="https://github.com/owner/repo"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              className="w-full rounded-lg border border-border/50 bg-card/50 px-4 py-3 font-mono text-sm text-foreground placeholder:text-muted-foreground/50 backdrop-blur-sm focus:outline-none focus:border-primary/50 transition-colors"
            />
          </div>
          <button
            type="submit"
            className="flex items-center gap-2 rounded-lg border border-accent/30 bg-accent/10 px-6 py-3 font-mono text-sm font-medium text-accent transition-all hover:bg-accent/20 hover:border-accent/50 glow-amber"
          >
            Analyze
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>

        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          <span className="font-mono text-[10px] tracking-wider uppercase text-muted-foreground/50">
            Quick picks
          </span>
          {QUICK_PICKS.map((pick) => (
            <button
              key={pick.name}
              onClick={() => setUrl(pick.url)}
              className="rounded-md border border-border/30 bg-card/30 px-3 py-1 font-mono text-[11px] text-muted-foreground transition-all hover:border-primary/30 hover:text-primary hover:bg-primary/5"
            >
              {pick.name}
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}
