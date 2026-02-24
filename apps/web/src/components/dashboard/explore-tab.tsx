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
        setProjects(data)
        setLoading(false)
      })
  }, [])

  const filtered = projects.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) {
    return <div className="py-12 text-center text-muted-foreground">Loading...</div>
  }

  return (
    <div>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search public projects..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border border-input bg-background py-2 pl-10 pr-4 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="mt-12 text-center text-muted-foreground">
          No public projects found.
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((project) => (
            <a
              key={project.id}
              href={`/city/${project.id}`}
              className="group rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/50"
            >
              <div className="aspect-video rounded-lg bg-muted flex items-center justify-center">
                {project.thumbnailUrl ? (
                  <img
                    src={project.thumbnailUrl}
                    alt={project.name}
                    className="h-full w-full rounded-lg object-cover"
                  />
                ) : (
                  <p className="text-xs text-muted-foreground">No preview</p>
                )}
              </div>

              <h3 className="mt-3 text-sm font-semibold group-hover:text-primary">
                {project.name}
              </h3>

              <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  {project.fileCount} files &middot;{" "}
                  {project.lineCount.toLocaleString()} lines
                </span>
                <span className="flex items-center gap-1">
                  {project.user.image && (
                    <img
                      src={project.user.image}
                      alt=""
                      className="h-4 w-4 rounded-full"
                    />
                  )}
                  {project.user.name ?? "Anonymous"}
                </span>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  )
}
