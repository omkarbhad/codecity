import { auth } from "@/auth"
import { prisma } from "@codecity/db"
import { NextResponse } from "next/server"
import { analyzeRepository } from "@/lib/analysis/pipeline"

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { repoUrl, visibility } = await request.json()
  if (!repoUrl) {
    return NextResponse.json({ error: "repoUrl is required" }, { status: 400 })
  }

  // Extract owner/repo for display name
  const match = repoUrl.match(/(?:github\.com\/)?([^/]+\/[^/]+?)(?:\.git)?$/)
  const name = match ? match[1] : repoUrl

  // Create project in DB
  const project = await prisma.project.create({
    data: {
      name,
      repoUrl,
      visibility: visibility ?? "PRIVATE",
      status: "PROCESSING",
      userId: session.user.id,
    },
  })

  // Run analysis asynchronously (don't await — let it run in background)
  analyzeRepository(repoUrl, (stage, progress, message) => {
    // Update project status in DB for SSE polling
    prisma.project.update({
      where: { id: project.id },
      data: {
        analysisData: { stage, progress, message } as any,
      },
    }).catch(console.error)
  })
    .then(async (snapshot) => {
      await prisma.snapshot.create({
        data: {
          data: snapshot as any,
          projectId: project.id,
        },
      })
      await prisma.project.update({
        where: { id: project.id },
        data: {
          status: "COMPLETED",
          fileCount: snapshot.stats.totalFiles,
          lineCount: snapshot.stats.totalLines,
        },
      })
    })
    .catch(async (error) => {
      await prisma.project.update({
        where: { id: project.id },
        data: {
          status: "FAILED",
          error: error instanceof Error ? error.message : String(error),
        },
      })
    })

  return NextResponse.json({ projectId: project.id }, { status: 201 })
}
