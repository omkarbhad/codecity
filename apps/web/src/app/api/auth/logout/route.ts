import { NextResponse } from "next/server"

const AUTH_COOKIE = "magnova_session"
// Redirect back to the CodeCity login page after clearing the local cookie
const POST_LOGOUT_URL = "https://auth.magnova.ai/codecity"

export async function GET() {
  const response = NextResponse.redirect(POST_LOGOUT_URL)
  response.cookies.set(AUTH_COOKIE, "", {
    maxAge: 0,
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  })
  return response
}
