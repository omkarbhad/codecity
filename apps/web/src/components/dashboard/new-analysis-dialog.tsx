"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Globe, Lock } from "lucide-react"
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
        // If snapshot returned immediately (cache hit), go to project page
        // Otherwise go to analyze page to watch progress
        if (data.snapshot) {
          router.push(`/project/${data.projectId}`)
        } else {
          router.push(`/analyze/${data.projectId}`)
        }
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
      <DialogContent className="sm:max-w-lg rounded-xl border-white/[0.08] bg-[#0a0a0c]">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-[#fafafa]">
            Create a new analysis
          </DialogTitle>
          <DialogDescription className="text-xs text-[#71717a]">
            Paste a GitHub repository URL and we&apos;ll generate a 3D city layout.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="mt-2 space-y-5">
          <div>
            <label className="text-[11px] uppercase tracking-wider text-[#71717a] font-medium block mb-1.5">
              Repository URL
            </label>
            <Input
              type="url"
              placeholder="https://github.com/owner/repo"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={submitting}
              className="h-11 rounded-lg bg-white/[0.03] border-white/[0.08] text-sm text-zinc-200 placeholder:text-[#52525b] focus-visible:border-primary/45 focus-visible:ring-0 transition-colors duration-200"
              required
            />
            {!submitting && (
              <div className="mt-2 flex flex-wrap gap-2">
                {QUICK_REPOS.map((repo) => (
                  <button
                    key={repo}
                    type="button"
                    onClick={() => setUrl(repo)}
                    className="rounded-lg bg-white/[0.04] border border-white/[0.06] px-2.5 py-1 text-[10px] text-[#a1a1aa] font-medium transition-all duration-200 hover:border-white/[0.12] hover:text-white"
                  >
                    {repo.replace("https://github.com/", "")}
                  </button>
                ))}
              </div>
            )}
          </div>

          {!submitting && (
            <div>
              <label className="text-[11px] uppercase tracking-wider text-[#71717a] font-medium block mb-1.5">
                Visibility
              </label>
              <div className="flex gap-2">
                {(["PRIVATE", "PUBLIC"] as const).map((v) => (
                  <label
                    key={v}
                    className={`flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-xs uppercase tracking-wide font-medium transition-all duration-200 ${
                      visibility === v
                        ? "border-primary/40 bg-primary/10 text-white"
                        : "border-white/[0.06] bg-white/[0.02] text-[#52525b] hover:border-white/[0.12] hover:text-[#a1a1aa]"
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
            <div className="flex flex-col items-center gap-3 py-4">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <div className="text-center">
                <p className="text-xs text-[#a1a1aa]">
                  {stage}
                </p>
                <p className="text-[10px] text-[#52525b] mt-1">
                  This may take 10–30 seconds depending on repo size
                </p>
              </div>
            </div>
          )}

          {error && (
            <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">
              {error}
            </p>
          )}

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            {!submitting && (
              <Button
                type="button"
                onClick={() => onOpenChange(false)}
                variant="outline"
                className="rounded-lg border-white/[0.08] bg-white/[0.04] text-zinc-300 hover:text-white hover:bg-white/[0.06] hover:border-white/[0.12] transition-all duration-200"
              >
                Cancel
              </Button>
            )}
            <Button
              type="submit"
              disabled={submitting}
              className="min-w-40 rounded-lg text-sm font-medium bg-primary hover:bg-primary/90 text-white transition-colors duration-200"
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
