import { NextResponse } from "next/server"
import { getSessionUser } from "@/lib/auth-helpers"
import { parseGitHubUrl } from "@/lib/analysis/github"
import { analyzeRepository } from "@/lib/analysis/pipeline"
import { analysisCache, CACHE_TTL } from "@/lib/cache"
import { createProject, updateProject, saveSnapshot } from "@/lib/project-store"

export const maxDuration = 60 // Allow up to 60s on Vercel Pro (10s on Hobby)

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
  const cacheKey = `repo:${owner}/${repo}`

  // Check cache first
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

  // Create project
  const project = await createProject({
    name,
    repoUrl,
    visibility: visibility === "PUBLIC" ? "PUBLIC" : "PRIVATE",
    status: "PROCESSING",
    userId: user.id,
  })

  try {
    // Run analysis synchronously
    const snapshot = await analyzeRepository(repoUrl)

    // Cache and persist
    analysisCache.set(cacheKey, snapshot, CACHE_TTL.analysis)
    analysisCache.set(`project:${project.id}`, snapshot, CACHE_TTL.analysis)
    await updateProject(project.id, {
      status: "COMPLETED",
      fileCount: snapshot.stats.totalFiles,
      lineCount: snapshot.stats.totalLines,
    })
    await saveSnapshot(project.id, snapshot).catch(() => {})

    return NextResponse.json({ projectId: project.id, snapshot }, { status: 201 })
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Analysis failed"
    await updateProject(project.id, { status: "FAILED", error: errorMsg })
    return NextResponse.json({ error: errorMsg }, { status: 500 })
  }
}
