import { NextResponse } from "next/server"
import { getSessionUser } from "@/lib/auth-helpers"
import { getAnalysisSnapshot } from "@/lib/redis"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const snapshot = await getAnalysisSnapshot(id)

  if (!snapshot) {
    return NextResponse.json(
      { error: "Snapshot not found or still processing" },
      { status: 404 }
    )
  }

  return NextResponse.json({ projectId: id, snapshot })
}
