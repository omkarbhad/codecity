import { NextResponse } from "next/server"
import { getSessionUser } from "@/lib/auth-helpers"

export async function GET() {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    return NextResponse.json(user)
  } catch (error) {
    console.error("[API /me GET]", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
