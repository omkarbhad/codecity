"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
import { Globe, Lock, Building2, GitBranch, FolderOpen } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@codecity/ui/components/dialog"
import { Input } from "@codecity/ui/components/input"
import { Button } from "@codecity/ui/components/button"
import { analyze, isTauri } from "@/lib/tauri"

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
      const result = await analyze(url.trim(), { visibility })

      if (result.snapshot) {
        onOpenChange(false)
        router.push(`/project?id=${encodeURIComponent(result.projectId)}`)
        return
      }

      queryClient.invalidateQueries({ queryKey: ["projects"] })
      onOpenChange(false)
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Analysis failed"
      setError(msg)
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
      <DialogContent className="overflow-hidden rounded-lg border border-white/[0.10] bg-[#101012] p-0 shadow-lg sm:max-w-[420px]">
        <div className="relative p-5">
          {/* Header */}
          <DialogHeader className="mb-5">
            <div className="flex items-center gap-3">
              <div className="relative flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-md border border-white/[0.08] bg-white/[0.03]">
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
                <DialogDescription className="mt-1 text-xs leading-none text-zinc-500">
                  {isTauri() ? "GitHub URL or local folder path" : "Visualize a GitHub repository as a 3D city"}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* URL input */}
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-zinc-400">
                {isTauri() ? "GitHub URL or Local Path" : "Repository URL"}
              </label>
              <div className="relative">
                {isTauri() && (url.startsWith("/") || url.startsWith("~")) ? (
                  <FolderOpen className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-zinc-600 pointer-events-none" />
                ) : (
                  <GitBranch className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-zinc-600 pointer-events-none" />
                )}
                <Input
                  type={isTauri() ? "text" : "url"}
                  placeholder={isTauri() ? "https://github.com/owner/repo or ~/code/myapp" : "https://github.com/owner/repo"}
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  disabled={submitting}
                  className="h-10 rounded-md border-white/[0.10] bg-[#0b0b0c] pl-9 font-mono text-[12px] text-zinc-200 transition-colors placeholder:text-zinc-700 focus-visible:border-primary/50 focus-visible:ring-0"
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
                      className={`rounded-md border px-2 py-1 font-mono text-[10px] transition-colors ${
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
                <label className="block text-xs font-medium text-zinc-400">
                  Visibility
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(["PRIVATE", "PUBLIC"] as const).map((v) => (
                    <label
                      key={v}
                      className={`flex cursor-pointer items-center gap-2.5 rounded-md border px-3 py-2.5 transition-colors ${
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
                      <div className={`flex size-6 shrink-0 items-center justify-center rounded-md transition-colors ${
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
              <div className="rounded-md border border-primary/15 bg-primary/[0.04] px-4 py-4 text-center">
                <div className="flex items-center justify-center gap-2.5 mb-1.5">
                  <span className="h-3.5 w-3.5 rounded-full border-2 border-primary/30 border-t-primary animate-spin shrink-0" />
                  <span className="text-[12px] font-mono text-zinc-300">Queuing analysis…</span>
                </div>
                <p className="font-mono text-[10px] text-zinc-700">Progress will appear on your dashboard</p>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="rounded-md border border-red-500/20 bg-red-500/[0.05] px-3 py-2.5">
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
                  className="h-9 flex-1 rounded-md border-white/[0.10] bg-transparent text-[12px] text-zinc-500 transition-colors hover:border-white/[0.16] hover:bg-white/[0.04] hover:text-zinc-200"
                >
                  Cancel
                </Button>
              )}
              <Button
                type="submit"
                disabled={submitting}
                className={`h-9 rounded-md bg-primary text-[12px] font-semibold text-white transition-colors hover:bg-primary/90 ${submitting ? "w-full" : "flex-[2]"}`}
              >
                {submitting ? (
                  "Building City…"
                ) : (
                  <span className="flex items-center justify-center gap-1.5">
                    <GitBranch className="h-3.5 w-3.5" />
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
