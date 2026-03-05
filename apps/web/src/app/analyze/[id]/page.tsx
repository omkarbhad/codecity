"use client"

import { useEffect, useState, useRef, use } from "react"
import { useRouter } from "next/navigation"
import { AlertCircle, RotateCcw } from "lucide-react"

interface ProgressData {
  stage: string
  progress: number
  message: string
}

const STAGE_LABELS: Record<string, string> = {
  pending: "PENDING",
  "fetching-tree": "FETCHING TREE",
  "downloading-files": "DOWNLOADING",
  parsing: "PARSING",
  "computing-layout": "COMPUTING",
}

const STAGES_ORDER = [
  "pending",
  "fetching-tree",
  "downloading-files",
  "parsing",
  "computing-layout",
]

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
    message: "Waiting for analysis to start...",
  })
  const [error, setError] = useState<string | null>(null)
  const eventSourceRef = useRef<EventSource | null>(null)

  useEffect(() => {
    const eventSource = new EventSource(`/api/analyze/${id}/progress`)
    eventSourceRef.current = eventSource

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as ProgressData

        if (data.stage === "complete") {
          eventSource.close()
          router.push(`/project/${id}`)
          return
        }

        if (data.stage === "error") {
          eventSource.close()
          setError(data.message || "Analysis failed unexpectedly.")
          return
        }

        setProgress(data)
      } catch {
        // ignore malformed messages
      }
    }

    eventSource.onerror = () => {
      eventSource.close()
      setError("Connection lost. Please retry to check progress.")
    }

    return () => {
      eventSource.close()
      eventSourceRef.current = null
    }
  }, [id, router])

  const handleRetry = () => {
    setError(null)
    setProgress({ stage: "pending", progress: 0, message: "Reconnecting..." })
    window.location.reload()
  }

  const currentStageIndex = STAGES_ORDER.indexOf(progress.stage)

  return (
    <div className="flex min-h-screen items-center justify-center px-4 font-mono bg-[#07070c]">
      {/* Background grid animation */}
      <div className="pointer-events-none fixed inset-0 bg-grid opacity-30 animate-grid-scroll" />

      {/* Radial glow */}
      <div className="pointer-events-none fixed inset-0 flex items-center justify-center">
        <div className="h-[500px] w-[700px] rounded-full blur-[120px] animate-breathing bg-primary/[0.05]" />
      </div>

      <div className="relative w-full max-w-lg animate-fade-up">
        <div className="rounded-xl border border-white/[0.06] bg-[rgba(10,10,16,0.7)] p-8 backdrop-blur-xl">
          {/* Logo + Title */}
          <div className="text-center">
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-[10px] bg-primary text-sm font-bold text-white shadow-[0_0_30px_rgba(255,64,64,0.35)]">
              CC
            </div>
            <h1 className="mt-4 text-lg font-semibold tracking-tight text-foreground">
              Building Your City
            </h1>
            <p className="mt-1 text-xs text-muted-foreground/70">
              Analyzing repository structure and dependencies
            </p>
          </div>

          {error ? (
            <div className="mt-8 space-y-4">
              <div className="flex items-start gap-3 rounded-lg border border-primary/30 bg-primary/[0.05] px-4 py-3">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
                <p className="text-sm text-red-400">{error}</p>
              </div>
              <button
                onClick={handleRetry}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-foreground transition-all hover:bg-white/[0.08] hover:border-white/[0.12]"
              >
                <RotateCcw className="h-4 w-4" />
                Try Again
              </button>
            </div>
          ) : (
            <div className="mt-8 space-y-5">
              {/* City silhouette animation */}
              <div className="flex items-end justify-center gap-[3px] h-16">
                {Array.from({ length: 24 }, (_, i) => {
                  const baseHeight = 12 + ((i * 7 + 3) % 48)
                  const isActive =
                    progress.progress > 0 && i < (progress.progress / 100) * 24
                  return (
                    <div
                      key={i}
                      className={`w-1 rounded-t-[2px] transition-all duration-700 ${
                        isActive
                          ? "bg-primary opacity-85 shadow-[0_0_8px_rgba(255,64,64,0.3)]"
                          : "bg-white/[0.06] opacity-40"
                      }`}
                      style={{ height: `${baseHeight}px` }}
                    />
                  )
                })}
              </div>

              {/* Progress bar */}
              <div>
                <div className="relative h-[3px] w-full overflow-hidden rounded-full bg-white/[0.05]">
                  <div
                    className="h-full rounded-full bg-primary shadow-[0_0_8px_rgba(255,64,64,0.5)] transition-all duration-500 ease-out"
                    style={{ width: `${Math.max(progress.progress, 2)}%` }}
                  />
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <p className="text-[11px] text-muted-foreground/60">
                    {progress.message}
                  </p>
                  <span className="text-[11px] font-medium tabular-nums text-foreground">
                    {Math.round(progress.progress)}%
                  </span>
                </div>
              </div>

              {/* Stage indicators */}
              <div className="flex justify-between px-1">
                {STAGES_ORDER.map((stage, i) => {
                  const isCompleted = currentStageIndex > i
                  const isCurrent = currentStageIndex === i
                  return (
                    <div
                      key={stage}
                      className="flex flex-col items-center gap-1.5"
                    >
                      <div
                        className={`h-1.5 w-1.5 rounded-full transition-all duration-300 ${
                          isCurrent ? "animate-pulse" : ""
                        } ${
                          isCompleted || isCurrent
                            ? "bg-primary shadow-[0_0_6px_rgba(255,64,64,0.5)]"
                            : "bg-white/10"
                        }`}
                      />
                      <span
                        className={`text-[8px] sm:text-[9px] tracking-wider uppercase transition-colors ${
                          isCurrent
                            ? "text-primary"
                            : isCompleted
                              ? "text-muted-foreground/60"
                              : "text-muted-foreground/20"
                        }`}
                      >
                        {STAGE_LABELS[stage] ?? stage}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <div className="mt-6 text-center">
            <p className="text-[10px] tracking-wider text-muted-foreground/30">
              PROJECT {id.slice(0, 8).toUpperCase()}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
