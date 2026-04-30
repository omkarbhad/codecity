"use client"

import { Suspense, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { getProject } from "@/lib/tauri"

interface ProgressData {
  stage: string
  progress: number
  message: string
}

export default function AnalyzePage() {
  return (
    <Suspense fallback={null}>
      <AnalyzeContent />
    </Suspense>
  )
}

function AnalyzeContent() {
  const searchParams = useSearchParams()
  const id = searchParams.get("id") ?? ""
  const router = useRouter()
  const [progress, setProgress] = useState<ProgressData>({
    stage: "processing",
    progress: 50,
    message: "Analyzing repository...",
  })

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        if (!id) {
          setProgress({ stage: "error", progress: 0, message: "Project id missing" })
          clearInterval(interval)
          return
        }
        const project = await getProject(id)
        if (!project) {
          setProgress({ stage: "error", progress: 0, message: "Project not found" })
          clearInterval(interval)
          return
        }
        if (project.status === "COMPLETED") {
          setProgress({ stage: "complete", progress: 100, message: "Analysis complete!" })
          clearInterval(interval)
          setTimeout(() => router.replace(`/project?id=${encodeURIComponent(id)}`), 500)
          return
        }
        if (project.status === "FAILED") {
          setProgress({ stage: "error", progress: 0, message: project.error ?? "Analysis failed" })
          clearInterval(interval)
          return
        }
        // Still processing
        setProgress({ stage: "processing", progress: 75, message: "Building city..." })
      } catch {
        // Keep polling
      }
    }, 2000)

    return () => clearInterval(interval)
  }, [id, router])

  const isError = progress.stage === "error"
  const isComplete = progress.stage === "complete"

  return (
    <div className="flex min-h-screen items-center justify-center px-4 font-sans bg-[#07070c]">
      <div className="pointer-events-none fixed inset-0 bg-grid opacity-30" />
      <div className="relative w-full max-w-lg">
        <div className="rounded-xl border border-white/[0.06] bg-[rgba(10,10,16,0.7)] p-8 backdrop-blur-xl">
          <div className="flex flex-col items-center text-center">
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-[10px] bg-primary text-sm font-bold text-white shadow-[0_0_30px_rgba(255,64,64,0.35)]">
              CC
            </div>
            <h1 className="mt-4 text-lg font-semibold tracking-tight text-foreground">
              {isError
                ? "Analysis Failed"
                : isComplete
                  ? "City Built!"
                  : "Building Your City..."}
            </h1>
            <p className="mt-1.5 text-xs text-muted-foreground/70">
              {progress.message}
            </p>

            {/* Progress bar */}
            {!isError && (
              <div className="mt-6 w-full">
                <div className="h-1.5 w-full rounded-full bg-white/[0.06] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
                    style={{ width: `${progress.progress}%` }}
                  />
                </div>
                <p className="mt-2 text-[10px] text-muted-foreground/50 tabular-nums">
                  {progress.progress}%
                </p>
              </div>
            )}

            {isError && (
              <div className="mt-5 flex gap-3">
                <button
                  onClick={() => router.push("/dashboard")}
                  className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-4 py-2 text-xs text-zinc-300 hover:text-white transition-colors"
                >
                  Dashboard
                </button>
                <button
                  onClick={() => window.location.reload()}
                  className="rounded-lg bg-primary px-4 py-2 text-xs text-white hover:bg-primary/90 transition-colors"
                >
                  Retry
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
