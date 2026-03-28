import { NextRequest, NextResponse } from 'next/server';

const AUTH_COOKIE = 'magnova_session';
const LOGIN_URL = 'https://auth.magnova.ai/codecity';
const PROTECTED = ['/dashboard', '/project', '/settings', '/profile', '/analyze'];

export async function middleware(req: NextRequest) {
  // Skip auth entirely if SKIP_AUTH is enabled
  if (process.env.SKIP_AUTH === "true") {
    return NextResponse.next();
  }

  const token = req.cookies.get(AUTH_COOKIE)?.value;
  const path = req.nextUrl.pathname;
  const isProtected = PROTECTED.some(p => path.startsWith(p));

  if (isProtected && !token) {
    const redirect = encodeURIComponent(req.url);
    return NextResponse.redirect(`${LOGIN_URL}?redirect=${redirect}`);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/project/:path*', '/settings/:path*', '/profile/:path*', '/analyze/:path*'],
};
