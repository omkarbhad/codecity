"use client"

import { useState } from "react"
import Link from "next/link"
import { Search, FileCode, ArrowUpRight, Code2, ArrowDownAZ, Clock, TrendingUp, Globe, Sparkles } from "lucide-react"
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
  { value: "name", label: "Name", icon: ArrowDownAZ },
  { value: "size", label: "Size", icon: TrendingUp },
]

function formatNumber(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return n.toString()
}

const MS_PER_DAY = 86_400_000

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const days = Math.floor(diff / MS_PER_DAY)
  if (days === 0) return "today"
  if (days === 1) return "yesterday"
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

  if (isError) {
    return (
      <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] flex flex-col items-center py-20">
        <p className="text-base font-semibold text-zinc-50">Failed to load projects</p>
        <p className="mt-1.5 text-sm text-zinc-400 max-w-sm text-center">
          Something went wrong while fetching community projects. Please try again later.
        </p>
      </div>
    )
  }

  const filtered = sortProjects(
    projects.filter((p) => p.name.toLowerCase().includes(search.toLowerCase())),
    sort
  )

  if (isLoading) {
    return (
      <div className="space-y-5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="rounded-xl bg-white/[0.02] border border-white/[0.06] overflow-hidden">
              <div className="h-32 bg-white/[0.02] animate-pulse" />
              <div className="p-4 space-y-3">
                <div className="h-4 w-3/4 rounded-lg bg-white/[0.04] animate-pulse" />
                <div className="h-3 w-1/2 rounded-lg bg-white/[0.04] animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const featured = filtered.slice(0, 3)
  const rest = filtered.slice(3)

  return (
    <div className="space-y-6">
      {/* Hero header */}
      <div className="relative rounded-2xl bg-gradient-to-br from-primary/[0.08] via-white/[0.02] to-transparent border border-white/[0.06] p-6 sm:p-8 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/[0.06] via-transparent to-transparent" />
        <div className="relative">
          <div className="flex items-center gap-2 mb-2">
            <Globe className="h-4 w-4 text-primary" />
            <span className="text-[10px] uppercase tracking-[0.2em] text-primary font-semibold">Community</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-zinc-50 mb-1.5">
            Explore Cities
          </h1>
          <p className="text-sm text-zinc-400 max-w-lg">
            Discover how teams architect their codebases. Browse {projects.length} public visualization{projects.length !== 1 ? "s" : ""} from the community.
          </p>
        </div>
      </div>

      {/* Search + sort */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <Input
            type="text"
            placeholder="Search repositories..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 rounded-lg bg-white/[0.03] border-white/[0.08] pl-10 text-sm text-zinc-200 placeholder:text-zinc-500 focus-visible:border-primary/45 focus-visible:ring-0 transition-colors duration-200"
          />
        </div>
        <div className="flex items-center rounded-lg border border-white/[0.08] bg-white/[0.02] p-0.5">
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setSort(opt.value)}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[10px] uppercase tracking-wide font-medium transition-all duration-200 ${
                sort === opt.value
                  ? "text-white bg-white/[0.08]"
                  : "text-zinc-500 hover:text-white"
              }`}
            >
              <opt.icon className="h-3 w-3" />
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] flex flex-col items-center py-20">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mb-4">
            <Globe className="h-7 w-7 text-primary" />
          </div>
          <p className="text-base font-semibold text-zinc-50">
            {search ? "No matching cities" : "No public cities yet"}
          </p>
          <p className="mt-1.5 text-sm text-zinc-400 max-w-sm text-center">
            {search
              ? `No cities match "${search}". Try a different search term.`
              : "Be the first to share a city visualization with the community."}
          </p>
        </div>
      ) : (
        <>
          {/* Featured (top 3) — larger cards */}
          {!search && featured.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                <span className="text-[10px] uppercase tracking-[0.16em] text-zinc-500 font-medium">Featured</span>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {featured.map((project) => (
                  <ProjectCard key={project.id} project={project} featured />
                ))}
              </div>
            </div>
          )}

          {/* Rest of the projects */}
          {rest.length > 0 && (
            <div>
              {!search && featured.length > 0 && (
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-[10px] uppercase tracking-[0.16em] text-zinc-500 font-medium">All Projects</span>
                </div>
              )}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {(search ? filtered : rest).map((project) => (
                  <ProjectCard key={project.id} project={project} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function ProjectCard({ project, featured }: { project: PublicProject; featured?: boolean }) {
  const username = project.user?.name || project.name.split("/")[0] || "Anonymous"
  const repoName = project.name.split("/")[1] || project.name

  return (
    <Link href={`/project/${project.id}`}>
      <div className={`group rounded-xl bg-white/[0.02] border border-white/[0.06] overflow-hidden hover:border-primary/25 hover:translate-y-[-2px] transition-all duration-300 ${featured ? "ring-1 ring-primary/[0.08]" : ""}`}>
        {/* Color accent bar */}
        <div className={`h-1 w-full ${featured ? "bg-gradient-to-r from-primary/60 via-primary/30 to-transparent" : "bg-white/[0.04]"}`} />

        <div className="p-4 sm:p-5">
          {/* Repo name + arrow */}
          <div className="flex items-start justify-between mb-1">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] text-zinc-500 truncate">{username}</p>
              <h3 className="text-sm font-semibold text-zinc-50 truncate mt-0.5">
                {repoName}
              </h3>
            </div>
            <ArrowUpRight className="h-4 w-4 text-zinc-500 transition-all group-hover:text-primary group-hover:translate-x-0.5 group-hover:-translate-y-0.5 shrink-0 ml-3 mt-1" />
          </div>

          {/* Stats row */}
          <div className="flex items-center gap-4 mt-3">
            <div className="flex items-center gap-1.5">
              <FileCode className="h-3 w-3 text-zinc-500" />
              <span className="text-[11px] text-zinc-400 tabular-nums">
                {formatNumber(project.fileCount ?? 0)} files
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Code2 className="h-3 w-3 text-zinc-500" />
              <span className="text-[11px] text-zinc-400 tabular-nums">
                {formatNumber(project.lineCount ?? 0)} lines
              </span>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/[0.04]">
            <div className="flex items-center gap-2">
              {project.user?.image ? (
                <img src={project.user.image} alt="" className="h-5 w-5 rounded-full ring-1 ring-white/[0.08]" />
              ) : (
                <div className="h-5 w-5 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 border border-white/[0.08] flex items-center justify-center">
                  <span className="text-[7px] font-bold text-primary/80">
                    {username.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <span className="text-[11px] text-zinc-500">{username}</span>
            </div>
            <span className="text-[10px] text-zinc-500">
              {timeAgo(project.createdAt)}
            </span>
          </div>
        </div>
      </div>
    </Link>
  )
}
