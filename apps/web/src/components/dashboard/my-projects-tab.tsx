"use client"

import { useEffect, useState } from "react"
import { Plus, Globe, Lock, Trash2, MoreHorizontal } from "lucide-react"
import { NewAnalysisDialog } from "./new-analysis-dialog"

interface Project {
  id: string
  name: string
  repoUrl: string
  visibility: "PUBLIC" | "PRIVATE"
  status: string
  fileCount: number
  lineCount: number
  updatedAt: string
}

export function MyProjectsTab() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [showNewDialog, setShowNewDialog] = useState(false)

  useEffect(() => {
    fetch("/api/projects")
      .then((r) => r.json())
      .then((data) => {
        setProjects(Array.isArray(data) ? data : [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  async function handleDelete(id: string) {
    await fetch(`/api/projects/${id}`, { method: "DELETE" })
    setProjects((prev) => prev.filter((p) => p.id !== id))
  }

  async function handleToggleVisibility(project: Project) {
    const newVisibility = project.visibility === "PUBLIC" ? "PRIVATE" : "PUBLIC"
    await fetch(`/api/projects/${project.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visibility: newVisibility }),
    })
    setProjects((prev) =>
      prev.map((p) =>
        p.id === project.id ? { ...p, visibility: newVisibility } : p
      )
    )
  }

  if (loading) {
    return (
      <div className="py-20 text-center">
        <div className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <p className="font-mono text-xs text-muted-foreground">
          {projects.length} project{projects.length !== 1 ? "s" : ""}
        </p>
        <button
          onClick={() => setShowNewDialog(true)}
          className="flex items-center gap-2 rounded-lg border border-accent/30 bg-accent/10 px-4 py-2 font-mono text-xs font-medium text-accent transition-all hover:bg-accent/20 hover:border-accent/50 glow-amber"
        >
          <Plus className="h-3.5 w-3.5" />
          New Analysis
        </button>
      </div>

      {projects.length === 0 ? (
        <div className="mt-16 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-xl border border-border/30 bg-card/30">
            <svg className="h-8 w-8 text-muted-foreground/30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M3 21h18M3 7v14M21 7v14M6 7V3h4v4M14 7V3h4v4M9 21v-4h6v4" />
            </svg>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">No projects yet</p>
          <p className="mt-1 font-mono text-xs text-muted-foreground/50">
            Analyze a GitHub repo to build your first city
          </p>
        </div>
      ) : (
        <div className="mt-4 space-y-2">
          {projects.map((project) => (
            <div
              key={project.id}
              className="group flex items-center justify-between rounded-lg border border-border/30 bg-card/20 px-4 py-3 transition-all hover:border-border/50 hover:bg-card/40"
            >
              <div className="flex items-center gap-3">
                {project.visibility === "PUBLIC" ? (
                  <Globe className="h-3.5 w-3.5 text-primary/50" />
                ) : (
                  <Lock className="h-3.5 w-3.5 text-muted-foreground/50" />
                )}
                <div>
                  <p className="text-sm font-medium text-foreground">{project.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {project.fileCount} files
                    </span>
                    <span className="text-border">·</span>
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {new Date(project.updatedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={`rounded-md px-2 py-0.5 font-mono text-[10px] tracking-wider uppercase ${
                    project.status === "COMPLETED"
                      ? "status-completed"
                      : project.status === "FAILED"
                        ? "status-failed"
                        : project.status === "PROCESSING"
                          ? "status-processing"
                          : "status-pending"
                  }`}
                >
                  {project.status.toLowerCase()}
                </span>
                <button
                  onClick={() => handleToggleVisibility(project)}
                  className="rounded p-1.5 text-muted-foreground/40 opacity-0 transition-all hover:bg-card hover:text-foreground group-hover:opacity-100"
                >
                  {project.visibility === "PUBLIC" ? (
                    <Lock className="h-3.5 w-3.5" />
                  ) : (
                    <Globe className="h-3.5 w-3.5" />
                  )}
                </button>
                <button
                  onClick={() => handleDelete(project.id)}
                  className="rounded p-1.5 text-muted-foreground/40 opacity-0 transition-all hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showNewDialog && (
        <NewAnalysisDialog onClose={() => setShowNewDialog(false)} />
      )}
    </div>
  )
}
