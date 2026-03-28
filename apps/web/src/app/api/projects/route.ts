import { NextResponse } from "next/server"
import { getSessionUser } from "@/lib/auth-helpers"
import { getProjectsByUser, getAllPublicProjects, createProject, findCompletedPublicProject, getSnapshot, saveSnapshot } from "@/lib/project-store"
import { parseGitHubUrl } from "@/lib/analysis/github"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const tab = searchParams.get("tab")

    if (tab === "explore") {
      const projects = await getAllPublicProjects()
      return NextResponse.json(projects, {
        headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" },
      })
    }

    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const projects = await getProjectsByUser(user.id)
    return NextResponse.json(projects, {
      headers: { "Cache-Control": "private, s-maxage=10, stale-while-revalidate=30" },
    })
  } catch (error) {
    console.error("[API /projects GET]", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { repoUrl, visibility } = body

    let name: string
    try {
      const { owner, repo } = parseGitHubUrl(repoUrl)
      name = `${owner}/${repo}`
    } catch {
      name = repoUrl
    }

    // For public repos, check if we already have a completed analysis
    const isPublic = (visibility ?? "PRIVATE") === "PUBLIC"
    if (isPublic) {
      const existing = await findCompletedPublicProject(repoUrl)
      if (existing) {
        // Clone the existing analysis for this user instead of re-analyzing
        const existingSnapshot = await getSnapshot(existing.id)
        const project = await createProject({
          name,
          repoUrl,
          visibility: "PUBLIC",
          status: "COMPLETED",
          fileCount: existing.fileCount,
          lineCount: existing.lineCount,
          userId: user.id,
        })
        if (existingSnapshot) {
          await saveSnapshot(project.id, existingSnapshot.data)
        }
        return NextResponse.json(project, { status: 201 })
      }
    }

    const project = await createProject({
      name,
      repoUrl,
      visibility: visibility ?? "PRIVATE",
      status: "PROCESSING",
      userId: user.id,
    })

    return NextResponse.json(project, { status: 201 })
  } catch (error) {
    console.error("[API /projects POST]", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}
