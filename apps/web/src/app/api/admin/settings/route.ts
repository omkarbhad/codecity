import { auth } from "@/auth"
import { prisma } from "@codecity/db"
import { NextResponse } from "next/server"

const DEFAULT_SETTINGS: Record<string, unknown> = {
  registrationEnabled: true,
  publicGalleryEnabled: true,
  aiChatEnabled: true,
  maxFilesPerAnalysis: 500,
  maxConcurrentAnalyses: 3,
  maintenanceMode: false,
  maintenanceMessage: "",
}

export async function GET() {
  const session = await auth()
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const dbSettings = await prisma.platformSettings.findMany()
  const settings = { ...DEFAULT_SETTINGS }

  for (const s of dbSettings) {
    settings[s.key] = s.value
  }

  return NextResponse.json(settings)
}

export async function PUT(request: Request) {
  const session = await auth()
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const body = await request.json()

  for (const [key, value] of Object.entries(body)) {
    await prisma.platformSettings.upsert({
      where: { key },
      update: { value: value as any },
      create: { key, value: value as any },
    })
  }

  await prisma.auditLog.create({
    data: {
      action: "settings_updated",
      targetType: "PlatformSettings",
      targetId: "global",
      metadata: body,
      adminId: session.user.id,
    },
  })

  return NextResponse.json({ success: true })
}
