"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { TriangleAlertIcon, ChevronDownIcon, XIcon, CopyIcon, GitCommitHorizontalIcon, LoaderCircleIcon, SearchIcon, CheckIcon, RefreshCwIcon } from "@/components/ui/icons"
import { FileIcon } from "./file-icons"
import { AppIcon } from "@/components/ui/app-icon"
import { getCommitFiles, getCommits } from "@/lib/tauri"
import { useCityStore } from "./use-city-store"

interface Commit {
  sha: string
  message: string
  author: string
  date: string
  files: string[]
}

interface CommitTimelineProps {
  repoUrl: string
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.max(0, Math.floor(diff / 60000))
  if (mins < 60) return `${mins}m`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d`
  if (days < 30) return `${Math.floor(days / 7)}w`
  return `${Math.floor(days / 30)}mo`
}

export function CommitTimeline({ repoUrl }: CommitTimelineProps) {
  const [commits, setCommits] = useState<Commit[]>([])
  const [query, setQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)
  const [loadingMore, setLoadingMore] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [loadingFiles, setLoadingFiles] = useState<string | null>(null)
  const [filesError, setFilesError] = useState<Record<string, string>>({})
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null)
  const [copiedSha, setCopiedSha] = useState<string | null>(null)
  const setHighlightedFiles = useCityStore((s) => s.setHighlightedFiles)

  // Don't leave commit highlights behind when the panel closes.
  useEffect(() => () => setHighlightedFiles([]), [setHighlightedFiles])

  const fetchPage = useCallback(async (pageNum: number, append: boolean) => {
    const newCommits = await getCommits(repoUrl, pageNum)
    if (newCommits.length < 30) setHasMore(false)
    setCommits((prev) => append ? [...prev, ...newCommits] : newCommits)
  }, [repoUrl])

  useEffect(() => {
    let cancelled = false
    async function init() {
      setLoading(true)
      setError(null)
      setHighlightedFiles([])
      try {
        const newCommits = await getCommits(repoUrl, 1)
        if (cancelled) return
        setCommits(newCommits)
        setHasMore(newCommits.length >= 30)
        setPage(1)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load commits")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    init()
    return () => { cancelled = true }
  }, [repoUrl, setHighlightedFiles, attempt])

  const filteredCommits = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return commits
    return commits.filter((commit) =>
      commit.message.toLowerCase().includes(needle) ||
      commit.author.toLowerCase().includes(needle) ||
      commit.sha.toLowerCase().includes(needle)
    )
  }, [commits, query])

  async function loadMore() {
    const nextPage = page + 1
    setLoadingMore(true)
    setLoadMoreError(null)
    try {
      await fetchPage(nextPage, true)
      setPage(nextPage)
    } catch (err) {
      // Keep the commits already loaded; show the failure next to the button.
      setLoadMoreError(err instanceof Error ? err.message : "Could not load more commits")
    } finally {
      setLoadingMore(false)
    }
  }

  async function toggleCommit(commit: Commit) {
    if (expanded === commit.sha) {
      setExpanded(null)
      setHighlightedFiles([])
      return
    }

    setExpanded(commit.sha)
    if (commit.files.length > 0) {
      setHighlightedFiles(commit.files)
      return
    }

    await loadCommitFiles(commit)
  }

  async function loadCommitFiles(commit: Commit) {
    setLoadingFiles(commit.sha)
    setFilesError((prev) => {
      const { [commit.sha]: _, ...rest } = prev
      return rest
    })
    try {
      const files = await getCommitFiles(repoUrl, commit.sha)
      setCommits((prev) => prev.map((c) => c.sha === commit.sha ? { ...c, files } : c))
      setHighlightedFiles(files)
    } catch (err) {
      setFilesError((prev) => ({ ...prev, [commit.sha]: err instanceof Error ? err.message : "Could not load changed files" }))
    } finally {
      setLoadingFiles(null)
    }
  }

  function copySha(sha: string) {
    navigator.clipboard?.writeText(sha).then(() => {
      setCopiedSha(sha)
      setTimeout(() => setCopiedSha((current) => (current === sha ? null : current)), 1500)
    })
  }

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center gap-2 p-4 text-[12px] text-(--cream-dark)">
        <AppIcon icon={LoaderCircleIcon} className="size-3.5 animate-spin text-primary" />
        Loading commits
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-3">
        <div className="flex items-start gap-2 border border-(--sev-high) bg-[color-mix(in_srgb,var(--sev-high)_8%,transparent)] p-3 text-[12px] text-(--sev-high) rounded-md">
          <AppIcon icon={TriangleAlertIcon} className="mt-px size-3.5 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="break-words">{error}</p>
            <button
              type="button"
              onClick={() => setAttempt((n) => n + 1)}
              className="mt-2 inline-flex h-7 items-center gap-1.5 rounded-full border border-(--sev-high) px-3 text-[12px] font-medium hover:bg-[color-mix(in_srgb,var(--sev-high)_12%,transparent)] focus-visible:outline-2 focus-visible:outline-(--sev-high)"
            >
              <AppIcon icon={RefreshCwIcon} className="size-3" />
              Try again
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (commits.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
        <AppIcon icon={GitCommitHorizontalIcon} className="size-5 text-(--dim)" />
        <p className="text-[11px] text-(--muted)">No commits found</p>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex shrink-0 items-center gap-2 border-b border-(--border-pixel) px-3 py-2.5">
        <div className="relative flex-1">
          <AppIcon icon={SearchIcon} className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-(--muted)" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Filter commits…"
            aria-label="Filter commits"
            className="h-8 w-full rounded-[10px] border border-transparent bg-(--bg-card) pl-8 pr-8 text-[13px] text-(--cream) outline-none placeholder:text-(--muted) focus:border-(--border-light)"
          />
          {query && (
            <button type="button" onClick={() => setQuery("")} aria-label="Clear commit filter" title="Clear filter" className="absolute right-1 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center text-(--muted) transition-colors hover:text-(--cream)">
              <AppIcon icon={XIcon} className="size-3.5" />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto overscroll-contain scroll-thin">
        {filteredCommits.map((commit, index) => {
          const isExpanded = expanded === commit.sha
          const files = commit.files.slice(0, 12)

          return (
            <div key={commit.sha} className="border-b border-(--border-pixel)">
              <button
                type="button"
                onClick={() => toggleCommit(commit)}
                aria-expanded={isExpanded}
                className={`flex w-full gap-2 px-2.5 py-2 text-left transition-colors hover:bg-(--bg-raised) ${isExpanded ? "bg-(--bg-raised)" : ""}`}
              >
                <div className="mt-0.5 flex w-8 shrink-0 flex-col items-center gap-1">
                  <span className="text-[11px] tabular-nums text-(--muted)">{index + 1}</span>
                  <AppIcon icon={ChevronDownIcon} className={`size-3.5 text-(--muted) transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12px] leading-snug text-(--cream)">{commit.message || "Untitled commit"}</p>
                  <div className="mt-0.5 flex min-w-0 items-center gap-1.5 text-[11px] text-(--muted)">
                    <span className="truncate">{commit.author}</span>
                    <span>{timeAgo(commit.date)}</span>
                    <span className="border border-(--border-pixel) bg-(--bg-deep) px-1 py-px text-[11px] text-primary rounded-md">{commit.sha.slice(0, 7)}</span>
                  </div>
                </div>
              </button>

              {isExpanded && (
                <div className="px-10 pb-2 pt-1">
                  <div className="mb-2 flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => copySha(commit.sha)}
                      aria-label={`Copy commit SHA ${commit.sha.slice(0, 7)}`}
                      className="flex items-center gap-1 px-1.5 py-1 text-[11px] text-(--cream-dark) transition-colors hover:text-(--cream) active:translate-y-px bg-(--bg-card) hover:bg-(--bg-raised) rounded-full"
                    >
                      <AppIcon icon={copiedSha === commit.sha ? CheckIcon : CopyIcon} className={`size-3.5 ${copiedSha === commit.sha ? "text-(--lime)" : ""}`} />
                      {copiedSha === commit.sha ? "Copied" : "SHA"}
                    </button>
                    <span className="text-[11px] text-(--muted)">
                      <span className="tabular-nums text-(--cream-dark)">{commit.files.length}</span> files
                    </span>
                  </div>

                  {loadingFiles === commit.sha ? (
                    <div className="flex items-center gap-1.5 py-1 text-[11px] text-(--cream-dark)">
                      <AppIcon icon={LoaderCircleIcon} className="size-3.5 animate-spin text-primary" />
                      Loading files
                    </div>
                  ) : filesError[commit.sha] ? (
                    <div className="flex items-center justify-between gap-2 bg-[color-mix(in_srgb,var(--sev-high)_14%,transparent)] px-2 py-1.5 text-[11px] text-(--sev-high) rounded-full">
                      <span className="min-w-0 truncate" title={filesError[commit.sha]}>{filesError[commit.sha]}</span>
                      <button type="button" onClick={() => loadCommitFiles(commit)} className="shrink-0 underline-offset-2 hover:underline">
                        Retry
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {files.map((file) => (
                        <div key={file} className="flex items-center gap-1.5 border border-(--border-pixel) bg-(--bg-deep) px-1.5 py-1 rounded-md">
                          <FileIcon name={file.split("/").pop() ?? file} className="!size-3.5" />
                          <span className="truncate text-[11px] text-(--cream-dark)" title={file}>{file}</span>
                        </div>
                      ))}
                      {commit.files.length > files.length && (
                        <p className="px-1 text-[11px] text-(--muted)">+<span className="tabular-nums text-(--cream-dark)">{commit.files.length - files.length}</span> more</p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}

        {filteredCommits.length === 0 && (
          <p className="p-4 text-center text-[12px] text-(--muted)">No commits match</p>
        )}

        {hasMore && !query && (
          <>
            {loadMoreError && (
              <p className="border-t border-(--border-pixel) px-3 py-1.5 text-[11px] text-(--sev-high)">{loadMoreError}</p>
            )}
            <button
              type="button"
              onClick={loadMore}
              disabled={loadingMore}
              className="flex w-full items-center justify-center gap-1.5 border-t border-(--border-pixel) bg-(--bg-raised) px-3 py-2 text-[11px] text-(--cream-dark) transition-colors hover:bg-(--bg-card) hover:text-(--cream) disabled:opacity-50"
            >
              {loadingMore && <AppIcon icon={LoaderCircleIcon} className="size-3.5 animate-spin text-primary" />}
              {loadingMore ? "Loading" : loadMoreError ? "Try again" : "Load more"}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
