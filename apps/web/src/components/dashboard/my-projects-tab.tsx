"use client"

import { useEffect, useState } from "react"
import { Plus, Trash2, Globe, Lock } from "lucide-react"
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
        setProjects(data)
        setLoading(false)
      })
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
    return <div className="py-12 text-center text-muted-foreground">Loading...</div>
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {projects.length} project{projects.length !== 1 ? "s" : ""}
        </p>
        <button
          onClick={() => setShowNewDialog(true)}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          New Analysis
        </button>
      </div>

      {projects.length === 0 ? (
        <div className="mt-12 text-center">
          <p className="text-muted-foreground">No projects yet.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Analyze a GitHub repo to get started.
          </p>
        </div>
      ) : (
        <div className="mt-4 divide-y divide-border rounded-lg border border-border">
          {projects.map((project) => (
            <div
              key={project.id}
              className="flex items-center justify-between px-4 py-3"
            >
              <div className="flex items-center gap-3">
                {project.visibility === "PUBLIC" ? (
                  <Globe className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Lock className="h-4 w-4 text-muted-foreground" />
                )}
                <div>
                  <p className="text-sm font-medium">{project.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {project.fileCount} files &middot;{" "}
                    {new Date(project.updatedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs ${
                    project.status === "COMPLETED"
                      ? "bg-green-500/10 text-green-500"
                      : project.status === "FAILED"
                        ? "bg-destructive/10 text-destructive"
                        : "bg-yellow-500/10 text-yellow-500"
                  }`}
                >
                  {project.status.toLowerCase()}
                </span>
                <button
                  onClick={() => handleToggleVisibility(project)}
                  className="rounded p-1 text-muted-foreground hover:bg-accent"
                  title="Toggle visibility"
                >
                  {project.visibility === "PUBLIC" ? (
                    <Lock className="h-4 w-4" />
                  ) : (
                    <Globe className="h-4 w-4" />
                  )}
                </button>
                <button
                  onClick={() => handleDelete(project.id)}
                  className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  title="Delete"
                >
                  <Trash2 className="h-4 w-4" />
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
