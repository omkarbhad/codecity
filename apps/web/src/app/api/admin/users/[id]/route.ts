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

  if (id === session.user.id && body.role === "USER") {
    return NextResponse.json(
      { error: "Cannot demote yourself" },
      { status: 400 }
    )
  }

  const user = await prisma.user.update({
    where: { id },
    data: { role: body.role },
  })

  await prisma.auditLog.create({
    data: {
      action: `role_change_to_${body.role}`,
      targetType: "User",
      targetId: id,
      adminId: session.user.id,
    },
  })

  return NextResponse.json(user)
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

  if (id === session.user.id) {
    return NextResponse.json(
      { error: "Cannot delete yourself" },
      { status: 400 }
    )
  }

  await prisma.user.delete({ where: { id } })

  await prisma.auditLog.create({
    data: {
      action: "user_deleted",
      targetType: "User",
      targetId: id,
      adminId: session.user.id,
    },
  })

  return NextResponse.json({ success: true })
}
