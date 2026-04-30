"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { open as openDialog } from "@tauri-apps/plugin-dialog"
import { Globe, Lock, GitBranch, FolderOpen, Loader2, Search } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@codecity/ui/components/dialog"
import { Input } from "@codecity/ui/components/input"
import { Button } from "@codecity/ui/components/button"
import { analyze, getProjects, isTauri, listGithubRepos, type GitHubRepoSummary } from "@/lib/tauri"
import { LogoIcon } from "@/components/logo"

const QUICK_REPOS = [
  { label: "vercel/next.js", url: "https://github.com/vercel/next.js" },
  { label: "pmndrs/zustand", url: "https://github.com/pmndrs/zustand" },
  { label: "trpc/trpc", url: "https://github.com/trpc/trpc" },
  { label: "shadcn-ui/ui", url: "https://github.com/shadcn-ui/ui" },
]

type SourceMode = "github" | "local"
type RepoVisibility = "all" | "private" | "public"

interface AnalysisProgress {
  progress: number
  stage: string
  message: string
  filesDiscovered: number
  filesParsed: number
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`
  return n.toString()
}

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
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [url, setUrl] = useState("")
  const [sourceMode, setSourceMode] = useState<SourceMode>("github")
  const [repoVisibility, setRepoVisibility] = useState<RepoVisibility>("private")
  const [repoSearch, setRepoSearch] = useState("")
  const [visibility, setVisibility] = useState<"PUBLIC" | "PRIVATE">("PRIVATE")
  const [submitting, setSubmitting] = useState(false)
  const [submittedInput, setSubmittedInput] = useState("")
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const queryClient = useQueryClient()

  const {
    data: githubRepos = [],
    isError: reposErrored,
    isLoading: reposLoading,
  } = useQuery<GitHubRepoSummary[]>({
    queryKey: ["github-repos", repoVisibility],
    enabled: open && sourceMode === "github" && isTauri() && !submitting,
    queryFn: () => listGithubRepos(repoVisibility),
  })

  const filteredRepos = githubRepos.filter((repo) =>
    repo.full_name.toLowerCase().includes(repoSearch.toLowerCase())
  )

  const { data: liveProgress } = useQuery<AnalysisProgress | null>({
    queryKey: ["analysis-progress", submittedInput],
    enabled: submitting && !!submittedInput,
    refetchInterval: 700,
    queryFn: async () => {
      const projects = await getProjects()
      const normalizedInput = normalizeInput(submittedInput)
      const project = projects.find((p) => normalizeInput(p.repo_url) === normalizedInput)
      if (!project) return null

      return {
        progress: Math.max(0, Math.min(100, Number(project.progress ?? 0))),
        stage: project.progress_stage ?? "queued",
        message: project.progress_message ?? "Queued",
        filesDiscovered: Number(project.files_discovered ?? 0),
        filesParsed: Number(project.files_parsed ?? 0),
      }
    },
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const input = url.trim()
    if (!input) return
    setSubmitting(true)
    setSubmittedInput(input)
    setError(null)

    try {
      const result = await analyze(input, { visibility })

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
            setUrl("")
            setSourceMode("github")
            setRepoVisibility("private")
            setRepoSearch("")
            setSubmittedInput("")
            setError(null)
            setSubmitting(false)
            setVisibility("PRIVATE")
          } else {
            setError(null)
            setSubmittedInput("")
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
              <div className="flex size-9 shrink-0 items-center justify-center rounded-md border border-white/[0.08] bg-white/[0.04] text-primary">
                <LogoIcon className="size-5" />
              </div>
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
                  { mode: "github" as const, label: "GitHub", icon: GitBranch },
                  { mode: "local" as const, label: "Offline folder", icon: FolderOpen },
                ]).map((item) => {
                  const Icon = item.icon
                  const active = sourceMode === item.mode
                  return (
                    <button
                      key={item.mode}
                      type="button"
                      onClick={() => {
                        setSourceMode(item.mode)
                        setUrl("")
                        setRepoSearch("")
                        setError(null)
                      }}
                      className={`flex h-10 items-center justify-center gap-2 rounded-md border text-[12px] font-medium transition-colors ${
                        active
                          ? "border-primary/35 bg-primary/[0.07] text-zinc-100"
                          : "border-white/[0.07] bg-white/[0.02] text-zinc-500 hover:border-white/[0.12] hover:bg-white/[0.04] hover:text-zinc-300"
                      }`}
                    >
                      <Icon className="size-3.5" />
                      {item.label}
                    </button>
                  )
                })}
              </div>
            )}

            {!submitting && sourceMode === "github" && isTauri() && (
              <div className="rounded-md border border-white/[0.08] bg-white/[0.02] p-2">
                <div className="mb-2 grid grid-cols-3 gap-1">
                  {([
                    { value: "private" as const, label: "Private" },
                    { value: "all" as const, label: "All repos" },
                    { value: "public" as const, label: "Public" },
                  ]).map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => setRepoVisibility(item.value)}
                      className={`h-7 rounded-md text-[11px] font-medium transition-colors ${
                        repoVisibility === item.value
                          ? "bg-white/[0.08] text-zinc-100"
                          : "text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-300"
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>

                <div className="relative mb-2">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-zinc-700" />
                  <Input
                    value={repoSearch}
                    onChange={(e) => setRepoSearch(e.target.value)}
                    placeholder="Search repos and orgs"
                    className="h-8 rounded-md border-white/[0.08] bg-[#0b0b0c] pl-8 text-[12px] text-zinc-300 placeholder:text-zinc-700 focus-visible:border-primary/40 focus-visible:ring-0"
                  />
                </div>

                <div className="max-h-44 overflow-y-auto pr-1">
                  {reposLoading ? (
                    <div className="flex h-20 items-center justify-center gap-2 text-[11px] text-zinc-600">
                      <Loader2 className="size-3.5 animate-spin" />
                      Loading repositories
                    </div>
                  ) : reposErrored ? (
                    <div className="flex h-20 items-center justify-center px-4 text-center text-[11px] leading-5 text-zinc-600">
                      Connect GitHub to browse private and organization repositories.
                    </div>
                  ) : filteredRepos.length > 0 ? (
                    <div className="space-y-1">
                      {filteredRepos.slice(0, 30).map((repo) => {
                        const selected = normalizeInput(url) === normalizeInput(repo.html_url)

                        return (
                          <button
                            key={repo.id}
                            type="button"
                            onClick={() => {
                              setUrl(repo.html_url)
                              setVisibility(repo.private ? "PRIVATE" : "PUBLIC")
                              setError(null)
                            }}
                            className={`flex w-full items-center gap-2 rounded-md border px-2.5 py-2 text-left transition-colors ${
                              selected
                                ? "border-primary/35 bg-primary/[0.07]"
                                : "border-transparent hover:border-white/[0.08] hover:bg-white/[0.03]"
                            }`}
                          >
                            {repo.private ? (
                              <Lock className="size-3.5 shrink-0 text-zinc-500" />
                            ) : (
                              <Globe className="size-3.5 shrink-0 text-zinc-500" />
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="truncate font-mono text-[11px] text-zinc-300">
                                {repo.full_name}
                              </p>
                              <p className="mt-0.5 truncate text-[10px] text-zinc-700">
                                {repo.owner_type === "Organization" ? "organization" : "user"} · {repo.default_branch}
                              </p>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="flex h-20 items-center justify-center px-4 text-center text-[11px] leading-5 text-zinc-600">
                      No repositories found for this filter.
                    </div>
                  )}
                </div>
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
                  <FolderOpen className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-zinc-600 pointer-events-none" />
                ) : (
                  <GitBranch className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-zinc-600 pointer-events-none" />
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
                          ? "border-primary/35 bg-primary/[0.06] text-zinc-100"
                          : "border-white/[0.07] bg-white/[0.02] text-zinc-500 hover:border-white/[0.12] hover:bg-white/[0.04] hover:text-zinc-300"
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
                      <div className={`flex size-7 shrink-0 items-center justify-center rounded-md border transition-colors ${
                        visibility === v ? "border-primary/20 bg-primary/10 text-primary" : "border-white/[0.07] bg-white/[0.03] text-zinc-600"
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
                <div className="mb-2 flex items-center justify-center gap-2.5">
                  <Loader2 className="size-4 shrink-0 animate-spin text-primary" />
                  <span className="text-[12px] font-mono text-zinc-300">
                    {liveProgress?.message ?? "Preparing analysis…"}
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-sm bg-white/[0.08]">
                  <div
                    className="h-full rounded-sm bg-primary transition-all duration-500"
                    style={{ width: `${liveProgress?.progress ?? 4}%` }}
                  />
                </div>
                <div className="mt-2 flex items-center justify-between gap-3 font-mono text-[10px] text-zinc-700">
                  <span>{liveProgress?.stage ?? "queued"}</span>
                  <span>{Math.round(liveProgress?.progress ?? 4)}%</span>
                </div>
                {(liveProgress?.filesDiscovered ?? 0) > 0 && (
                  <div className="mt-2 grid grid-cols-2 gap-2 border-t border-white/[0.06] pt-2 text-left">
                    <div>
                      <p className="font-mono text-[10px] text-zinc-700">files found</p>
                      <p className="font-mono text-[12px] text-zinc-300">{formatNumber(liveProgress?.filesDiscovered ?? 0)}</p>
                    </div>
                    <div>
                      <p className="font-mono text-[10px] text-zinc-700">files parsed</p>
                      <p className="font-mono text-[12px] text-zinc-300">{formatNumber(liveProgress?.filesParsed ?? 0)}</p>
                    </div>
                  </div>
                )}
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
                    {sourceMode === "local" ? <FolderOpen className="size-3.5" /> : <GitBranch className="size-3.5" />}
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
