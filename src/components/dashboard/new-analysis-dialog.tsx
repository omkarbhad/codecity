"use client"

import { useEffect, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { open as openDialog } from "@tauri-apps/plugin-dialog"
import { FolderOpenIcon, GithubIcon, GitBranchIcon, LoaderCircleIcon } from "@/components/ui/icons"
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
import { AppIcon } from "@/components/ui/app-icon"
import { LogoMark } from "@/components/logo"

const QUICK_REPOS = [
  { label: "vercel/next.js", url: "https://github.com/vercel/next.js" },
  { label: "pmndrs/zustand", url: "https://github.com/pmndrs/zustand" },
  { label: "trpc/trpc", url: "https://github.com/trpc/trpc" },
  { label: "shadcn-ui/ui", url: "https://github.com/shadcn-ui/ui" },
]

type SourceMode = "github" | "local"

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

  // Radix only calls onOpenChange for its own open/close events, so a dialog the parent
  // opens through `open` must reset (and prefill) here, not in the onOpenChange handler.
  useEffect(() => {
    if (!open) return
    setUrl(initialInput ?? "")
    setSourceMode("github")
    setError(null)
    setSubmitting(false)
  }, [open, initialInput])

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
        if (!submitting) onOpenChange(next)
      }}
    >
      <DialogContent className="overflow-hidden rounded-[16px] border border-(--border-pixel) bg-(--bg) p-0 shadow-(--shadow-lg) sm:max-w-[440px]">
        <div className="relative p-5">
          {/* Header */}
          <DialogHeader className="mb-5">
            <div className="flex items-center gap-3">
              <LogoMark className="size-9" />
              <div>
                <DialogTitle className="text-[15px] font-semibold text-[var(--cream)] leading-none">
                  New city
                </DialogTitle>
                <DialogDescription className="mt-1.5 text-[13px] leading-none text-(--muted)">
                  {sourceMode === "local" ? "Analyze files from this computer" : "Download a GitHub repo and build a city"}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!submitting && isTauri() && (
              <div className="cc-seg w-full" role="group" aria-label="Source">
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
                      aria-pressed={active}
                      className="cc-seg-btn h-8 flex-1 justify-center"
                    >
                      <AppIcon icon={item.icon} className="size-3.5" />
                      {item.label}
                    </button>
                  )
                })}
              </div>
            )}

            {/* URL input */}
            <div className="space-y-1.5">
              <label htmlFor="new-city-source" className="block text-[12px] font-medium text-(--muted)">
                {sourceMode === "local" ? "Folder path" : "Repository URL"}
              </label>
              <div className="flex gap-2">
                <div className="relative min-w-0 flex-1">
                {sourceMode === "local" || (isTauri() && (url.startsWith("/") || url.startsWith("~"))) ? (
                  <AppIcon icon={FolderOpenIcon} className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-[var(--muted)] pointer-events-none" />
                ) : (
                  <AppIcon icon={GitBranchIcon} className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-[var(--muted)] pointer-events-none" />
                )}
                <Input
                  id="new-city-source"
                  type={isTauri() ? "text" : "url"}
                  placeholder={sourceMode === "local" ? "/Users/you/code/project" : "https://github.com/owner/repo"}
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  disabled={submitting}
                  className="h-10 pl-9"
                  required
                />
                </div>
                {isTauri() && sourceMode === "local" && !submitting && (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleBrowseFolder}
                    className="h-10 shrink-0"
                  >
                    Browse
                  </Button>
                )}
              </div>

              {/* Quick picks */}
              {!submitting && sourceMode === "github" && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {QUICK_REPOS.map((repo) => (
                    <button
                      key={repo.url}
                      type="button"
                      onClick={() => setUrl(repo.url)}
                      className={`h-6 rounded-full px-2.5 text-[12px] transition-colors ${
                        url === repo.url ? "bg-(--bg-on) text-(--cream)" : "bg-(--bg-card) text-(--cream-dark) hover:bg-(--bg-raised) hover:text-(--cream)"
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
              <div className="rounded-[10px] bg-(--bg-card) px-4 py-4 text-center">
                <div className="flex items-center justify-center gap-2.5">
                  <AppIcon icon={LoaderCircleIcon} className="size-4 shrink-0 animate-spin text-primary" />
                  <span className="text-[12px] text-[var(--cream)]">
                    Adding city to queue…
                  </span>
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="rounded-[10px] bg-[color-mix(in_srgb,var(--sev-high)_12%,transparent)] px-3 py-2.5">
                <p className="text-[12px] text-[var(--sev-high)]">{error}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-1">
              {!submitting && (
                <Button
                  type="button"
                  onClick={() => onOpenChange(false)}
                  variant="secondary"
                  className="h-10 flex-1"
                >
                  Cancel
                </Button>
              )}
              <Button
                type="submit"
                disabled={submitting}
                className={`h-10 bg-primary text-[12px] font-semibold text-primary-foreground transition-colors active:translate-y-px rounded-full hover:brightness-105 ${submitting ? "w-full" : "flex-[2]"}`}
              >
                {submitting ? (
                  "Queueing…"
                ) : (
                  <span className="flex items-center justify-center gap-1.5">
                    {sourceMode === "local" ? <AppIcon icon={FolderOpenIcon} className="size-3.5" /> : <AppIcon icon={GitBranchIcon} className="size-3.5" />}
                    {sourceMode === "local" ? "Analyze folder" : "Start analysis"}
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
