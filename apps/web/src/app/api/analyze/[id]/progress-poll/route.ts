import { NextResponse } from "next/server"
import { getAnalysisProgress } from "@/lib/redis"

export const dynamic = "force-dynamic"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const progress = await getAnalysisProgress(id)

  if (!progress) {
    return NextResponse.json({ stage: "pending", progress: 0, message: "Waiting for analysis to start..." })
  }

  return NextResponse.json({
    stage: progress.stage,
    progress: progress.progress,
    message: progress.message,
  })
}
