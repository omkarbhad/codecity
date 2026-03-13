import { NextResponse } from "next/server"
import { getSessionUser } from "@/lib/auth-helpers"
import { parseGitHubUrl } from "@/lib/analysis/github"
import { inngest } from "@/lib/inngest"
import { getAnalysisSnapshot } from "@/lib/redis"
import { createProject, saveSnapshot } from "@/lib/project-store"
import { analysisCache, CACHE_TTL } from "@/lib/cache"

export async function POST(request: Request) {
  const user = await getSessionUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const { repoUrl, visibility } = body as { repoUrl?: string; visibility?: string }
  if (!repoUrl || typeof repoUrl !== "string") {
    return NextResponse.json({ error: "repoUrl is required" }, { status: 400 })
  }

  let owner: string, repo: string
  try {
    ;({ owner, repo } = parseGitHubUrl(repoUrl))
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Invalid GitHub URL" },
      { status: 400 }
    )
  }

  const name = `${owner}/${repo}`

  // Check in-memory cache first
  const cacheKey = `repo:${owner}/${repo}`
  const cached = analysisCache.get(cacheKey) as Record<string, unknown> | null
  if (cached) {
    const project = await createProject({
      name,
      repoUrl,
      visibility: visibility === "PUBLIC" ? "PUBLIC" : "PRIVATE",
      status: "COMPLETED",
      fileCount: (cached.stats as Record<string, number>)?.totalFiles ?? 0,
      lineCount: (cached.stats as Record<string, number>)?.totalLines ?? 0,
      userId: user.id,
    })
    analysisCache.set(`project:${project.id}`, cached, CACHE_TTL.analysis)
    await saveSnapshot(project.id, cached).catch(() => {})
    return NextResponse.json({ projectId: project.id, snapshot: cached }, { status: 200 })
  }

  // Create project in PROCESSING state
  const project = await createProject({
    name,
    repoUrl,
    visibility: visibility === "PUBLIC" ? "PUBLIC" : "PRIVATE",
    status: "PROCESSING",
    userId: user.id,
  })

  // Dispatch to Inngest — returns immediately, no timeout!
  await inngest.send({
    name: "codecity/analyze.requested",
    data: {
      repoUrl,
      projectId: project.id,
      githubToken: user.githubToken,
    },
  })

  // Return project ID immediately — client polls /progress for updates
  return NextResponse.json({ projectId: project.id }, { status: 202 })
}
