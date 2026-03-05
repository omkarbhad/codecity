import { cookies } from "next/headers"
import { verifyToken } from "./firebase-admin"

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

  const token = cookies().get("magnova_session")?.value
  if (!token) {
    return null
  }

  const decoded = await verifyToken(token)
  if (!decoded) {
    return null
  }

  return {
    id: decoded.uid,
    name: decoded.name ?? "User",
    email: decoded.email ?? "",
    role: "USER" as "USER" | "ADMIN",
  }
}
