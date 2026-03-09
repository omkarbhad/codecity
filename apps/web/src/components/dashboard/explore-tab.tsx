"use client"

import { useState } from "react"
import Link from "next/link"
import { Search, FileCode, ArrowUpRight, Users, Code2, ArrowDownAZ, Clock, TrendingUp } from "lucide-react"
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

export function ExploreTab() {
  const [search, setSearch] = useState("")
  const [sort, setSort] = useState<SortMode>("recent")

  const { data: projects = [], isLoading } = useQuery<PublicProject[]>({
    queryKey: ["projects", "explore"],
    queryFn: fetchExploreProjects,
  })

  const filtered = sortProjects(
    projects.filter((p) => p.name.toLowerCase().includes(search.toLowerCase())),
    sort
  )

  if (isLoading) {
    return (
      <div className="space-y-5">
        <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-4">
          <div className="h-4 w-32 rounded-lg bg-white/[0.04] animate-pulse mb-2" />
          <div className="h-3 w-48 rounded-lg bg-white/[0.04] animate-pulse" />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-4">
              <div className="h-4 w-3/4 rounded-lg bg-white/[0.04] animate-pulse mb-3" />
              <div className="h-3 w-1/2 rounded-lg bg-white/[0.04] animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Search + sort header */}
      <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] flex flex-col gap-4 p-4 sm:p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.16em] text-[#71717a] font-medium">
            Explore Cities
          </p>
          <p className="mt-1 text-sm text-[#a1a1aa]">
            {filtered.length} shared visualization{filtered.length !== 1 ? "s" : ""} from the community
          </p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* Sort buttons */}
          <div className="flex items-center rounded-lg border border-white/[0.08] bg-white/[0.02] p-0.5">
            {SORT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setSort(opt.value)}
                className={`flex items-center gap-1 rounded-md px-2.5 py-1.5 text-[10px] uppercase tracking-wide font-medium transition-all duration-200 ${
                  sort === opt.value
                    ? "text-white bg-white/[0.06]"
                    : "text-[#71717a] hover:text-white"
                }`}
              >
                <opt.icon className="h-3 w-3" />
                <span className="hidden sm:inline">{opt.label}</span>
              </button>
            ))}
          </div>
          <div className="relative flex-1 sm:w-56 sm:flex-none">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#52525b]" />
            <Input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 rounded-lg bg-white/[0.03] border-white/[0.08] pl-10 text-sm text-zinc-200 placeholder:text-[#52525b] focus-visible:border-indigo-500/45 focus-visible:ring-0 transition-colors duration-200"
            />
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] flex flex-col items-center py-16">
          <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-indigo-500/10">
            <Users className="h-7 w-7 text-indigo-400" />
          </div>
          <p className="mt-4 text-base font-semibold text-[#fafafa]">
            {search ? "No matching cities" : "No public cities yet"}
          </p>
          <p className="mt-1.5 text-sm text-[#a1a1aa] max-w-sm text-center">
            {search
              ? `No cities match "${search}". Try a different search term.`
              : "Be the first to share a city visualization with the community."}
          </p>
        </div>
      ) : (
        <div className="mx-auto grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((project) => (
            <Link key={project.id} href={`/project/${project.id}`}>
              <div className="group rounded-xl bg-white/[0.02] border border-white/[0.06] p-4 sm:p-5 hover:border-[#6366f140] hover:translate-y-[-2px] transition-all duration-300">
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-[#fafafa] truncate">
                    {project.name}
                  </h3>
                  <ArrowUpRight className="h-3.5 w-3.5 text-[#52525b] transition-colors group-hover:text-indigo-400 shrink-0 ml-2" />
                </div>

                <p className="truncate text-[11px] text-[#52525b] mb-3">
                  {project.repoUrl}
                </p>

                {/* File + line stats */}
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex items-center gap-1.5">
                    <FileCode className="h-3 w-3 text-[#52525b]" />
                    <span className="text-[11px] text-[#a1a1aa]">
                      {project.fileCount ?? 0} files
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Code2 className="h-3 w-3 text-[#52525b]" />
                    <span className="text-[11px] text-[#a1a1aa]">
                      {(project.lineCount ?? 0).toLocaleString()} lines
                    </span>
                  </div>
                </div>

                {/* Author + date */}
                <div className="flex items-center justify-between border-t border-white/[0.06] pt-3">
                  <div className="flex items-center gap-2">
                    {project.user.image ? (
                      <img src={project.user.image} alt="" className="h-5 w-5 rounded-full ring-1 ring-white/[0.08]" />
                    ) : (
                      <div className="h-5 w-5 rounded-full bg-white/[0.04] border border-white/[0.08] flex items-center justify-center">
                        <span className="text-[7px] font-bold text-[#a1a1aa]">
                          {(project.user.name ?? "A").charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <span className="text-[11px] text-[#a1a1aa]">
                      {project.user.name ?? "Anonymous"}
                    </span>
                  </div>
                  <span className="text-[10px] text-[#52525b]">
                    {new Date(project.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
