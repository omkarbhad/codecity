import { getSessionUser } from "@/lib/auth-helpers"
import { NextResponse } from "next/server"

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser()
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id } = await params
  const body = await request.json()

  if (id === user.id && body.role === "USER") {
    return NextResponse.json(
      { error: "Cannot demote yourself" },
      { status: 400 }
    )
  }

  // Mock response — replace with real DB update when @codecity/db is configured
  return NextResponse.json({ id, role: body.role })
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser()
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id } = await params

  if (id === user.id) {
    return NextResponse.json(
      { error: "Cannot delete yourself" },
      { status: 400 }
    )
  }

  // Mock response — replace with real DB delete when @codecity/db is configured
  return NextResponse.json({ success: true })
}
