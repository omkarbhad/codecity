"use client"

import { useEffect, useState, use } from "react"
import { useRouter } from "next/navigation"

interface ProgressData {
  stage: string
  progress: number
  message: string
}

export default function AnalyzePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const [progress, setProgress] = useState<ProgressData>({
    stage: "pending",
    progress: 0,
    message: "Connecting...",
  })

  useEffect(() => {
    // First check if the project is already completed
    async function checkProject() {
      try {
        const res = await fetch(`/api/projects/${id}`)
        if (res.ok) {
          const data = await res.json()
          if (data.status === "COMPLETED") {
            router.replace(`/project/${id}`)
            return true
          }
          if (data.status === "FAILED") {
            setProgress({
              stage: "error",
              progress: 0,
              message: data.error ?? "Analysis failed",
            })
            return true
          }
        }
      } catch {
        // Continue to SSE
      }
      return false
    }

    let eventSource: EventSource | null = null

    checkProject().then((done) => {
      if (done) return

      eventSource = new EventSource(`/api/analyze/${id}/progress`)

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as ProgressData
          setProgress(data)

          if (data.stage === "complete") {
            eventSource?.close()
            setTimeout(() => router.replace(`/project/${id}`), 500)
          }
          if (data.stage === "error") {
            eventSource?.close()
          }
        } catch {
          // Ignore parse errors
        }
      }

      eventSource.onerror = () => {
        eventSource?.close()
        // Try checking project status one more time
        checkProject()
      }
    })

    return () => {
      eventSource?.close()
    }
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
