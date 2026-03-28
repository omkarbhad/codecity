"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { ProjectVisualization } from "@/components/city/project-visualization"
import { RotateCcw, ArrowLeft, RefreshCw, AlertTriangle } from "lucide-react"
import { PageLoader } from "@/components/ui/loader"
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
    return <PageLoader text="Loading city..." />
  }

  if (error) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background px-4">
        <div className="max-w-sm w-full">
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-red-500/10 border border-red-500/20">
              <AlertTriangle className="h-5 w-5 text-red-400" />
            </div>
            <h2 className="text-base font-semibold text-zinc-50 mb-2">Something went wrong</h2>
            <p className="text-sm text-zinc-500 mb-6 leading-relaxed">{error}</p>
            <div className="flex flex-col gap-2">
              {repoUrl && (
                <button
                  onClick={handleReanalyze}
                  disabled={reanalyzing}
                  className="flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary/90 transition-colors disabled:opacity-50 w-full"
                >
                  <RefreshCw className={`h-4 w-4 ${reanalyzing ? "animate-spin" : ""}`} />
                  {reanalyzing ? "Starting..." : "Re-analyze"}
                </button>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => router.back()}
                  className="flex-1 flex items-center justify-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.02] px-4 py-2.5 text-sm text-zinc-400 hover:text-zinc-200 hover:border-white/[0.12] transition-all"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </button>
                <button
                  onClick={() => window.location.reload()}
                  className="flex-1 flex items-center justify-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.02] px-4 py-2.5 text-sm text-zinc-400 hover:text-zinc-200 hover:border-white/[0.12] transition-all"
                >
                  <RotateCcw className="h-4 w-4" />
                  Retry
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!snapshot) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-sm text-zinc-500 mb-3">No visualization data available.</p>
          <button
            onClick={handleReanalyze}
            disabled={reanalyzing}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors disabled:opacity-50 mx-auto"
          >
            <RefreshCw className={`h-4 w-4 ${reanalyzing ? "animate-spin" : ""}`} />
            {reanalyzing ? "Starting..." : "Re-analyze"}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="relative">
      <ProjectVisualization snapshot={snapshot} projectName={projectName} repoUrl={repoUrl} />
    </div>
  )
}
