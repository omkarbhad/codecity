import { analysisCache } from "@/lib/cache"
import { getSnapshot, getProject } from "@/lib/project-store"
import { getSessionUser } from "@/lib/auth-helpers"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const project = await getProject(id)
  if (!project) {
    return Response.json({ error: "Snapshot not found" }, { status: 404 })
  }

  if (project.visibility === "PRIVATE") {
    const user = await getSessionUser()
    if (!user || (user.id !== project.userId && user.role !== "ADMIN")) {
      return Response.json({ error: "Snapshot not found" }, { status: 404 })
    }
  }

  const cached = analysisCache.get(`project:${id}`)
  if (cached) {
    return Response.json(cached)
  }

  const snapshot = await getSnapshot(id)
  if (!snapshot) {
    return Response.json({ error: "Snapshot not found" }, { status: 404 })
  }

  return Response.json(snapshot.data)
}
