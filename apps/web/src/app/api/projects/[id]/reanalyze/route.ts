import { NextResponse } from "next/server"
import { getSessionUser } from "@/lib/auth-helpers"
import { getProject, updateProject } from "@/lib/project-store"
import { inngest } from "@/lib/inngest"
import { sql } from "@/lib/db"

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const project = await getProject(id)
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 })
  }

  if (project.userId !== user.id && user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  // Reset project to PROCESSING
  await updateProject(id, {
    status: "PROCESSING",
    error: null,
  })

  // Delete old snapshots
  await sql`DELETE FROM snapshots WHERE project_id = ${id}`

  // Dispatch Inngest event
  await inngest.send({
    name: "codecity/analyze.requested",
    data: {
      repoUrl: project.repoUrl,
      projectId: id,
      githubToken: user.githubToken,
    },
  })

  return NextResponse.json({ success: true, projectId: id }, { status: 202 })
}
