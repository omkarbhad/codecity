import { NextResponse } from "next/server"

const AUTH_COOKIE = "magnova_session"
const COOKIE_OPTS = {
  maxAge: 0,
  path: "/",
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
}

export async function GET(request: Request) {
  const { origin } = new URL(request.url)
  const res = NextResponse.redirect(`${origin}/`)
  res.cookies.set(AUTH_COOKIE, "", COOKIE_OPTS)
  return res
}

export async function POST() {
  const res = NextResponse.json({ ok: true })
  res.cookies.set(AUTH_COOKIE, "", COOKIE_OPTS)
  return res
}
