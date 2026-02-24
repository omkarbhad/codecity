"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"

const QUICK_PICKS = [
  "excalidraw/excalidraw",
  "vercel/next.js",
  "pmndrs/zustand",
  "trpc/trpc",
  "t3-oss/create-t3-app",
]

export function RepoInput() {
  const [url, setUrl] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!url.trim() || submitting) return
    setSubmitting(true)
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoUrl: url, visibility: "PUBLIC" }),
      })
      if (res.status === 401) {
        router.push("/login")
        return
      }
      const data = await res.json()
      if (data.projectId) {
        router.push(`/analyze/${data.projectId}`)
      }
    } catch {
      setSubmitting(false)
    }
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
            disabled={submitting}
            className="flex-1 rounded-lg border border-border/50 bg-background/50 px-4 py-3 font-mono text-sm placeholder:text-muted-foreground/50 focus:border-primary/50 focus:ring-1 focus:ring-primary/30 focus:outline-none disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-primary px-6 py-3 font-semibold text-primary-foreground transition-all hover:bg-primary/90 glow-red disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>Analyze &rarr;</>
            )}
          </button>
        </form>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          {QUICK_PICKS.map((pick) => (
            <button
              key={pick}
              onClick={() => setUrl(`https://github.com/${pick}`)}
              disabled={submitting}
              className="rounded-md border border-border/30 bg-card/30 px-3 py-1 font-mono text-xs text-muted-foreground transition-all hover:text-primary hover:border-primary/30 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {pick}
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}
