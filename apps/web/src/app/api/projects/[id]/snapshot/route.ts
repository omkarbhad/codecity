import { analysisCache } from "@/lib/cache"
import { getSnapshot } from "@/lib/project-store"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  // Try in-memory cache first (hot data from recent analyses)
  const cached = analysisCache.get(`project:${id}`)
  if (cached) {
    return Response.json(cached)
  }

  // Fall back to database
  const snapshot = await getSnapshot(id)
  if (!snapshot) {
    return Response.json({ error: "Snapshot not found" }, { status: 404 })
  }

  return Response.json(snapshot.data)
}
