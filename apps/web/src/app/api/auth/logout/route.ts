import { NextResponse } from "next/server"

const AUTH_COOKIE = "magnova_session"
const MAGNOVA_LOGOUT_URL = "https://auth.magnova.ai/api/auth/signout"

export async function POST() {
  // Clear the Magnova session cookie on our domain
  const response = NextResponse.json({ ok: true })
  response.cookies.set(AUTH_COOKIE, "", {
    maxAge: 0,
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  })
  return response
}

export async function GET() {
  // Also clear via GET so a simple link redirect works
  const response = NextResponse.redirect(MAGNOVA_LOGOUT_URL)
  response.cookies.set(AUTH_COOKIE, "", {
    maxAge: 0,
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  })
  return response
}
