"use client"

import { useState } from "react"
import Link from "next/link"
import { Search, FileCode, ArrowUpRight, Code2, ArrowDownAZ, Clock, TrendingUp, Globe } from "lucide-react"
import { useQuery } from "@tanstack/react-query"
import { Input } from "@codecity/ui/components/input"

interface PublicProject {
  id: string
  name: string
  repoUrl: string
  fileCount?: number
  lineCount?: number
  thumbnailUrl: string | null
  createdAt: string
  user: { name: string | null; image: string | null }
}

type SortMode = "recent" | "name" | "size"

async function fetchExploreProjects(): Promise<PublicProject[]> {
  const res = await fetch("/api/projects?tab=explore")
  const data = await res.json()
  return Array.isArray(data) ? data : []
}

function sortProjects(projects: PublicProject[], mode: SortMode): PublicProject[] {
  switch (mode) {
    case "name":
      return [...projects].sort((a, b) => a.name.localeCompare(b.name))
    case "size":
      return [...projects].sort((a, b) => (b.fileCount ?? 0) - (a.fileCount ?? 0))
    case "recent":
    default:
      return [...projects].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }
}

const SORT_OPTIONS: { value: SortMode; label: string; icon: typeof Clock }[] = [
  { value: "recent", label: "Recent", icon: Clock },
  { value: "name", label: "A–Z", icon: ArrowDownAZ },
  { value: "size", label: "Largest", icon: TrendingUp },
]

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`
  return n.toString()
}

const MS_PER_DAY = 86_400_000

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const days = Math.floor(diff / MS_PER_DAY)
  if (days === 0) return "today"
  if (days === 1) return "1d ago"
  if (days < 7) return `${days}d ago`
  if (days < 30) return `${Math.floor(days / 7)}w ago`
  return `${Math.floor(days / 30)}mo ago`
}

export function ExploreTab() {
  const [search, setSearch] = useState("")
  const [sort, setSort] = useState<SortMode>("recent")

  const { data: projects = [], isLoading, isError } = useQuery<PublicProject[]>({
    queryKey: ["projects", "explore"],
    queryFn: fetchExploreProjects,
  })

  const filtered = sortProjects(
    projects.filter((p) => p.name.toLowerCase().includes(search.toLowerCase())),
    sort
  )

  if (isError) {
    return (
      <div className="rounded-xl border border-red-500/20 bg-red-500/[0.04] px-6 py-12 text-center">
        <p className="text-[13px] font-mono text-red-400">failed to load community projects</p>
        <p className="text-[11px] text-zinc-600 mt-1">Check your connection and try again</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {/* Header skeleton */}
        <div className="flex items-center justify-between">
          <div className="h-3 w-32 rounded bg-white/[0.04] animate-pulse" />
          <div className="h-8 w-48 rounded-lg bg-white/[0.03] animate-pulse" />
        </div>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="rounded-xl bg-white/[0.02] border border-white/[0.05] p-4 h-28 animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-700">
            {filtered.length} cities
          </span>
          {search && (
            <span className="text-[10px] font-mono text-zinc-600">
              matching &quot;{search}&quot;
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Sort pills */}
          <div className="flex items-center rounded-lg border border-white/[0.07] bg-white/[0.02] p-0.5 gap-0.5">
            {SORT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setSort(opt.value)}
                className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-[10px] font-mono transition-all duration-150 ${
                  sort === opt.value
                    ? "text-zinc-100 bg-white/[0.08]"
                    : "text-zinc-600 hover:text-zinc-300"
                }`}
              >
                <opt.icon className="h-2.5 w-2.5" />
                {opt.label}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-zinc-600" />
            <Input
              type="text"
              placeholder="search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 w-44 rounded-lg bg-white/[0.03] border-white/[0.07] pl-7 text-[12px] font-mono text-zinc-300 placeholder:text-zinc-700 focus-visible:border-primary/35 focus-visible:ring-0 transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Empty state */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-white/[0.05] bg-white/[0.01] flex flex-col items-center py-16">
          <Globe className="h-8 w-8 text-zinc-700 mb-3" />
          <p className="text-[13px] font-mono text-zinc-500">
            {search ? `no results for "${search}"` : "no public cities yet"}
          </p>
          <p className="text-[11px] text-zinc-700 mt-1">
            {search ? "Try a different search term" : "Be the first to share one"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((project, i) => (
            <ProjectCard key={project.id} project={project} rank={i + 1} />
          ))}
        </div>
      )}
    </div>
  )
}

function ProjectCard({ project, rank }: { project: PublicProject; rank: number }) {
  const parts = project.name.split("/")
  const owner = parts[0] ?? ""
  const repo = parts[1] ?? project.name
  const username = project.user?.name || owner || "anon"
  const isTop3 = rank <= 3

  return (
    <Link href={`/project/${project.id}`}>
      <div className={`group relative rounded-xl border bg-[#0a0a0f] overflow-hidden hover:translate-y-[-1px] transition-all duration-200 ${
        isTop3
          ? "border-white/[0.08] hover:border-primary/25"
          : "border-white/[0.05] hover:border-white/[0.10]"
      }`}>
        {/* Top accent */}
        {isTop3 && (
          <div className="h-px w-full bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
        )}

        <div className="p-4">
          {/* Repo header */}
          <div className="flex items-start justify-between mb-3">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-mono text-zinc-700 truncate">{owner}/</p>
              <h3 className="text-[13px] font-semibold text-zinc-100 truncate leading-tight">
                {repo}
              </h3>
            </div>
            <ArrowUpRight className="h-3.5 w-3.5 text-zinc-700 transition-all duration-200 group-hover:text-primary group-hover:translate-x-0.5 group-hover:-translate-y-0.5 shrink-0 ml-2 mt-0.5" />
          </div>

          {/* Stats */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <FileCode className="h-2.5 w-2.5 text-zinc-600" />
              <span className="text-[10px] font-mono text-zinc-500 tabular-nums">
                {formatNumber(project.fileCount ?? 0)}f
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Code2 className="h-2.5 w-2.5 text-zinc-600" />
              <span className="text-[10px] font-mono text-zinc-500 tabular-nums">
                {formatNumber(project.lineCount ?? 0)}l
              </span>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-white/[0.04]">
            <div className="flex items-center gap-1.5">
              {project.user?.image ? (
                <img src={project.user.image} alt="" className="h-4 w-4 rounded-full ring-1 ring-white/[0.08]" />
              ) : (
                <div className="h-4 w-4 rounded-full bg-white/[0.06] border border-white/[0.08] flex items-center justify-center">
                  <span className="text-[6px] font-bold text-zinc-500">
                    {username.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <span className="text-[10px] font-mono text-zinc-600 truncate max-w-[80px]">{username}</span>
            </div>
            <span className="text-[10px] font-mono text-zinc-700">
              {timeAgo(project.createdAt)}
            </span>
          </div>
        </div>
      </div>
    </Link>
  )
}
