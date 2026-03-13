"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { ProjectVisualization } from "@/components/city/project-visualization"
import { Building2, RotateCcw, ArrowLeft, RefreshCw } from "lucide-react"
import type { CitySnapshot } from "@/lib/types/city"

export default function ProjectPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [snapshot, setSnapshot] = useState<CitySnapshot | null>(null)
  const [projectName, setProjectName] = useState("")
  const [repoUrl, setRepoUrl] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [reanalyzing, setReanalyzing] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const projectRes = await fetch(`/api/projects/${id}`)
        if (!projectRes.ok) {
          setError("Project not found. It may have been deleted — try analyzing again.")
          return
        }
        const projectData = await projectRes.json()
        setProjectName(projectData.name)
        setRepoUrl(projectData.repoUrl)

        if (projectData.status === "PROCESSING") {
          router.replace(`/analyze/${id}`)
          return
        }

        if (projectData.status === "FAILED") {
          setError(`Analysis failed: ${projectData.error ?? "Unknown error"}`)
          return
        }

        const snapshotRes = await fetch(`/api/projects/${id}/snapshot`)
        if (!snapshotRes.ok) {
          setError("Snapshot not found. Try re-analyzing the repository.")
          return
        }
        const data = await snapshotRes.json()
        setSnapshot(data)
      } catch {
        setError("Failed to load project. Try again later.")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id, router])

  async function handleReanalyze() {
    setReanalyzing(true)
    try {
      const res = await fetch(`/api/projects/${id}/reanalyze`, { method: "POST" })
      if (res.ok) {
        router.push(`/analyze/${id}`)
      } else {
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? "Failed to start re-analysis")
        setReanalyzing(false)
      }
    } catch {
      setError("Network error. Try again.")
      setReanalyzing(false)
    }
  }

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
            {repoUrl && (
              <button
                onClick={handleReanalyze}
                disabled={reanalyzing}
                className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 ${reanalyzing ? "animate-spin" : ""}`} />
                {reanalyzing ? "Starting..." : "Re-analyze"}
              </button>
            )}
            <button
              onClick={() => window.location.reload()}
              className="flex items-center gap-2 rounded-lg border border-border/40 bg-background/40 px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
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

  return (
    <div className="relative">
      {/* Re-analyze button overlay */}
      <div className="fixed top-4 right-4 z-50">
        <button
          onClick={handleReanalyze}
          disabled={reanalyzing}
          className="flex items-center gap-2 rounded-lg border border-white/[0.08] bg-black/60 backdrop-blur-xl px-3 py-1.5 text-xs font-medium text-zinc-300 hover:border-white/[0.15] hover:text-white transition-all disabled:opacity-50"
          title="Re-analyze this repository"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${reanalyzing ? "animate-spin" : ""}`} />
          {reanalyzing ? "Starting..." : "Re-analyze"}
        </button>
      </div>
      <ProjectVisualization snapshot={snapshot} projectName={projectName} />
    </div>
  )
}
