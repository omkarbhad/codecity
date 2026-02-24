"use client"

import { useEffect, useState } from "react"
import { EyeOff, Trash2 } from "lucide-react"

interface ModerationProject {
  id: string
  name: string
  repoUrl: string
  visibility: string
  fileCount: number
  createdAt: string
  user: { name: string | null; email: string }
}

export default function AdminModerationPage() {
  const [projects, setProjects] = useState<ModerationProject[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/admin/projects")
      .then((r) => r.json())
      .then((data) => {
        setProjects(data)
        setLoading(false)
      })
  }, [])

  async function handleMakePrivate(id: string) {
    await fetch(`/api/admin/projects/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visibility: "PRIVATE" }),
    })
    setProjects((prev) => prev.filter((p) => p.id !== id))
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this project permanently?")) return
    await fetch(`/api/admin/projects/${id}`, { method: "DELETE" })
    setProjects((prev) => prev.filter((p) => p.id !== id))
  }

  if (loading) {
    return <div className="py-12 text-center text-muted-foreground">Loading...</div>
  }

  return (
    <div>
      <h1 className="text-2xl font-bold">Content Moderation</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Manage public gallery listings ({projects.length} public projects)
      </p>

      {projects.length === 0 ? (
        <div className="mt-12 text-center text-muted-foreground">
          No public projects to moderate.
        </div>
      ) : (
        <div className="mt-6 divide-y divide-border rounded-lg border border-border">
          {projects.map((project) => (
            <div
              key={project.id}
              className="flex items-center justify-between px-4 py-3"
            >
              <div>
                <p className="text-sm font-medium">{project.name}</p>
                <p className="text-xs text-muted-foreground">
                  by {project.user.name ?? project.user.email} &middot;{" "}
                  {project.fileCount} files &middot;{" "}
                  {new Date(project.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleMakePrivate(project.id)}
                  className="flex items-center gap-1 rounded px-2 py-1 text-xs text-muted-foreground hover:bg-accent"
                >
                  <EyeOff className="h-3 w-3" />
                  Make Private
                </button>
                <button
                  onClick={() => handleDelete(project.id)}
                  className="flex items-center gap-1 rounded px-2 py-1 text-xs text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-3 w-3" />
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
