"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"

const QUICK_PICKS = [
  "excalidraw/excalidraw",
  "vercel/next.js",
  "pmndrs/zustand",
  "trpc/trpc",
  "t3-oss/create-t3-app",
]

export function RepoInput() {
  const [url, setUrl] = useState("")
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
    <section className="relative py-16">
      <div className="mx-auto max-w-2xl px-6">
        <form onSubmit={handleSubmit} className="flex gap-3">
          <input
            type="url"
            placeholder="https://github.com/owner/repo"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="flex-1 rounded-lg border border-border/50 bg-background/50 px-4 py-3 font-mono text-sm placeholder:text-muted-foreground/50 focus:border-primary/50 focus:ring-1 focus:ring-primary/30 focus:outline-none"
          />
          <button
            type="submit"
            className="rounded-lg bg-primary px-6 py-3 font-semibold text-primary-foreground transition-all hover:bg-primary/90 glow-red"
          >
            Analyze &rarr;
          </button>
        </form>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          {QUICK_PICKS.map((pick) => (
            <button
              key={pick}
              onClick={() => setUrl(`https://github.com/${pick}`)}
              className="rounded-md border border-border/30 bg-card/30 px-3 py-1 font-mono text-xs text-muted-foreground transition-all hover:text-primary hover:border-primary/30 cursor-pointer"
            >
              {pick}
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}
