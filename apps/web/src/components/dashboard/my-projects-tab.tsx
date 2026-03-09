"use client"

import { useState } from "react"
import Link from "next/link"
import {
  Plus,
  Globe,
  Lock,
  Trash2,
  Building2,
  FileCode,
  ArrowUpRight,
  Code2,
  Clock,
  GitFork,
} from "lucide-react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { getProjectList, deleteCachedProject } from "@/lib/client-cache"
import { Card, CardContent } from "@codecity/ui/components/card"
import { Button } from "@codecity/ui/components/button"
import { Badge } from "@codecity/ui/components/badge"

interface Project {
  id: string
  name: string
  repoUrl: string
  visibility: "PUBLIC" | "PRIVATE"
  status: string
  fileCount?: number
  lineCount?: number
  createdAt: string
}

function getStatusBadge(status: string) {
  const base = "font-mono text-[10px] px-2 py-0.5 border"
  switch (status) {
    case "COMPLETED":
      return <Badge className={`${base} bg-emerald-500/10 text-emerald-400 border-emerald-500/20`}>Completed</Badge>
    case "FAILED":
      return <Badge className={`${base} bg-primary/10 text-primary border-primary/20`}>Failed</Badge>
    case "PROCESSING":
      return <Badge className={`${base} bg-yellow-500/10 text-yellow-400 border-yellow-500/20 animate-pulse`}>Processing</Badge>
    default:
      return <Badge className={`${base} bg-blue-500/10 text-blue-400 border-blue-500/20`}>Pending</Badge>
  }
}

function ProjectSkyline({ seed }: { seed: number }) {
  return (
    <div className="absolute inset-x-0 bottom-0 flex h-14 items-end justify-center gap-[3px] overflow-hidden bg-gradient-to-t from-background/90 to-transparent px-3 pb-2">
      {Array.from({ length: 16 }, (_, i) => {
        const height = 10 + ((seed * (i + 3) + i * 11) % 52)
        return (
          <div
            key={i}
            className="w-[4px] rounded-t-sm bg-primary/70"
            style={{
              height,
              opacity: 0.28 + ((i % 5) * 0.12),
            }}
          />
        )
      })}
    </div>
  )
}

export function MyProjectsTab({ onCreateCity }: { onCreateCity?: () => void }) {
  const queryClient = useQueryClient()
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const { data: projects = [], isLoading } = useQuery<Project[]>({
    queryKey: ["projects"],
    queryFn: () => getProjectList(),
  })

  async function handleDelete(e: React.MouseEvent, id: string) {
    e.preventDefault()
    e.stopPropagation()

    if (deletingId === id) {
      // Second click — confirm delete
      try {
        // Delete from server
        await fetch(`/api/projects/${id}`, { method: "DELETE" }).catch(() => {})
        // Delete from local cache
        deleteCachedProject(id)
        // Update query cache
        queryClient.setQueryData<Project[]>(["projects"], (old) =>
          old ? old.filter((p) => p.id !== id) : []
        )
      } finally {
        setDeletingId(null)
      }
    } else {
      // First click — mark for confirmation
      setDeletingId(id)
      setTimeout(() => setDeletingId((prev) => (prev === id ? null : prev)), 3000)
    }
  }

  async function handleToggleVisibility(e: React.MouseEvent, project: Project) {
    e.preventDefault()
    e.stopPropagation()
    const newVisibility = project.visibility === "PUBLIC" ? "PRIVATE" : "PUBLIC"
    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visibility: newVisibility }),
      })
      if (!res.ok) return
      queryClient.setQueryData<Project[]>(["projects"], (old) =>
        old
          ? old.map((p) =>
              p.id === project.id ? { ...p, visibility: newVisibility } : p
            )
          : []
      )
    } catch (err) {
      console.error("Network error updating visibility:", err)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-5">
        <div className="rounded-2xl border border-zinc-800/50 bg-zinc-900/50 p-4">
          <div className="h-3 w-20 rounded-lg bg-zinc-800/50 animate-pulse mb-2" />
          <div className="h-4 w-36 rounded-lg bg-zinc-800/30 animate-pulse" />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-zinc-800/50 bg-zinc-900/50 overflow-hidden">
              <div className="h-16 bg-zinc-800/20 animate-pulse border-b border-zinc-800/30" />
              <div className="p-3 space-y-2">
                <div className="h-4 w-3/4 rounded-lg bg-zinc-800/30 animate-pulse" />
                <div className="h-3 w-full rounded-lg bg-zinc-800/20 animate-pulse" />
                <div className="flex gap-3 mt-2">
                  <div className="h-3 w-16 rounded-lg bg-zinc-800/20 animate-pulse" />
                  <div className="h-3 w-20 rounded-lg bg-zinc-800/20 animate-pulse" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Header row */}
      <div className="rounded-2xl border border-zinc-800/50 bg-zinc-900/50 backdrop-blur-sm flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground/70">
            My Cities
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {projects.length} project{projects.length !== 1 ? "s" : ""} analyzed
          </p>
        </div>
        <Button
          onClick={() => onCreateCity?.()}
          size="sm"
          className="gap-1.5 bg-primary text-white hover:bg-primary/90 font-mono text-xs"
        >
          <Plus className="h-3.5 w-3.5" />
          New City
        </Button>
      </div>

      {projects.length === 0 ? (
        <Card className="rounded-2xl border-zinc-800/50 bg-zinc-900/50 backdrop-blur-sm h-full min-h-[400px] flex items-center justify-center">
          <CardContent className="flex flex-col items-center py-16">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-900 border border-zinc-800">
              <Building2 className="h-7 w-7 text-muted-foreground" />
            </div>
            <p className="mt-4 text-base font-semibold text-foreground">No cities built yet</p>
            <p className="mt-1.5 text-sm text-muted-foreground max-w-sm text-center leading-relaxed">
              Analyze a GitHub repository to transform its codebase into an interactive 3D city visualization.
            </p>
            <Button
              onClick={() => onCreateCity?.()}
              className="mt-6 gap-1.5 bg-primary text-white hover:bg-primary/90 font-mono text-xs"
            >
              <Plus className="h-3.5 w-3.5" />
              Create Your First City
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="mx-auto grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {projects.map((project) => (
            <Link
              key={project.id}
              href={
                project.status === "PROCESSING"
                  ? `/analyze/${project.id}`
                  : `/project/${project.id}`
              }
            >
              <Card className="group relative h-full overflow-hidden rounded-2xl border-zinc-800/50 bg-zinc-900/50 backdrop-blur-sm transition-all duration-200 hover:border-primary/40 hover:shadow-[0_14px_30px_rgba(0,0,0,0.32)]">
                <CardContent className="p-0">
                  {/* Skyline preview */}
                  <div className="relative border-b border-zinc-800/30 bg-gradient-to-b from-primary/[0.06] to-transparent">
                    <ProjectSkyline
                      seed={project.name
                        .split("")
                        .reduce((acc, char) => acc + char.charCodeAt(0), 0)}
                    />
                    <div className="flex items-center justify-between px-3 pb-12 pt-2.5">
                      {getStatusBadge(project.status)}
                      <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground transition-colors group-hover:text-primary" />
                    </div>
                  </div>

                  {/* Project name + visibility */}
                  <div className="flex items-center justify-between px-3 pb-2 pt-2.5">
                    <div className="flex items-center gap-2 min-w-0">
                      {project.visibility === "PUBLIC" ? (
                        <Globe className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      ) : (
                        <Lock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      )}
                      <h3 className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                        {project.name}
                      </h3>
                    </div>
                    <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground/50">
                      {project.visibility}
                    </span>
                  </div>

                  <p className="px-3 font-mono text-[11px] text-muted-foreground/60 truncate">
                    {project.repoUrl}
                  </p>

                  {/* Stats */}
                  <div className="flex items-center gap-2.5 px-3 pb-3 pt-2">
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
                    <div className="hidden items-center gap-1.5 md:flex">
                      <GitFork className="h-3 w-3 text-muted-foreground" />
                      <span className="font-mono text-[11px] text-muted-foreground">
                        {project.visibility === "PUBLIC" ? "Shared" : "Private"}
                      </span>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between border-t border-zinc-800/30 bg-zinc-950/30 px-3 py-1.5">
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <span className="font-mono text-[10px] text-muted-foreground">
                        {new Date(project.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-0.5">
                      <button
                        onClick={(e) => handleToggleVisibility(e, project)}
                        className="rounded-lg p-1.5 text-muted-foreground transition-all hover:bg-zinc-800 hover:text-foreground opacity-50 sm:opacity-0 group-hover:opacity-100"
                        title={project.visibility === "PUBLIC" ? "Make private" : "Make public"}
                      >
                        {project.visibility === "PUBLIC" ? <Lock className="h-3 w-3" /> : <Globe className="h-3 w-3" />}
                      </button>
                      <button
                        onClick={(e) => handleDelete(e, project.id)}
                        className={`rounded-lg p-1.5 transition-all opacity-50 sm:opacity-0 group-hover:opacity-100 ${
                          deletingId === project.id
                            ? "bg-primary/20 text-primary"
                            : "text-muted-foreground hover:bg-primary/10 hover:text-primary"
                        }`}
                        title={deletingId === project.id ? "Click again to confirm delete" : "Delete project"}
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
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
