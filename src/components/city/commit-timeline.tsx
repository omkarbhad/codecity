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
      <div className="flex flex-1 items-center justify-center gap-2 p-4 text-[11px] text-white/45">
        <Loader2 className="size-3 animate-spin" />
        Loading commits
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-3">
        <div className="rounded-md border border-red-500/15 bg-red-500/[0.04] p-3 text-[11px] text-red-400/80">
          {error}
        </div>
      </div>
    )
  }

  if (commits.length === 0) {
    return <p className="p-4 text-center text-xs text-white/35">No commits found</p>
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="border-b border-white/[0.04] p-2">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 size-3 -translate-y-1/2 text-white/35" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Filter commits"
            className="h-7 w-full rounded-md border border-white/[0.07] bg-[#101012] pl-7 pr-7 font-mono text-[11px] text-white/75 outline-none placeholder:text-white/30 focus:border-white/[0.16]"
          />
          {query && (
            <button onClick={() => setQuery("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-white/35 hover:text-white/65">
              <X className="size-3" />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto overscroll-contain scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
        {filteredCommits.map((commit, index) => {
          const isExpanded = expanded === commit.sha
          const files = commit.files.slice(0, 12)

          return (
            <div key={commit.sha} className="border-b border-white/[0.035]">
              <button
                onClick={() => toggleCommit(commit)}
                className={`flex w-full gap-2 px-2.5 py-2 text-left transition-colors hover:bg-white/[0.025] ${isExpanded ? "bg-white/[0.025]" : ""}`}
              >
                <div className="mt-0.5 flex w-8 shrink-0 flex-col items-center gap-1">
                  <span className="font-mono text-[9px] text-white/25">{index + 1}</span>
                  <ChevronDown className={`size-3 text-white/30 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[11px] leading-5 text-white/80">{commit.message || "Untitled commit"}</p>
                  <div className="mt-0.5 flex min-w-0 items-center gap-1.5 font-mono text-[9px] text-white/35">
                    <span className="truncate">{commit.author}</span>
                    <span>{timeAgo(commit.date)}</span>
                    <span className="rounded border border-white/[0.06] px-1 py-px text-white/30">{commit.sha.slice(0, 7)}</span>
                  </div>
                </div>
              </button>

              {isExpanded && (
                <div className="px-10 pb-2">
                  <div className="mb-2 flex items-center gap-1">
                    <button
                      onClick={() => navigator.clipboard?.writeText(commit.sha)}
                      className="flex items-center gap-1 rounded border border-white/[0.07] px-1.5 py-1 text-[10px] text-white/45 transition-colors hover:bg-white/[0.04] hover:text-white/70"
                    >
                      <Copy className="size-3" />
                      SHA
                    </button>
                    <span className="font-mono text-[10px] text-white/30">{commit.files.length} files</span>
                  </div>

                  {loadingFiles === commit.sha ? (
                    <div className="flex items-center gap-1.5 py-1 text-[10px] text-white/35">
                      <Loader2 className="size-3 animate-spin" />
                      Loading changed files
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {files.map((file) => (
                        <div key={file} className="flex items-center gap-1.5 rounded-sm border border-white/[0.05] bg-white/[0.02] px-1.5 py-1">
                          <FileCode className="size-3 shrink-0 text-primary/55" />
                          <span className="truncate font-mono text-[10px] text-white/55">{file}</span>
                        </div>
                      ))}
                      {commit.files.length > files.length && (
                        <p className="px-1 text-[10px] text-white/30">+{commit.files.length - files.length} more files</p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}

        {filteredCommits.length === 0 && (
          <p className="p-4 text-center text-xs text-white/35">No commits match this filter</p>
        )}

        {hasMore && !query && (
          <button
            onClick={loadMore}
            disabled={loadingMore}
            className="flex w-full items-center justify-center gap-1.5 px-3 py-2 text-[11px] text-white/45 transition-colors hover:bg-white/[0.025] hover:text-white/70 disabled:opacity-50"
          >
            {loadingMore && <Loader2 className="size-3 animate-spin" />}
            {loadingMore ? "Loading" : "Load more commits"}
          </button>
        )}
      </div>
    </div>
  )
}
