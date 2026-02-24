import { auth } from "@/auth"
import { prisma } from "@codecity/db"
import { NextResponse } from "next/server"

export async function GET() {
  const session = await auth()
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const projects = await prisma.project.findMany({
    where: { visibility: "PUBLIC" },
    include: { user: { select: { name: true, email: true } } },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json(projects)
}
