import { getSessionUser } from "@/lib/auth-helpers"
import { NextResponse } from "next/server"

const DEFAULT_SETTINGS = {
  registrationEnabled: true,
  publicGalleryEnabled: true,
  aiChatEnabled: true,
  maxFilesPerAnalysis: 500,
  maxConcurrentAnalyses: 3,
  maintenanceMode: false,
  maintenanceMessage: "",
}

export async function GET() {
  const user = await getSessionUser()
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  // Mock data — replace with real DB queries when @codecity/db is configured
  return NextResponse.json(DEFAULT_SETTINGS)
}

export async function PUT(request: Request) {
  const user = await getSessionUser()
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  // In production, persist settings to DB
  await request.json()

  return NextResponse.json({ success: true })
}
