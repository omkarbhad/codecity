"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { ProjectVisualization } from "@/components/city/project-visualization"
import { Building2, RotateCcw, ArrowLeft } from "lucide-react"
import type { CitySnapshot } from "@/lib/types/city"

export default function ProjectPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [snapshot, setSnapshot] = useState<CitySnapshot | null>(null)
  const [projectName, setProjectName] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        // Fetch project metadata
        const projectRes = await fetch(`/api/projects/${id}`)
        if (!projectRes.ok) {
          setError("Project not found")
          return
        }
        const project = await projectRes.json()
        setProjectName(project.name)

        if (project.status === "PROCESSING") {
          router.push(`/analyze/${id}`)
          return
        }

        if (project.status === "FAILED") {
          setError(`Analysis failed for ${project.name}`)
          return
        }

        // Fetch snapshot
        const snapshotRes = await fetch(`/api/projects/${id}/snapshot`)
        if (!snapshotRes.ok) {
          setError("Snapshot not found. The analysis may still be in progress.")
          return
        }
        const data = await snapshotRes.json()
        setSnapshot(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load project")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id, router])

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
          <p className="font-mono text-xs text-muted-foreground/50">Loading city...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-5 text-center max-w-sm px-6">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-red-500/10 border border-red-500/20">
            <Building2 className="h-7 w-7 text-red-400" />
          </div>
          <div>
            <p className="text-base font-semibold text-foreground">Unable to load city</p>
            <p className="mt-1.5 text-sm text-muted-foreground">{error}</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => window.location.reload()}
              className="flex items-center gap-2 rounded-lg border border-border/50 bg-white/5 px-4 py-2 text-xs font-medium text-foreground hover:bg-white/10 transition-colors"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Retry
            </button>
            <a
              href="/dashboard"
              className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-4 py-2 text-xs font-medium text-primary hover:bg-primary/20 transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Dashboard
            </a>
          </div>
        </div>
      </div>
    )
  }

  if (!snapshot) return null

  return (
    <ProjectVisualization
      snapshot={snapshot}
      projectName={projectName}
    />
  )
}
