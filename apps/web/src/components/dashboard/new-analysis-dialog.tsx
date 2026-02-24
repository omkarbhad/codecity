"use client"

import { useState } from "react"
import { X } from "lucide-react"

export function NewAnalysisDialog({ onClose }: { onClose: () => void }) {
  const [url, setUrl] = useState("")
  const [visibility, setVisibility] = useState<"PUBLIC" | "PRIVATE">("PRIVATE")
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!url.trim()) return

    setSubmitting(true)
    await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ repoUrl: url, visibility }),
    })

    window.location.reload()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md rounded-xl border border-border/50 bg-card/80 p-6 shadow-2xl backdrop-blur-xl glow-cyan animate-fade-up">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">New Analysis</h2>
            <p className="font-mono text-[10px] tracking-wider text-muted-foreground/50">CREATE PROJECT</p>
          </div>
          <button onClick={onClose} className="rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-card transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="font-mono text-[10px] tracking-wider uppercase text-muted-foreground">
              Repository URL
            </label>
            <input
              type="url"
              placeholder="https://github.com/owner/repo"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-border/50 bg-background/50 px-4 py-2.5 font-mono text-sm text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:border-primary/50 transition-colors"
              required
            />
          </div>

          <div>
            <label className="font-mono text-[10px] tracking-wider uppercase text-muted-foreground">
              Visibility
            </label>
            <div className="mt-1.5 flex gap-3">
              {(["PRIVATE", "PUBLIC"] as const).map((v) => (
                <label
                  key={v}
                  className={`flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border px-3 py-2 font-mono text-xs transition-all ${
                    visibility === v
                      ? "border-primary/30 bg-primary/5 text-primary"
                      : "border-border/30 bg-card/30 text-muted-foreground hover:border-border/50"
                  }`}
                >
                  <input
                    type="radio"
                    name="visibility"
                    value={v}
                    checked={visibility === v}
                    onChange={() => setVisibility(v)}
                    className="sr-only"
                  />
                  {v.toLowerCase()}
                </label>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg border border-accent/30 bg-accent/10 py-2.5 font-mono text-sm font-medium text-accent transition-all hover:bg-accent/20 hover:border-accent/50 disabled:opacity-50 glow-amber"
          >
            {submitting ? "Starting..." : "Start Analysis"}
          </button>
        </form>
      </div>
    </div>
  )
}
