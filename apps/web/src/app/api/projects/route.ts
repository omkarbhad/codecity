import { NextResponse } from "next/server"
import { getSessionUser } from "@/lib/auth-helpers"
import { getProjectsByUser, getAllPublicProjects, createProject } from "@/lib/project-store"
import { parseGitHubUrl } from "@/lib/analysis/github"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const tab = searchParams.get("tab")

  if (tab === "explore") {
    const projects = await getAllPublicProjects()
    return NextResponse.json(projects)
  }

  const user = await getSessionUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const projects = await getProjectsByUser(user.id)
  return NextResponse.json(projects)
}

export async function POST(request: Request) {
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

  const project = await createProject({
    name,
    repoUrl,
    visibility: visibility ?? "PRIVATE",
    status: "PROCESSING",
    userId: user.id,
  })

  return NextResponse.json(project, { status: 201 })
}
