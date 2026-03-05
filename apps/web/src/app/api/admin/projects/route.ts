import { getSessionUser } from "@/lib/auth-helpers"
import { NextResponse } from "next/server"

export async function GET() {
  const user = await getSessionUser()
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  // Mock data — replace with real DB queries when @codecity/db is configured
  const projects = [
    {
      id: "1",
      name: "excalidraw/excalidraw",
      repoUrl: "https://github.com/excalidraw/excalidraw",
      visibility: "PUBLIC",
      fileCount: 247,
      createdAt: new Date().toISOString(),
      user: { name: "Excalidraw Team", email: "team@excalidraw.com" },
    },
  ]

  return NextResponse.json(projects)
}
