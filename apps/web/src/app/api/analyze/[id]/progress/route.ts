import { getAnalysisProgress } from "@/lib/redis"
import { getProject } from "@/lib/project-store"
import { getSessionUser } from "@/lib/auth-helpers"

export const dynamic = "force-dynamic"

const POLL_INTERVAL_MS = 1000
const STUCK_TIMEOUT_MS = 30_000
const PROGRESS_STUCK_TIMEOUT_MS = 60_000
const ANALYSIS_TIMEOUT_MS = 5 * 60 * 1000

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const project = await getProject(id)
  if (!project) {
    return new Response("Not found", { status: 404 })
  }

  if (project.visibility === "PRIVATE") {
    const user = await getSessionUser()
    if (!user || (user.id !== project.userId && user.role !== "ADMIN")) {
      return new Response("Not found", { status: 404 })
    }
  }

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder()

      function send(data: object) {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
        } catch {
          // Stream already closed
        }
      }

      let lastUpdateTime = Date.now()
      let lastProgressValue = -1

      const interval = setInterval(async () => {
        try {
          const progress = await getAnalysisProgress(id)

          if (!progress) {
            if (Date.now() - lastUpdateTime > STUCK_TIMEOUT_MS) {
              send({ stage: "error", progress: 0, message: "Analysis appears to be stuck. Please retry." })
              clearInterval(interval)
              try { controller.close() } catch { /* already closed */ }
              return
            }
            send({ stage: "pending", progress: 0, message: "Waiting for analysis to start..." })
            return
          }

          if (progress.progress !== lastProgressValue) {
            lastUpdateTime = Date.now()
            lastProgressValue = progress.progress
          } else if (Date.now() - lastUpdateTime > PROGRESS_STUCK_TIMEOUT_MS) {
            send({ stage: "error", progress: 0, message: "Analysis appears to be stuck. Please retry." })
            clearInterval(interval)
            try { controller.close() } catch { /* already closed */ }
            return
          }

          send({
            stage: progress.stage,
            progress: progress.progress,
            message: progress.message,
          })

          if (progress.completed) {
            send({ stage: "complete", progress: 100, message: "Analysis complete!" })
            clearInterval(interval)
            try { controller.close() } catch { /* already closed */ }
          }

          if (progress.error) {
            send({ stage: "error", progress: 0, message: progress.error })
            clearInterval(interval)
            try { controller.close() } catch { /* already closed */ }
          }
        } catch {
          // Redis error — keep polling
        }
      }, POLL_INTERVAL_MS)

      // Timeout after 5 minutes
      setTimeout(() => {
        clearInterval(interval)
        send({ stage: "error", progress: 0, message: "Analysis timed out" })
        try { controller.close() } catch { /* already closed */ }
      }, ANALYSIS_TIMEOUT_MS)
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  })
}
