"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Globe, Lock, Sparkles } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@codecity/ui/components/dialog"
import { Input } from "@codecity/ui/components/input"
import { Button } from "@codecity/ui/components/button"

const QUICK_REPOS = [
  "https://github.com/vercel/next.js",
  "https://github.com/pmndrs/zustand",
  "https://github.com/trpc/trpc",
]

export function NewAnalysisDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [url, setUrl] = useState("")
  const [visibility, setVisibility] = useState<"PUBLIC" | "PRIVATE">("PRIVATE")
  const [submitting, setSubmitting] = useState(false)
  const [stage, setStage] = useState("")
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!url.trim()) return
    setSubmitting(true)
    setError(null)
    setStage("Analyzing repository...")

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoUrl: url, visibility }),
      })

      if (res.status === 401) {
        router.push("/login")
        return
      }

      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? "Failed to analyze repository")
        setSubmitting(false)
        setStage("")
        return
      }

      if (data.projectId) {
        onOpenChange(false)
        router.push(`/project/${data.projectId}`)
      }
    } catch {
      setError("Network error. Please try again.")
      setSubmitting(false)
      setStage("")
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!submitting) {
          if (next) {
            setUrl("")
            setError(null)
            setSubmitting(false)
            setVisibility("PRIVATE")
            setStage("")
          } else {
            setError(null)
          }
          onOpenChange(next)
        }
      }}
    >
      <DialogContent className="sm:max-w-lg border-border/50 bg-card/95 backdrop-blur-xl">
        <DialogHeader>
          <div className="mb-2 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-primary/60">
            <Sparkles className="h-3 w-3" />
            New City
          </div>
          <DialogTitle className="text-xl font-semibold text-foreground">Create a new analysis</DialogTitle>
          <DialogDescription className="font-mono text-xs text-muted-foreground">
            Paste a GitHub repository URL and we&apos;ll generate a 3D city layout.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="mt-2 space-y-5">
          <div>
            <label className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground block mb-1.5">
              Repository URL
            </label>
            <Input
              type="url"
              placeholder="https://github.com/owner/repo"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={submitting}
              className="h-11 border-border/40 bg-background/60 font-mono text-sm placeholder:text-muted-foreground/50 focus-visible:border-primary/40 focus-visible:ring-primary/30"
              required
            />
            {!submitting && (
              <div className="mt-2 flex flex-wrap gap-2">
                {QUICK_REPOS.map((repo) => (
                  <button
                    key={repo}
                    type="button"
                    onClick={() => setUrl(repo)}
                    className="rounded-full border border-border/35 px-2.5 py-1 font-mono text-[10px] text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
                  >
                    {repo.replace("https://github.com/", "")}
                  </button>
                ))}
              </div>
            )}
          </div>

          {!submitting && (
            <div>
              <label className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground block mb-1.5">
                Visibility
              </label>
              <div className="flex gap-2">
                {(["PRIVATE", "PUBLIC"] as const).map((v) => (
                  <label
                    key={v}
                    className={`flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border px-3 py-2.5 font-mono text-xs uppercase tracking-wide transition-all ${
                      visibility === v
                        ? "border-primary/50 bg-primary/10 text-primary"
                        : "border-border/40 bg-background/50 text-muted-foreground hover:border-muted-foreground/30"
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
                    {v === "PRIVATE" ? <Lock className="h-3 w-3" /> : <Globe className="h-3 w-3" />}
                    {v.toLowerCase()}
                  </label>
                ))}
              </div>
            </div>
          )}

          {submitting && (
            <div className="space-y-3">
              {/* City building animation */}
              <div className="flex items-end justify-center gap-[3px] h-16">
                {Array.from({ length: 24 }, (_, i) => {
                  const baseHeight = 12 + ((i * 7 + 3) % 48)
                  return (
                    <div
                      key={i}
                      className="w-1 rounded-t-[2px] bg-primary/60 animate-pulse"
                      style={{
                        height: `${baseHeight}px`,
                        animationDelay: `${i * 80}ms`,
                      }}
                    />
                  )
                })}
              </div>
              <div className="text-center">
                <p className="font-mono text-xs text-muted-foreground animate-pulse">
                  {stage}
                </p>
                <p className="font-mono text-[10px] text-muted-foreground/40 mt-1">
                  This may take 10–30 seconds depending on repo size
                </p>
              </div>
            </div>
          )}

          {error && (
            <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 font-mono text-xs text-red-400">
              {error}
            </p>
          )}

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            {!submitting && (
              <Button
                onClick={() => onOpenChange(false)}
                variant="outline"
                className="border-border/40 bg-background/40"
              >
                Cancel
              </Button>
            )}
            <Button
              type="submit"
              disabled={submitting}
              className="min-w-40 bg-primary text-primary-foreground hover:bg-primary/90 font-mono text-sm"
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Building City...
                </>
              ) : (
                "Start Analysis"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
