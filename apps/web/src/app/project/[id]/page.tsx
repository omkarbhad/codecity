"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { ProjectVisualization } from "@/components/city/project-visualization"
import { Building2, RotateCcw, ArrowLeft } from "lucide-react"
import type { CitySnapshot } from "@/lib/types/city"
import { getCachedProject, getCachedSnapshot } from "@/lib/client-cache"

export default function ProjectPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [snapshot, setSnapshot] = useState<CitySnapshot | null>(null)
  const [projectName, setProjectName] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Load from client-side cache (localStorage)
    const project = getCachedProject(id)
    const cachedSnapshot = getCachedSnapshot(id)

    if (project && cachedSnapshot) {
      setProjectName(project.name)
      setSnapshot(cachedSnapshot)
      setLoading(false)
      return
    }

    // Fallback: try server API (may work if same Vercel instance)
    async function loadFromServer() {
      try {
        const projectRes = await fetch(`/api/projects/${id}`)
        if (!projectRes.ok) {
          setError("Project not found. It may have expired — try analyzing again.")
          return
        }
        const projectData = await projectRes.json()
        setProjectName(projectData.name)

        if (projectData.status === "FAILED") {
          setError(`Analysis failed for ${projectData.name}`)
          return
        }

        const snapshotRes = await fetch(`/api/projects/${id}/snapshot`)
        if (!snapshotRes.ok) {
          setError("Snapshot not found. Try analyzing the repository again.")
          return
        }
        const data = await snapshotRes.json()
        setSnapshot(data)
      } catch {
        setError("Project not found in cache. Try analyzing the repository again.")
      } finally {
        setLoading(false)
      }
    }
    loadFromServer()
  }, [id])

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
          <p className="font-mono text-xs text-muted-foreground">Loading city...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background px-4">
        <div className="max-w-md space-y-4 text-center">
          <Building2 className="mx-auto h-12 w-12 text-muted-foreground/30" />
          <h2 className="text-lg font-semibold text-foreground">{error}</h2>
          <div className="flex justify-center gap-3">
            <button
              onClick={() => router.push("/dashboard")}
              className="flex items-center gap-2 rounded-lg border border-border/40 bg-background/40 px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Dashboard
            </button>
            <button
              onClick={() => window.location.reload()}
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <RotateCcw className="h-4 w-4" />
              Retry
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!snapshot) return null

  return <ProjectVisualization snapshot={snapshot} projectName={projectName} />
}
