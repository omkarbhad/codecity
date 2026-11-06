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
      <DialogContent className="pixel-shadow-lg overflow-hidden rounded-none border-2 border-[var(--border-light)] bg-card p-0 sm:max-w-[440px]">
        <div className="relative p-5">
          {/* Header */}
          <DialogHeader className="mb-5">
            <div className="flex items-center gap-3">
              <LogoMark className="size-9" />
              <div>
                <DialogTitle className="text-[15px] font-semibold uppercase tracking-[0.05em] text-[var(--cream)] leading-none">
                  New City
                </DialogTitle>
                <DialogDescription className="mt-1.5 text-xs leading-none text-[var(--cream-dark)]">
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
                      className={`flex h-10 items-center justify-center gap-2 rounded-none border-2 text-[11px] font-medium uppercase tracking-[0.05em] transition-colors ${
                        active
                          ? "pixel-shadow-sm border-primary bg-[color-mix(in_srgb,var(--lime)_10%,var(--bg-card))] text-[var(--cream)]"
                          : "border-[var(--border-pixel)] bg-[var(--bg-raised)] text-[var(--cream-dark)] hover:border-[var(--border-light)] hover:text-[var(--cream)]"
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
              <label className="block text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--muted)]">
                {sourceMode === "local" ? "Folder path" : "Repository URL"}
              </label>
              <div className="flex gap-2">
                <div className="relative min-w-0 flex-1">
                {sourceMode === "local" || (isTauri() && (url.startsWith("/") || url.startsWith("~"))) ? (
                  <HugeIcon icon={FolderOpenIcon} className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-[var(--muted)] pointer-events-none" />
                ) : (
                  <HugeIcon icon={GitBranchIcon} className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-[var(--muted)] pointer-events-none" />
                )}
                <Input
                  type={isTauri() ? "text" : "url"}
                  placeholder={sourceMode === "local" ? "/Users/you/code/project" : "https://github.com/owner/repo"}
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  disabled={submitting}
                  className="h-10 rounded-none border-2 border-[var(--border-pixel)] bg-[var(--bg-deep)] pl-9 font-mono text-[12px] text-[var(--cream)] transition-colors placeholder:text-[var(--dim)] focus-visible:border-primary focus-visible:ring-0"
                  required
                />
                </div>
                {isTauri() && sourceMode === "local" && !submitting && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleBrowseFolder}
                    className="pixel-shadow-sm btn-press h-10 shrink-0 rounded-none border-2 border-[var(--border-light)] bg-[var(--bg-raised)] px-3 text-[11px] uppercase tracking-[0.05em] text-[var(--cream-dark)] hover:bg-[var(--bg-raised)] hover:text-[var(--cream)]"
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
                      className={`rounded-none border-2 px-2 py-1 font-mono text-[10px] transition-colors ${
                        url === repo.url
                          ? "border-primary bg-[color-mix(in_srgb,var(--lime)_12%,transparent)] text-primary"
                          : "border-[var(--border-pixel)] bg-[var(--bg-raised)] text-[var(--cream-dark)] hover:border-[var(--border-light)] hover:text-[var(--cream)]"
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
              <div className="rounded-none border-2 border-primary bg-[color-mix(in_srgb,var(--lime)_6%,var(--bg-card))] px-4 py-4 text-center">
                <div className="flex items-center justify-center gap-2.5">
                  <Loader2 className="size-4 shrink-0 animate-spin text-primary" />
                  <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--cream)]">
                    Adding city to queue…
                  </span>
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="rounded-none border-2 border-[var(--sev-high)] bg-[color-mix(in_srgb,var(--sev-high)_8%,var(--bg-card))] px-3 py-2.5">
                <p className="font-mono text-[11px] text-[var(--sev-high)]">{error}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-1">
              {!submitting && (
                <Button
                  type="button"
                  onClick={() => onOpenChange(false)}
                  variant="outline"
                  className="btn-press h-10 flex-1 rounded-none border-2 border-[var(--border-pixel)] bg-transparent text-[11px] uppercase tracking-[0.05em] text-[var(--cream-dark)] transition-colors hover:border-[var(--border-light)] hover:bg-[var(--bg-raised)] hover:text-[var(--cream)]"
                >
                  Cancel
                </Button>
              )}
              <Button
                type="submit"
                disabled={submitting}
                className={`pixel-shadow-accent btn-press h-10 rounded-none border-2 border-(--bg) bg-primary text-[11px] font-semibold uppercase tracking-[0.05em] text-primary-foreground transition-colors hover:bg-primary ${submitting ? "w-full" : "flex-[2]"}`}
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
