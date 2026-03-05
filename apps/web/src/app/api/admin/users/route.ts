import { getSessionUser } from "@/lib/auth-helpers"
import { NextResponse } from "next/server"

export async function GET() {
  const user = await getSessionUser()
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  // Mock data — replace with real DB queries when @codecity/db is configured
  const users = [
    {
      id: "1",
      name: "Demo User",
      email: "demo@codecity.dev",
      image: null,
      role: "USER" as const,
      createdAt: new Date().toISOString(),
      _count: { projects: 3 },
    },
    {
      id: "2",
      name: user.name ?? "Admin",
      email: user.email ?? "admin@codecity.dev",
      image: null,
      role: "ADMIN" as const,
      createdAt: new Date().toISOString(),
      _count: { projects: 5 },
    },
  ]

  return NextResponse.json(users)
}
