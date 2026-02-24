import { auth } from "@/auth"
import { prisma } from "@codecity/db"
import { NextResponse } from "next/server"

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id } = await params
  const body = await request.json()

  const project = await prisma.project.update({
    where: { id },
    data: { visibility: body.visibility },
  })

  await prisma.auditLog.create({
    data: {
      action: `visibility_change_to_${body.visibility}`,
      targetType: "Project",
      targetId: id,
      adminId: session.user.id,
    },
  })

  return NextResponse.json(project)
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id } = await params
  await prisma.project.delete({ where: { id } })

  await prisma.auditLog.create({
    data: {
      action: "project_deleted",
      targetType: "Project",
      targetId: id,
      adminId: session.user.id,
    },
  })

  return NextResponse.json({ success: true })
}
