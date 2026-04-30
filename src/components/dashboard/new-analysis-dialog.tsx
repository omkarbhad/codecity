"use client"

import { useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { open as openDialog } from "@tauri-apps/plugin-dialog"
import { Loader2 } from "lucide-react"
import { FolderOpenIcon, GithubIcon, GitBranchIcon } from "@hugeicons/core-free-icons"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@codecity/ui/components/dialog"
import { Input } from "@codecity/ui/components/input"
import { Button } from "@codecity/ui/components/button"
import { enqueueAnalysis, isTauri } from "@/lib/tauri"
import { HugeIcon } from "@/components/ui/huge-icon"

const QUICK_REPOS = [
  { label: "vercel/next.js", url: "https://github.com/vercel/next.js" },
  { label: "pmndrs/zustand", url: "https://github.com/pmndrs/zustand" },
  { label: "trpc/trpc", url: "https://github.com/trpc/trpc" },
  { label: "shadcn-ui/ui", url: "https://github.com/shadcn-ui/ui" },
]

type SourceMode = "github" | "local"

function normalizeInput(value: string): string {
  return value
    .trim()
    .replace(/^https?:\/\/github\.com\//, "")
    .replace(/\.git$/, "")
    .replace(/\/$/, "")
}

export function NewAnalysisDialog({
  open,
  onOpenChange,
  initialInput,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialInput?: string
}) {
  const [url, setUrl] = useState("")
  const [sourceMode, setSourceMode] = useState<SourceMode>("github")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const queryClient = useQueryClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const input = url.trim()
    if (!input) return
    setSubmitting(true)
    setError(null)

    try {
      await enqueueAnalysis(input)
      queryClient.invalidateQueries({ queryKey: ["projects"] })
      setSubmitting(false)
      onOpenChange(false)
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Analysis failed"
      setError(msg)
      setSubmitting(false)
    }
  }

  async function handleBrowseFolder() {
    try {
      const selected = await openDialog({
        directory: true,
        multiple: false,
        title: "Choose a folder to analyze",
      })
      if (typeof selected === "string") {
        setSourceMode("local")
        setUrl(selected)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not open folder picker")
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!submitting) {
          if (next) {
            setUrl(initialInput ?? "")
            setSourceMode("github")
            setError(null)
            setSubmitting(false)
          } else {
            setError(null)
          }
          onOpenChange(next)
        }
      }}
    >
      <DialogContent className="overflow-hidden rounded-lg border border-white/[0.10] bg-[#101012] p-0 shadow-lg sm:max-w-[440px]">
        <div className="relative p-5">
          {/* Header */}
          <DialogHeader className="mb-5">
            <div className="flex items-center gap-3">
              <img src="/logo.png" alt="CodeCity" className="size-9 shrink-0 rounded-md" />
              <div>
                <DialogTitle className="text-[15px] font-semibold text-zinc-100 leading-none">
                  New City
                </DialogTitle>
                <DialogDescription className="mt-1 text-xs leading-none text-zinc-500">
                  {sourceMode === "local" ? "Analyze files from this computer" : "Download a GitHub repo and build a city"}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!submitting && isTauri() && (
              <div className="grid grid-cols-2 gap-2">
                {([
                  { mode: "github" as const, label: "GitHub", icon: GithubIcon },
                  { mode: "local" as const, label: "Offline folder", icon: FolderOpenIcon },
                ]).map((item) => {
                  const active = sourceMode === item.mode
                  return (
                    <button
                      key={item.mode}
                      type="button"
                      onClick={() => {
                        setSourceMode(item.mode)
                        setUrl("")
                        setError(null)
                      }}
                      className={`flex h-10 items-center justify-center gap-2 rounded-md border text-[12px] font-medium transition-colors ${
                        active
                          ? "border-primary/35 bg-primary/[0.07] text-zinc-100"
                          : "border-white/[0.07] bg-white/[0.02] text-zinc-500 hover:border-white/[0.12] hover:bg-white/[0.04] hover:text-zinc-300"
                      }`}
                    >
                      <HugeIcon icon={item.icon} className="size-3.5" />
                      {item.label}
                    </button>
                  )
                })}
              </div>
            )}

            {/* URL input */}
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-zinc-400">
                {sourceMode === "local" ? "Folder path" : "Repository URL"}
              </label>
              <div className="flex gap-2">
                <div className="relative min-w-0 flex-1">
                {sourceMode === "local" || (isTauri() && (url.startsWith("/") || url.startsWith("~"))) ? (
                  <HugeIcon icon={FolderOpenIcon} className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-zinc-600 pointer-events-none" />
                ) : (
                  <HugeIcon icon={GitBranchIcon} className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-zinc-600 pointer-events-none" />
                )}
                <Input
                  type={isTauri() ? "text" : "url"}
                  placeholder={sourceMode === "local" ? "/Users/you/code/project" : "https://github.com/owner/repo"}
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  disabled={submitting}
                  className="h-10 rounded-md border-white/[0.10] bg-[#0b0b0c] pl-9 font-mono text-[12px] text-zinc-200 transition-colors placeholder:text-zinc-700 focus-visible:border-primary/50 focus-visible:ring-0"
                  required
                />
                </div>
                {isTauri() && sourceMode === "local" && !submitting && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleBrowseFolder}
                    className="h-10 shrink-0 rounded-md border-white/[0.10] bg-white/[0.02] px-3 text-[12px] text-zinc-400 hover:border-white/[0.16] hover:bg-white/[0.04] hover:text-zinc-200"
                  >
                    Browse
                  </Button>
                )}
              </div>

              {/* Quick picks */}
              {!submitting && sourceMode === "github" && (
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {QUICK_REPOS.map((repo) => (
                    <button
                      key={repo.url}
                      type="button"
                      onClick={() => setUrl(repo.url)}
                      className={`rounded-md border px-2 py-1 font-mono text-[10px] transition-colors ${
                        url === repo.url
                          ? "border-primary/40 bg-primary/[0.08] text-primary"
                          : "border-white/[0.07] bg-white/[0.02] text-zinc-600 hover:border-white/[0.12] hover:bg-white/[0.04] hover:text-zinc-300"
                      }`}
                    >
                      {repo.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Submitting state */}
            {submitting && (
              <div className="rounded-md border border-primary/15 bg-primary/[0.04] px-4 py-4 text-center">
                <div className="flex items-center justify-center gap-2.5">
                  <Loader2 className="size-4 shrink-0 animate-spin text-primary" />
                  <span className="text-[12px] font-mono text-zinc-300">
                    Adding city to queue…
                  </span>
                </div>
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
                  "Queueing…"
                ) : (
                  <span className="flex items-center justify-center gap-1.5">
                    {sourceMode === "local" ? <HugeIcon icon={FolderOpenIcon} className="size-3.5" /> : <HugeIcon icon={GitBranchIcon} className="size-3.5" />}
                    {sourceMode === "local" ? "Analyze Folder" : "Start Analysis"}
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
