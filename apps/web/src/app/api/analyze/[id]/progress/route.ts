import { prisma } from "@codecity/db"
import { NextRequest } from "next/server"

export const dynamic = "force-dynamic"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (data: any) => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
        )
      }

      // Poll for progress every second
      let attempts = 0
      const maxAttempts = 300 // 5 minutes max

      const poll = async () => {
        try {
          const project = await prisma.project.findUnique({
            where: { id },
            select: { status: true, analysisData: true, error: true },
          })

          if (!project) {
            sendEvent({ stage: "error", progress: 0, message: "Project not found" })
            controller.close()
            return
          }

          const analysisData = project.analysisData as any

          if (project.status === "COMPLETED") {
            sendEvent({ stage: "complete", progress: 1, message: "Analysis complete!" })
            controller.close()
            return
          }

          if (project.status === "FAILED") {
            sendEvent({ stage: "error", progress: 0, message: project.error ?? "Analysis failed" })
            controller.close()
            return
          }

          // Send current progress
          if (analysisData) {
            sendEvent(analysisData)
          } else {
            sendEvent({ stage: "pending", progress: 0, message: "Waiting to start..." })
          }

          attempts++
          if (attempts >= maxAttempts) {
            sendEvent({ stage: "error", progress: 0, message: "Timeout waiting for analysis" })
            controller.close()
            return
          }

          // Continue polling
          setTimeout(poll, 1000)
        } catch (error) {
          sendEvent({ stage: "error", progress: 0, message: "Server error" })
          controller.close()
        }
      }

      poll()
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
