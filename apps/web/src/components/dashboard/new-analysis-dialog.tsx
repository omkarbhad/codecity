"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
import { Globe, Lock, Building2, GitBranch, Sparkles } from "lucide-react"
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
  { label: "vercel/next.js", url: "https://github.com/vercel/next.js" },
  { label: "pmndrs/zustand", url: "https://github.com/pmndrs/zustand" },
  { label: "trpc/trpc", url: "https://github.com/trpc/trpc" },
  { label: "shadcn-ui/ui", url: "https://github.com/shadcn-ui/ui" },
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
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const queryClient = useQueryClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!url.trim()) return
    setSubmitting(true)
    setError(null)

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
        return
      }

      if (data.snapshot || res.status === 200) {
        onOpenChange(false)
        router.push(`/project/${data.projectId}`)
        return
      }

      queryClient.invalidateQueries({ queryKey: ["projects"] })
      onOpenChange(false)
    } catch {
      setError("Network error. Please try again.")
      setSubmitting(false)
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
          } else {
            setError(null)
          }
          onOpenChange(next)
        }
      }}
    >
      <DialogContent className="sm:max-w-[420px] rounded-2xl border border-white/[0.08] bg-[#07070c] p-0 overflow-hidden shadow-[0_32px_80px_rgba(0,0,0,0.7),0_0_0_1px_rgba(255,255,255,0.04)]">
        {/* Accent gradient top */}
        <div className="h-px w-full bg-gradient-to-r from-transparent via-primary/60 to-transparent" />

        {/* Subtle top glow */}
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-32"
          style={{ background: "radial-gradient(ellipse 70% 50% at 50% 0%, rgba(255,61,61,0.08), transparent 80%)" }}
        />

        <div className="relative p-5">
          {/* Header */}
          <DialogHeader className="mb-5">
            <div className="flex items-center gap-3">
              <div className="relative flex items-center justify-center size-9 rounded-xl bg-primary/[0.08] border border-primary/20 overflow-hidden shrink-0">
                <img
                  src="/logo.png"
                  alt="CodeCity"
                  className="size-9 object-cover"
                  onError={(e) => {
                    const t = e.currentTarget
                    t.style.display = "none"
                    const fallback = t.nextElementSibling as HTMLElement | null
                    if (fallback) fallback.style.display = "flex"
                  }}
                />
                <div className="hidden absolute inset-0 items-center justify-center">
                  <Building2 className="size-4 text-primary" />
                </div>
              </div>
              <div>
                <DialogTitle className="text-[15px] font-semibold text-zinc-100 leading-none">
                  New City
                </DialogTitle>
                <DialogDescription className="text-[11px] text-zinc-600 mt-0.5 leading-none">
                  Visualize a GitHub repository as a 3D city
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* URL input */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono uppercase tracking-widest text-zinc-600 block">
                Repository URL
              </label>
              <div className="relative">
                <GitBranch className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-zinc-600 pointer-events-none" />
                <Input
                  type="url"
                  placeholder="https://github.com/owner/repo"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  disabled={submitting}
                  className="h-10 pl-9 rounded-xl bg-white/[0.04] border-white/[0.07] text-sm text-zinc-200 placeholder:text-zinc-700 focus-visible:border-primary/40 focus-visible:ring-0 transition-colors font-mono text-[12px]"
                  required
                />
              </div>

              {/* Quick picks */}
              {!submitting && (
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {QUICK_REPOS.map((repo) => (
                    <button
                      key={repo.url}
                      type="button"
                      onClick={() => setUrl(repo.url)}
                      className={`rounded-lg border px-2 py-1 text-[10px] font-mono transition-all duration-150 ${
                        url === repo.url
                          ? "border-primary/40 bg-primary/[0.08] text-primary"
                          : "border-white/[0.06] bg-white/[0.02] text-zinc-600 hover:border-white/[0.10] hover:text-zinc-400 hover:bg-white/[0.03]"
                      }`}
                    >
                      {repo.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Visibility */}
            {!submitting && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono uppercase tracking-widest text-zinc-600 block">
                  Visibility
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(["PRIVATE", "PUBLIC"] as const).map((v) => (
                    <label
                      key={v}
                      className={`flex cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2.5 transition-all duration-150 ${
                        visibility === v
                          ? "border-primary/30 bg-primary/[0.06] text-zinc-100"
                          : "border-white/[0.06] bg-white/[0.02] text-zinc-500 hover:border-white/[0.10] hover:text-zinc-400"
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
                      <div className={`shrink-0 flex items-center justify-center size-6 rounded-lg transition-all ${
                        visibility === v ? "bg-primary/10 text-primary" : "bg-white/[0.04] text-zinc-600"
                      }`}>
                        {v === "PRIVATE" ? (
                          <Lock className="h-3 w-3" />
                        ) : (
                          <Globe className="h-3 w-3" />
                        )}
                      </div>
                      <div>
                        <p className="text-[11px] font-medium leading-none">{v === "PRIVATE" ? "Private" : "Public"}</p>
                        <p className="text-[9px] text-zinc-600 mt-0.5 leading-none">
                          {v === "PRIVATE" ? "Only you can see" : "Visible in Explore"}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Submitting state */}
            {submitting && (
              <div className="rounded-xl border border-primary/15 bg-primary/[0.04] px-4 py-4 text-center">
                <div className="flex items-center justify-center gap-2.5 mb-1.5">
                  <span className="h-3.5 w-3.5 rounded-full border-2 border-primary/30 border-t-primary animate-spin shrink-0" />
                  <span className="text-[12px] font-mono text-zinc-300">Queuing analysis…</span>
                </div>
                <p className="text-[10px] font-mono text-zinc-700">Progress will appear on your dashboard</p>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="rounded-xl border border-red-500/20 bg-red-500/[0.05] px-3 py-2.5">
                <p className="text-[11px] font-mono text-red-400">{error}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-0.5">
              {!submitting && (
                <Button
                  type="button"
                  onClick={() => onOpenChange(false)}
                  variant="outline"
                  className="flex-1 h-9 rounded-xl border-white/[0.07] bg-transparent text-zinc-600 hover:text-zinc-200 hover:bg-white/[0.04] hover:border-white/[0.12] transition-all text-[12px]"
                >
                  Cancel
                </Button>
              )}
              <Button
                type="submit"
                disabled={submitting}
                className={`h-9 rounded-xl bg-primary hover:bg-primary/85 text-white text-[12px] font-semibold transition-all shadow-[0_0_20px_rgba(255,61,61,0.2)] hover:shadow-[0_0_28px_rgba(255,61,61,0.3)] ${submitting ? "w-full" : "flex-[2]"}`}
              >
                {submitting ? (
                  "Building City…"
                ) : (
                  <span className="flex items-center justify-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5" />
                    Start Analysis
                  </span>
                )}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  )
}
