"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { ChevronDown, Copy, FileCode, Loader2, Search, X } from "lucide-react"
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
  const [loadingMore, setLoadingMore] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [loadingFiles, setLoadingFiles] = useState<string | null>(null)
  const setHighlightedFiles = useCityStore((s) => s.setHighlightedFiles)

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
  }, [repoUrl, setHighlightedFiles])

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
    try {
      await fetchPage(nextPage, true)
      setPage(nextPage)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load more commits")
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

    setLoadingFiles(commit.sha)
    try {
      const files = await getCommitFiles(repoUrl, commit.sha)
      setCommits((prev) => prev.map((c) => c.sha === commit.sha ? { ...c, files } : c))
      setHighlightedFiles(files)
    } finally {
      setLoadingFiles(null)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center gap-2 p-4 font-mono text-[11px] uppercase tracking-[0.08em] text-(--cream-dark)">
        <Loader2 className="size-3 animate-spin text-primary" />
        Loading commits
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-3">
        <div className="border-2 border-(--sev-high) bg-[color-mix(in_srgb,var(--sev-high)_8%,transparent)] p-3 font-mono text-[11px] text-(--sev-high)">
          {error}
        </div>
      </div>
    )
  }

  if (commits.length === 0) {
    return <p className="p-4 text-center font-mono text-[11px] uppercase tracking-[0.08em] text-(--dim)">No commits found</p>
  }

  return (
    <div className="flex h-full flex-col overflow-hidden border-2 border-(--border-pixel) bg-(--bg-card)">
      <div className="flex shrink-0 items-center gap-2 border-b-2 border-(--border-pixel) bg-(--bg-raised) px-2 py-1.5">
        <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-(--cream)">Commits</span>
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-2 top-1/2 size-3 -translate-y-1/2 text-(--muted)" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="filter…"
            className="h-7 w-full rounded-none border-2 border-(--border-pixel) bg-(--bg-deep) pl-7 pr-7 font-mono text-[11px] text-(--cream) outline-none placeholder:text-(--dim) focus:border-primary"
          />
          {query && (
            <button onClick={() => setQuery("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-(--muted) transition-colors hover:text-(--cream)">
              <X className="size-3" />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto overscroll-contain scroll-thin">
        {filteredCommits.map((commit, index) => {
          const isExpanded = expanded === commit.sha
          const files = commit.files.slice(0, 12)

          return (
            <div key={commit.sha} className="border-b border-dashed border-(--border-pixel)">
              <button
                onClick={() => toggleCommit(commit)}
                className={`flex w-full gap-2 px-2.5 py-2 text-left transition-colors hover:bg-(--bg-raised) ${isExpanded ? "bg-(--bg-raised)" : ""}`}
              >
                <div className="mt-0.5 flex w-8 shrink-0 flex-col items-center gap-1">
                  <span className="font-mono text-[9px] tabular-nums text-(--muted)">{index + 1}</span>
                  <ChevronDown className={`size-3 text-(--muted) transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-mono text-[11px] leading-snug text-(--cream)">{commit.message || "Untitled commit"}</p>
                  <div className="mt-0.5 flex min-w-0 items-center gap-1.5 font-mono text-[9px] text-(--muted)">
                    <span className="truncate">{commit.author}</span>
                    <span className="text-(--dim)">·</span>
                    <span>{timeAgo(commit.date)}</span>
                    <span className="border-2 border-(--border-pixel) bg-(--bg-deep) px-1 py-px font-mono text-[9px] uppercase tracking-[0.05em] text-primary">{commit.sha.slice(0, 7)}</span>
                  </div>
                </div>
              </button>

              {isExpanded && (
                <div className="px-10 pb-2 pt-1">
                  <div className="mb-2 flex items-center gap-1.5">
                    <button
                      onClick={() => navigator.clipboard?.writeText(commit.sha)}
                      className="btn-press flex items-center gap-1 border-2 border-(--border-pixel) bg-(--bg-raised) px-1.5 py-1 font-mono text-[9px] uppercase tracking-[0.05em] text-(--cream-dark) transition-colors hover:border-(--border-light) hover:text-(--cream)"
                    >
                      <Copy className="size-3" />
                      SHA
                    </button>
                    <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-(--muted)">
                      <span className="tabular-nums text-(--cream-dark)">{commit.files.length}</span> files
                    </span>
                  </div>

                  {loadingFiles === commit.sha ? (
                    <div className="flex items-center gap-1.5 py-1 font-mono text-[10px] uppercase tracking-[0.08em] text-(--cream-dark)">
                      <Loader2 className="size-3 animate-spin text-primary" />
                      Loading files
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {files.map((file) => (
                        <div key={file} className="flex items-center gap-1.5 border-2 border-(--border-pixel) bg-(--bg-deep) px-1.5 py-1">
                          <FileCode className="size-3 shrink-0 text-primary" />
                          <span className="truncate font-mono text-[10px] text-(--cream-dark)">{file}</span>
                        </div>
                      ))}
                      {commit.files.length > files.length && (
                        <p className="px-1 font-mono text-[10px] uppercase tracking-[0.08em] text-(--dim)">+<span className="tabular-nums text-(--cream-dark)">{commit.files.length - files.length}</span> more</p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}

        {filteredCommits.length === 0 && (
          <p className="p-4 text-center font-mono text-[11px] uppercase tracking-[0.08em] text-(--dim)">No commits match</p>
        )}

        {hasMore && !query && (
          <button
            onClick={loadMore}
            disabled={loadingMore}
            className="flex w-full items-center justify-center gap-1.5 border-t-2 border-(--border-pixel) bg-(--bg-raised) px-3 py-2 font-mono text-[10px] uppercase tracking-[0.08em] text-(--cream-dark) transition-colors hover:bg-(--bg-card) hover:text-(--cream) disabled:opacity-50"
          >
            {loadingMore && <Loader2 className="size-3 animate-spin text-primary" />}
            {loadingMore ? "Loading" : "Load more"}
          </button>
        )}
      </div>
    </div>
  )
}
