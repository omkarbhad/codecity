"use client"

import { useState } from "react"
import Link from "next/link"
import { Search, FileCode, ArrowUpRight, Users, Code2, ArrowDownAZ, Clock, TrendingUp } from "lucide-react"
import { useQuery } from "@tanstack/react-query"
import { Card, CardContent } from "@codecity/ui/components/card"
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

/** Procedural mini cityscape for card previews */
function CityPreview({ name }: { name: string }) {
  const seed = name.split("").reduce((a, c) => a + c.charCodeAt(0), 0)
  return (
    <div className="absolute inset-0 flex items-end justify-center pb-3 overflow-hidden">
      <div className="flex items-end gap-[3px] opacity-25">
        {Array.from({ length: 14 }, (_, i) => (
          <div
            key={i}
            className="rounded-t-sm bg-primary"
            style={{
              width: `${3 + ((seed + i) % 3)}px`,
              height: `${14 + ((seed * (i + 1) * 7 + 13) % 44)}px`,
            }}
          />
        ))}
      </div>
    </div>
  )
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
  { value: "name", label: "A-Z", icon: ArrowDownAZ },
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
        <div className="panel-surface p-4">
          <div className="h-4 w-32 rounded bg-muted/50 animate-pulse mb-2" />
          <div className="h-3 w-48 rounded bg-muted/30 animate-pulse" />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border/35 bg-card/45 overflow-hidden">
              <div className="aspect-[16/9] bg-muted/10 animate-pulse" />
              <div className="p-3 space-y-2">
                <div className="h-4 w-3/4 rounded bg-muted/30 animate-pulse" />
                <div className="h-3 w-1/2 rounded bg-muted/20 animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Search + sort */}
      <div className="panel-surface flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground/70">
            Explore Cities
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {filtered.length} shared visualization{filtered.length !== 1 ? "s" : ""} from the community
          </p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* Sort buttons */}
          <div className="flex items-center rounded-lg border border-border/40 bg-card/40 p-0.5">
            {SORT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setSort(opt.value)}
                className={`flex items-center gap-1 rounded-md px-2 py-1.5 font-mono text-[10px] uppercase tracking-wide transition-all ${
                  sort === opt.value
                    ? "bg-primary text-white"
                    : "text-muted-foreground/60 hover:text-foreground"
                }`}
              >
                <opt.icon className="h-3 w-3" />
                <span className="hidden sm:inline">{opt.label}</span>
              </button>
            ))}
          </div>
          <div className="relative flex-1 sm:w-56 sm:flex-none">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 border-border/40 bg-background/55 pl-10 font-mono text-xs placeholder:text-muted-foreground/50 focus-visible:border-primary/50 focus-visible:ring-primary/30"
            />
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card className="border-border/40 bg-card/55 backdrop-blur-sm">
          <CardContent className="flex flex-col items-center py-16">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-card border border-border">
              <Users className="h-7 w-7 text-muted-foreground/50" />
            </div>
            <p className="mt-4 text-base font-semibold text-foreground">
              {search ? "No matching cities" : "No public cities yet"}
            </p>
            <p className="mt-1.5 text-sm text-muted-foreground max-w-sm text-center">
              {search
                ? `No cities match "${search}". Try a different search term.`
                : "Be the first to share a city visualization with the community."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="mx-auto grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((project) => (
            <Link key={project.id} href={`/project/${project.id}`}>
              <Card className="group overflow-hidden border-border/35 bg-card/45 transition-all duration-200 hover:border-primary/45 hover:shadow-[0_14px_30px_rgba(0,0,0,0.32)]">
                {/* Preview */}
                <div className="relative aspect-[16/9] border-b border-border/30 bg-gradient-to-b from-primary/[0.08] to-transparent">
                  <CityPreview name={project.name} />
                  <div className="absolute right-2.5 top-2.5">
                    <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                </div>

                <CardContent className="p-3">
                  <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                    {project.name}
                  </h3>

                  <p className="mt-1 truncate font-mono text-[11px] text-muted-foreground/60">
                    {project.repoUrl}
                  </p>

                  <div className="mt-2.5 flex items-center gap-2.5">
                    <div className="flex items-center gap-1.5">
                      <FileCode className="h-3 w-3 text-muted-foreground" />
                      <span className="font-mono text-[11px] text-muted-foreground">
                        {project.fileCount ?? 0} files
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Code2 className="h-3 w-3 text-muted-foreground" />
                      <span className="font-mono text-[11px] text-muted-foreground">
                        {(project.lineCount ?? 0).toLocaleString()} lines
                      </span>
                    </div>
                  </div>

                  {/* Author */}
                  <div className="mt-2.5 flex items-center gap-2 border-t border-border/30 pt-2.5">
                    {project.user.image ? (
                      <img src={project.user.image} alt="" className="h-5 w-5 rounded-full ring-1 ring-border" />
                    ) : (
                      <div className="h-5 w-5 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                        <span className="font-mono text-[7px] font-bold text-primary">
                          {(project.user.name ?? "A").charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <span className="font-mono text-[11px] text-muted-foreground">
                      {project.user.name ?? "Anonymous"}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
