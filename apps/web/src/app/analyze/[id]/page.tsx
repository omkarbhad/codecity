"use client"

import { useEffect, useState, use } from "react"
import { useRouter } from "next/navigation"
import { AlertCircle, RotateCcw } from "lucide-react"

interface ProgressData {
  stage: string
  progress: number
  message: string
}

const STAGE_LABELS: Record<string, string> = {
  pending: "INITIALIZING",
  fetching: "FETCHING TREE",
  downloading: "DOWNLOADING",
  parsing: "PARSING",
  computing: "COMPUTING LAYOUT",
}

export default function AnalyzePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [progress, setProgress] = useState<ProgressData>({
    stage: "pending",
    progress: 0,
    message: "Starting analysis...",
  })
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const eventSource = new EventSource(`/api/analyze/${id}/progress`)

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data) as ProgressData

      if (data.stage === "complete") {
        eventSource.close()
        router.push(`/project/${id}`)
        return
      }

      if (data.stage === "error") {
        eventSource.close()
        setError(data.message)
        return
      }

      setProgress(data)
    }

    eventSource.onerror = () => {
      eventSource.close()
      setError("Connection lost. Please refresh to check progress.")
    }

    return () => eventSource.close()
  }, [id, router])

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      {/* Radial glow */}
      <div className="pointer-events-none fixed inset-0 flex items-center justify-center">
        <div className="h-[400px] w-[600px] rounded-full bg-primary/3 blur-[100px]" />
      </div>

      <div className="relative w-full max-w-md animate-fade-up">
        <div className="rounded-xl border border-border/50 bg-card/60 p-8 backdrop-blur-xl">
          {/* City icon */}
          <div className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
              <svg
                className="h-6 w-6 text-primary"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M3 21h18M3 7v14M21 7v14M6 7V3h4v4M14 7V3h4v4M9 21v-4h6v4" />
              </svg>
            </div>
            <h1 className="mt-4 text-lg font-semibold text-foreground">
              Analyzing Repository...
            </h1>
          </div>

          {error ? (
            <div className="mt-8 space-y-4">
              <div className="flex items-start gap-3 rounded-lg border border-red-500/30 bg-red-500/5 px-4 py-3">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
                <p className="text-sm text-red-400">{error}</p>
              </div>
              <button
                onClick={() => window.location.reload()}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-border/50 bg-white/5 px-4 py-2.5 text-sm font-medium text-foreground transition-all hover:bg-white/10 hover:border-border"
              >
                <RotateCcw className="h-4 w-4" />
                Try Again
              </button>
            </div>
          ) : (
            <div className="mt-8 space-y-4">
              {/* Stage label */}
              <div className="text-center">
                <span className="font-mono text-xs font-medium tracking-widest uppercase text-primary">
                  {STAGE_LABELS[progress.stage] ?? progress.stage.toUpperCase()}
                </span>
              </div>

              {/* Progress bar */}
              <div className="relative h-2 w-full overflow-hidden rounded-full bg-white/5">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-500 ease-out glow-red"
                  style={{ width: `${Math.max(progress.progress, 2)}%` }}
                />
              </div>

              {/* Progress percentage */}
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">{progress.message}</p>
                <span className="font-mono text-xs font-medium text-foreground">
                  {Math.round(progress.progress)}%
                </span>
              </div>
            </div>
          )}

          <div className="mt-6 text-center">
            <p className="font-mono text-[10px] tracking-wider text-muted-foreground/40">
              PROJECT {id.slice(0, 8).toUpperCase()}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
