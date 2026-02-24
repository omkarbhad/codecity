"use client"

import { useEffect, useState } from "react"
import { Search } from "lucide-react"

interface PublicProject {
  id: string
  name: string
  repoUrl: string
  fileCount: number
  lineCount: number
  thumbnailUrl: string | null
  createdAt: string
  user: { name: string | null; image: string | null }
}

export function ExploreTab() {
  const [projects, setProjects] = useState<PublicProject[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  useEffect(() => {
    fetch("/api/projects?tab=explore")
      .then((r) => r.json())
      .then((data) => {
        setProjects(Array.isArray(data) ? data : [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const filtered = projects.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) {
    return (
      <div className="py-20 text-center">
        <div className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
      </div>
    )
  }

  return (
    <div>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/40" />
        <input
          type="text"
          placeholder="Search public projects..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border border-border/30 bg-card/30 py-2.5 pl-10 pr-4 font-mono text-xs text-foreground placeholder:text-muted-foreground/30 backdrop-blur-sm focus:outline-none focus:border-primary/30 transition-colors"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="mt-16 text-center">
          <p className="text-sm text-muted-foreground">No public projects found</p>
          <p className="mt-1 font-mono text-xs text-muted-foreground/50">
            Be the first to share a city visualization
          </p>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((project) => (
            <a
              key={project.id}
              href={`/city/${project.id}`}
              className="group rounded-xl border border-border/30 bg-card/20 p-4 transition-all hover:border-primary/30 hover:bg-card/40"
            >
              <div className="relative aspect-video overflow-hidden rounded-lg bg-background/50 border border-border/20">
                <div className="absolute inset-0 bg-grid-fine opacity-20" />
                {/* City silhouette */}
                <div className="absolute inset-0 flex items-end justify-center pb-3">
                  <div className="flex items-end gap-0.5 opacity-15">
                    {Array.from({ length: 12 }, (_, i) => (
                      <div
                        key={i}
                        className="w-1.5 rounded-t-[1px] bg-primary"
                        style={{ height: `${20 + Math.random() * 40}px` }}
                      />
                    ))}
                  </div>
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="font-mono text-[9px] tracking-widest uppercase text-primary/30">
                    Preview
                  </span>
                </div>
              </div>

              <h3 className="mt-3 text-sm font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                {project.name}
              </h3>

              <div className="mt-1.5 flex items-center justify-between">
                <span className="font-mono text-[10px] text-muted-foreground">
                  {project.fileCount} files · {project.lineCount.toLocaleString()} loc
                </span>
                <div className="flex items-center gap-1.5">
                  {project.user.image && (
                    <img src={project.user.image} alt="" className="h-4 w-4 rounded-full" />
                  )}
                  <span className="font-mono text-[10px] text-muted-foreground/60">
                    {project.user.name ?? "Anonymous"}
                  </span>
                </div>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  )
}
