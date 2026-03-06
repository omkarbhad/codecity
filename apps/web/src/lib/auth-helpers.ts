import { cookies } from "next/headers"

const MOCK_USER = {
  id: "dev-user",
  name: "Dev User",
  email: "dev@codecity.local",
  role: "ADMIN" as const,
}

const AUTH_COOKIE = "magnova_session"
const MAGNOVA_SESSION_URL = "https://auth.magnova.ai/api/auth/session"

type RemoteSessionUser = {
  id?: string
  name?: string
  fullName?: string
  displayName?: string
  email?: string
  role?: string
  isAdmin?: boolean
}

type RemoteSessionPayload = {
  user?: RemoteSessionUser
  session?: { user?: RemoteSessionUser }
  data?: { user?: RemoteSessionUser }
  ok?: boolean
}

function extractUser(payload: RemoteSessionPayload | null): RemoteSessionUser | null {
  if (!payload) return null
  return payload.user ?? payload.session?.user ?? payload.data?.user ?? null
}

function resolveRole(user: RemoteSessionUser): "USER" | "ADMIN" {
  if (user.isAdmin) return "ADMIN"
  const normalized = user.role?.toUpperCase()
  if (normalized === "ADMIN") return "ADMIN"
  return "USER"
}

export async function getSessionUser() {
  if (process.env.SKIP_AUTH === "true") {
    return MOCK_USER
  }

  const nextCookies = await cookies()
  const cookieValue = nextCookies.get(AUTH_COOKIE)?.value
  if (!cookieValue) {
    return null
  }

  const cookieHeader = nextCookies
    .getAll()
    .map((item) => `${item.name}=${item.value}`)
    .join("; ")

  const response = await fetch(MAGNOVA_SESSION_URL, {
    method: "GET",
    cache: "no-store",
    credentials: "include",
    headers: cookieHeader ? { cookie: cookieHeader } : undefined,
  })

  if (!response.ok) {
    return null
  }

  const payload = (await response.json().catch(() => null)) as RemoteSessionPayload | null
  const remoteUser = extractUser(payload)
  if (!remoteUser?.id) {
    return null
  }

  const displayName = remoteUser.name ?? remoteUser.fullName ?? remoteUser.displayName ?? "User"

  return {
    id: remoteUser.id,
    name: displayName,
    email: remoteUser.email ?? "",
    role: resolveRole(remoteUser) as "USER" | "ADMIN",
  }
}
