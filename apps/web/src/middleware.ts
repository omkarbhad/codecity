import { NextResponse, type NextRequest } from "next/server"

export async function middleware(req: NextRequest) {
  const skipAuth = process.env.SKIP_AUTH === "true"
  const { pathname } = req.nextUrl

  // When auth is bypassed, allow everything except redirect logged-in away from login
  if (skipAuth) {
    if (pathname === "/login") {
      return NextResponse.redirect(new URL("/dashboard", req.nextUrl))
    }
    return NextResponse.next()
  }

  // When auth is active, dynamically import NextAuth middleware
  const { default: NextAuth } = await import("next-auth")
  const authConfig = (await import("./auth.config")).default
  const { auth } = NextAuth(authConfig)

  // @ts-expect-error - NextAuth middleware typing mismatch
  const response = await auth(req)
  const isLoggedIn = !!(req as any).auth

  // Protected routes
  if (
    (pathname.startsWith("/dashboard") ||
      pathname.startsWith("/admin") ||
      pathname.startsWith("/analyze")) &&
    !isLoggedIn
  ) {
    return NextResponse.redirect(new URL("/login", req.nextUrl))
  }

  if (pathname === "/login" && isLoggedIn) {
    return NextResponse.redirect(new URL("/dashboard", req.nextUrl))
  }

  return response ?? NextResponse.next()
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}
