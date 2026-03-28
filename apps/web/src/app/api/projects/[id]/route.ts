import { NextResponse } from "next/server"
import { getSessionUser } from "@/lib/auth-helpers"
import { getProject, deleteProject, updateProject } from "@/lib/project-store"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const project = await getProject(id)
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 })
  }

  if (project.visibility === "PRIVATE") {
    const user = await getSessionUser()
    if (!user || (user.id !== project.userId && user.role !== "ADMIN")) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }
  }

  return NextResponse.json(project)
}

export async function DELETE(
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

  await deleteProject(id)
  return NextResponse.json({ success: true, id })
}

export async function PATCH(
  request: Request,
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

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  // Validate field types
  if (body.visibility !== undefined) {
    if (typeof body.visibility !== "string" || !["PUBLIC", "PRIVATE"].includes(body.visibility)) {
      return NextResponse.json({ error: "visibility must be 'PUBLIC' or 'PRIVATE'" }, { status: 400 })
    }
  }
  if (body.name !== undefined && typeof body.name !== "string") {
    return NextResponse.json({ error: "name must be a string" }, { status: 400 })
  }

  const updated = await updateProject(id, {
    ...(body.visibility && { visibility: body.visibility as "PUBLIC" | "PRIVATE" }),
    ...(body.name && { name: body.name as string }),
  })

  return NextResponse.json(updated)
}
