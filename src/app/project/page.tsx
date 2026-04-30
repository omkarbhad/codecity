"use client"

import { Suspense, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ProjectVisualization } from "@/components/city/project-visualization"
import { RotateCcw, ArrowLeft, RefreshCw, AlertTriangle } from "lucide-react"
import { PageLoader } from "@/components/ui/loader"
import type { CitySnapshot } from "@/lib/types/city"
import { getProject, getProjectSnapshot, analyze } from "@/lib/tauri"

export default function ProjectPage() {
  return (
    <Suspense fallback={<PageLoader text="Loading city..." />}>
      <ProjectContent />
    </Suspense>
  )
}

function ProjectContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const id = searchParams.get("id") ?? ""

  const [snapshot, setSnapshot] = useState<CitySnapshot | null>(null)
  const [projectName, setProjectName] = useState("")
  const [repoUrl, setRepoUrl] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [reanalyzing, setReanalyzing] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        if (!id) {
          setError("Project id missing.")
          return
        }
        const projectData = await getProject(id)
        if (!projectData) {
          setError("Project not found. It may have been deleted — try analyzing again.")
          return
        }
        setProjectName(projectData.name)
        setRepoUrl(projectData.repo_url)

        if (projectData.status === "PROCESSING") {
          router.replace(`/analyze?id=${encodeURIComponent(id)}`)
          return
        }

        if (projectData.status === "FAILED") {
          setError(`Analysis failed: ${projectData.error ?? "Unknown error"}`)
          return
        }

        const data = await getProjectSnapshot(id)
        if (!data) {
          setError("Snapshot not found. Try re-analyzing the repository.")
          return
        }
        setSnapshot(data as unknown as CitySnapshot)
      } catch {
        setError("Failed to load project. Try again later.")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id, router])

  async function handleReanalyze() {
    if (!repoUrl) return
    setReanalyzing(true)
    try {
      const result = await analyze(repoUrl)
      if (result.projectId) {
        router.push(`/analyze?id=${encodeURIComponent(result.projectId)}`)
      } else {
        setError("Failed to start re-analysis")
        setReanalyzing(false)
      }
    } catch {
      setError("Analysis error. Try again.")
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
          <div className="rounded-lg border border-white/[0.08] bg-[#101012] p-8 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg border border-red-500/20 bg-red-500/10">
              <AlertTriangle className="h-5 w-5 text-red-400" />
            </div>
            <h2 className="text-base font-semibold text-zinc-50 mb-2">Something went wrong</h2>
            <p className="text-sm text-zinc-500 mb-6 leading-relaxed">{error}</p>
            <div className="flex flex-col gap-2">
              {repoUrl && (
                <button
                  onClick={handleReanalyze}
                  disabled={reanalyzing}
                  className="flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
                >
                  <RefreshCw className={`h-4 w-4 ${reanalyzing ? "animate-spin" : ""}`} />
                  {reanalyzing ? "Starting..." : "Re-analyze"}
                </button>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => router.back()}
                  className="flex flex-1 items-center justify-center gap-2 rounded-md border border-white/[0.08] bg-white/[0.02] px-4 py-2.5 text-sm text-zinc-400 transition-colors hover:border-white/[0.12] hover:text-zinc-200"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </button>
                <button
                  onClick={() => window.location.reload()}
                  className="flex flex-1 items-center justify-center gap-2 rounded-md border border-white/[0.08] bg-white/[0.02] px-4 py-2.5 text-sm text-zinc-400 transition-colors hover:border-white/[0.12] hover:text-zinc-200"
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
            className="mx-auto flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
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
      <button
        onClick={handleReanalyze}
        disabled={reanalyzing || !repoUrl}
        className="absolute right-3 top-14 z-[80] flex h-8 items-center gap-1.5 rounded-md border border-white/[0.10] bg-[#0b0b0c]/95 px-3 text-[11px] font-medium text-zinc-400 shadow-sm transition-colors hover:border-white/[0.16] hover:bg-[#121214] hover:text-zinc-100 disabled:pointer-events-none disabled:opacity-60"
        title="Refresh analysis"
      >
        <RefreshCw className={`size-3.5 ${reanalyzing ? "animate-spin" : ""}`} />
        {reanalyzing ? "Reparsing" : "Refresh"}
      </button>
    </div>
  )
}
