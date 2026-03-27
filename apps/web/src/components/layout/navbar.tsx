import { getSessionUser } from "@/lib/auth-helpers"
import { Header } from "@/components/header"

export async function Navbar({ compact = false }: { compact?: boolean } = {}) {
  const user = await getSessionUser()
  return <Header user={user ? { name: user.name ?? null } : null} compact={compact} />
}
