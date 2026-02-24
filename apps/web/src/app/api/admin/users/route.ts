import { auth } from "@/auth"
import { prisma } from "@codecity/db"
import { NextResponse } from "next/server"

export async function GET() {
  const session = await auth()
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      role: true,
      createdAt: true,
      _count: { select: { projects: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json(users)
}
