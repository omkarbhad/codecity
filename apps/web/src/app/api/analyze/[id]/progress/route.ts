import { getProgress } from "@/lib/analysis/progress-store"

export const dynamic = "force-dynamic"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

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

      const interval = setInterval(() => {
        const progress = getProgress(id)
        if (!progress) {
          // Detect stuck state — no progress after 30s
          if (Date.now() - lastUpdateTime > 30000) {
            send({ stage: "error", progress: 0, message: "Analysis appears to be stuck. Please retry." })
            clearInterval(interval)
            try { controller.close() } catch { /* already closed */ }
            return
          }
          send({ stage: "pending", progress: 0, message: "Waiting for analysis to start..." })
          return
        }

        // Track whether progress is actually advancing
        if (progress.progress !== lastProgressValue) {
          lastUpdateTime = Date.now()
          lastProgressValue = progress.progress
        } else if (Date.now() - lastUpdateTime > 60000) {
          send({ stage: "error", progress: 0, message: "Analysis appears to be stuck. Please retry." })
          clearInterval(interval)
          try { controller.close() } catch { /* already closed */ }
          return
        }

        send({
          stage: progress.stage,
          progress: Math.round(progress.progress * 100),
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
      }, 500)

      // Timeout after 5 minutes
      setTimeout(() => {
        clearInterval(interval)
        send({ stage: "error", progress: 0, message: "Analysis timed out" })
        try { controller.close() } catch { /* already closed */ }
      }, 5 * 60 * 1000)
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
