import { NextResponse } from "next/server"
import { verifyToken } from "@/lib/firebase-admin"

const COOKIE_NAME = "magnova_session"
const SESSION_MAX_AGE = 60 * 60 * 24 * 7

export async function POST(req: Request) {
  const { token } = (await req.json().catch(() => ({}))) as { token?: string }

  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 })
  }

  const decoded = await verifyToken(token)

  if (!decoded) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 })
  }

  const response = NextResponse.json({ ok: true })
  response.cookies.set({
    name: COOKIE_NAME,
    value: token,
    httpOnly: true,
    path: "/",
    maxAge: SESSION_MAX_AGE,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  })

  return response
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true })
  response.cookies.set({
    name: COOKIE_NAME,
    value: "",
    httpOnly: true,
    path: "/",
    maxAge: 0,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  })
  return response
}
