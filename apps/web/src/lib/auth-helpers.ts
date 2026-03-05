const MOCK_USER = {
  id: "dev-user",
  name: "Dev User",
  email: "dev@codecity.local",
  role: "ADMIN" as const,
}

export async function getSessionUser() {
  if (process.env.SKIP_AUTH === "true") {
    return MOCK_USER
  }

  try {
    const { auth } = await import("@/auth")
    const session = await auth()
    if (!session?.user) return null
    return {
      id: (session.user as any).id ?? "unknown",
      name: session.user.name ?? "User",
      email: session.user.email ?? "",
      role: ((session.user as any).role ?? "USER") as "USER" | "ADMIN",
    }
  } catch {
    return null
  }
}
