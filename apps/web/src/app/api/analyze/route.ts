import { NextResponse } from "next/server"
import { getSessionUser } from "@/lib/auth-helpers"
import { parseGitHubUrl } from "@/lib/analysis/github"
import { analyzeRepository } from "@/lib/analysis/pipeline"
import { analysisCache, CACHE_TTL } from "@/lib/cache"
import { setProgress } from "@/lib/analysis/progress-store"
import { createProject, updateProject, saveSnapshot } from "@/lib/project-store"

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

  // Validate GitHub URL
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

  // Create project in DB
  const project = await createProject({
    name,
    repoUrl,
    visibility: visibility === "PUBLIC" ? "PUBLIC" : "PRIVATE",
    status: "PROCESSING",
    userId: user.id,
  })

  const projectId = project.id

  // Check cache
  const cacheKey = `repo:${owner}/${repo}`
  const cached = analysisCache.get(cacheKey) as Record<string, any> | null
  if (cached) {
    analysisCache.set(`project:${projectId}`, cached, CACHE_TTL.analysis)
    setProgress(projectId, {
      stage: "complete",
      progress: 1,
      message: "Analysis complete (cached)!",
      completed: true,
    })
    await updateProject(projectId, {
      status: "COMPLETED",
      fileCount: cached.stats?.totalFiles ?? 0,
      lineCount: cached.stats?.totalLines ?? 0,
    })
    // Save snapshot to DB
    await saveSnapshot(projectId, cached).catch(() => {})
    return NextResponse.json({ projectId }, { status: 201 })
  }

  // Run analysis in background
  setProgress(projectId, {
    stage: "pending",
    progress: 0,
    message: "Starting analysis...",
    completed: false,
  })

  analyzeRepository(repoUrl, (stage, progress, message) => {
    setProgress(projectId, {
      stage,
      progress,
      message,
      completed: stage === "complete",
    })
  })
    .then(async (snapshot) => {
      // Cache both by repo and project ID
      analysisCache.set(cacheKey, snapshot, CACHE_TTL.analysis)
      analysisCache.set(`project:${projectId}`, snapshot, CACHE_TTL.analysis)
      await updateProject(projectId, {
        status: "COMPLETED",
        fileCount: snapshot.stats.totalFiles,
        lineCount: snapshot.stats.totalLines,
      })
      // Persist snapshot to DB
      await saveSnapshot(projectId, snapshot).catch(() => {})
      setProgress(projectId, {
        stage: "complete",
        progress: 1,
        message: "Analysis complete!",
        completed: true,
      })
    })
    .catch(async (err) => {
      const errorMsg = err instanceof Error ? err.message : "Unknown error"
      setProgress(projectId, {
        stage: "error",
        progress: 0,
        message: errorMsg,
        error: errorMsg,
        completed: false,
      })
      await updateProject(projectId, {
        status: "FAILED",
        error: errorMsg,
      })
    })

  return NextResponse.json({ projectId }, { status: 201 })
}
