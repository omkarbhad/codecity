"use client"

import { useEffect, useState } from "react"
import { EyeOff, Trash2 } from "lucide-react"
import { InlineLoader } from "@/components/ui/loader"

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
        setProjects(Array.isArray(data) ? data : [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
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
    return <InlineLoader />
  }

  return (
    <div className="animate-fade-up">
      <div>
        <p className="font-sans text-[10px] tracking-[0.2em] uppercase text-primary/40">Content Review</p>
        <h1 className="mt-1 text-2xl font-bold text-foreground">Moderation</h1>
        <p className="mt-1 font-sans text-xs text-muted-foreground/50">
          {projects.length} public project{projects.length !== 1 ? "s" : ""}
        </p>
      </div>

      {projects.length === 0 ? (
        <div className="mt-16 text-center">
          <p className="text-sm text-muted-foreground">No public projects to moderate</p>
        </div>
      ) : (
        <div className="mt-6 space-y-2">
          {projects.map((project) => (
            <div
              key={project.id}
              className="group flex items-center justify-between rounded-lg border border-border/30 bg-card/20 px-4 py-3 transition-all hover:border-border/50 hover:bg-card/40"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{project.name}</p>
                <p className="font-sans text-[10px] text-muted-foreground/50">
                  by {project.user.name ?? project.user.email} · {project.fileCount} files · {new Date(project.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => handleMakePrivate(project.id)}
                  className="flex items-center gap-1.5 rounded-md border border-border/30 px-2.5 py-1 font-sans text-[10px] text-muted-foreground transition-all hover:border-primary/30 hover:text-primary hover:bg-primary/5"
                >
                  <EyeOff className="h-3 w-3" />
                  Make Private
                </button>
                <button
                  onClick={() => handleDelete(project.id)}
                  className="flex items-center gap-1.5 rounded-md border border-destructive/20 px-2.5 py-1 font-sans text-[10px] text-destructive/70 transition-all hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
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
