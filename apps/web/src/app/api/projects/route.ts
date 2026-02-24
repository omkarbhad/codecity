import { auth } from "@/auth"
import { prisma } from "@codecity/db"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const tab = searchParams.get("tab")

  if (tab === "explore") {
    const projects = await prisma.project.findMany({
      where: { visibility: "PUBLIC", status: "COMPLETED" },
      include: { user: { select: { name: true, image: true } } },
      orderBy: { createdAt: "desc" },
      take: 20,
    })
    return NextResponse.json(projects)
  }

  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const projects = await prisma.project.findMany({
    where: { userId: session.user.id },
    orderBy: { updatedAt: "desc" },
  })
  return NextResponse.json(projects)
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json()
  const { repoUrl, visibility } = body

  const match = repoUrl.match(/github\.com\/([^/]+\/[^/]+)/)
  const name = match ? match[1] : repoUrl

  const project = await prisma.project.create({
    data: {
      name,
      repoUrl,
      visibility: visibility ?? "PRIVATE",
      userId: session.user.id,
    },
  })

  return NextResponse.json(project, { status: 201 })
}
