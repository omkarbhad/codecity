"use client"

import { useState, useEffect, useCallback } from "react"
import { FileCode, Loader2 } from "lucide-react"
import { useCityStore } from "./use-city-store"
import { getCommitFiles, getCommits } from "@/lib/tauri"

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
  const mins = Math.floor(diff / 60000)
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
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [loadingFiles, setLoadingFiles] = useState<string | null>(null)
  const setHighlightedFiles = useCityStore((s) => s.setHighlightedFiles)

  const fetchPage = useCallback(async (pageNum: number, append: boolean) => {
    try {
      const newCommits = await getCommits(repoUrl, pageNum)
      if (newCommits.length < 30) setHasMore(false)

      if (append) {
        setCommits((prev) => [...prev, ...newCommits])
      } else {
        setCommits(newCommits)
      }
    } catch { /* fail silently */ }
  }, [repoUrl])

  useEffect(() => {
    async function init() {
      await fetchPage(1, false)
      setLoading(false)
    }
    init()
  }, [fetchPage])

  async function loadMore() {
    const nextPage = page + 1
    setLoadingMore(true)
    await fetchPage(nextPage, true)
    setPage(nextPage)
    setLoadingMore(false)
  }

  async function loadFilesForCommit(sha: string) {
    setLoadingFiles(sha)
    try {
      const files = await getCommitFiles(repoUrl, sha)
      setCommits((prev) =>
        prev.map((c) => (c.sha === sha ? { ...c, files } : c))
      )
      setHighlightedFiles(files)
    } catch { /* skip */ } finally {
      setLoadingFiles(null)
    }
  }

  if (loading || commits.length === 0) return null

  return (
    <div className="flex flex-col h-full overflow-hidden">
          <div className="overflow-y-auto overscroll-contain scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent flex-1">
            {commits.map((commit, i) => {
              const isExpanded = expanded === commit.sha
              const isLast = i === commits.length - 1 && !hasMore
              return (
                <div key={commit.sha} className="relative">
                  {!isLast && (
                    <div className="absolute left-[15px] top-7 bottom-0 w-px bg-white/[0.04]" />
                  )}
                  <button
                    onClick={() => {
                      if (isExpanded) {
                        setExpanded(null)
                        setHighlightedFiles([])
                      } else {
                        setExpanded(commit.sha)
                        if (commit.files.length > 0) {
                          setHighlightedFiles(commit.files)
                        } else {
                          loadFilesForCommit(commit.sha)
                        }
                      }
                    }}
                    className={`w-full text-left px-2.5 py-1.5 hover:bg-white/[0.02] transition-colors flex gap-2 ${isExpanded ? "bg-white/[0.02]" : ""}`}
                  >
                    <div className={`shrink-0 mt-[5px] w-1.5 h-1.5 rounded-full ${
                      i === 0
                        ? "bg-primary shadow-sm shadow-primary/40"
                        : isExpanded
                          ? "bg-white/20"
                          : "bg-white/[0.08]"
                    }`} />

                    <div className="min-w-0 flex-1">
                      <p className={`text-[11px] truncate leading-snug ${isExpanded ? "text-white/90" : "text-white/75"}`}>
                        {commit.message}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[9px] text-white/40 truncate max-w-[100px]">{commit.author}</span>
                        <span className="text-[9px] text-white/15">{timeAgo(commit.date)}</span>
                      </div>

                      {isExpanded && loadingFiles === commit.sha && (
                        <div className="mt-1.5 flex items-center gap-1 text-[10px] text-white/40">
                          <Loader2 className="w-2.5 h-2.5 animate-spin" />
                          Loading files...
                        </div>
                      )}

                      {isExpanded && commit.files.length > 0 && (
                        <div className="mt-1.5 space-y-px">
                          {commit.files.map((file) => (
                            <div
                              key={file}
                              className="flex items-center gap-1 px-1.5 py-0.5 rounded-sm bg-primary/[0.05] border border-primary/[0.08]"
                            >
                              <FileCode className="w-2.5 h-2.5 text-primary/50 shrink-0" />
                              <span className="font-sans text-[9px] text-primary/60 truncate">{file}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </button>
                </div>
              )
            })}

            {hasMore && (
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="w-full px-3 py-2 text-[11px] text-white/65 hover:text-white/65 hover:bg-white/[0.02] transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {loadingMore ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Loading...
                  </>
                ) : (
                  "Load more commits"
                )}
              </button>
            )}
          </div>
    </div>
  )
}
