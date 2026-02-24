import { auth } from "@/auth"
import { prisma } from "@codecity/db"
import { NextRequest, NextResponse } from "next/server"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const project = await prisma.project.findUnique({
    where: { id },
    select: { visibility: true, userId: true, status: true },
  })

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 })
  }

  // Auth check: public projects visible to anyone, private requires owner
  if (project.visibility === "PRIVATE") {
    const session = await auth()
    if (!session?.user || (session.user.id !== project.userId && session.user.role !== "ADMIN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }
  }

  if (project.status !== "COMPLETED") {
    return NextResponse.json({ error: "Analysis not complete", status: project.status }, { status: 400 })
  }

  const snapshot = await prisma.snapshot.findFirst({
    where: { projectId: id },
    orderBy: { createdAt: "desc" },
    select: { data: true },
  })

  if (!snapshot) {
    return NextResponse.json({ error: "Snapshot not found" }, { status: 404 })
  }

  return NextResponse.json(snapshot.data)
}
