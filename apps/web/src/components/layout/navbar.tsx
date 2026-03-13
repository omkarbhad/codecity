import Link from "next/link"
import { getSessionUser } from "@/lib/auth-helpers"
import { Button } from "@codecity/ui/components/button"
import { MobileNav } from "@/components/layout/mobile-nav"
import { NavLinks } from "@/components/layout/nav-links"

export async function Navbar() {
  const user = await getSessionUser()

  return (
    <nav className="fixed inset-x-0 top-3 z-50 px-4 sm:px-6">
      <div className="mx-auto flex h-11 w-full max-w-5xl items-center justify-between gap-4 rounded-xl border border-white/[0.06] bg-[#09090b]/82 px-4 backdrop-blur-2xl shadow-[0_14px_40px_rgba(9,9,11,0.6)]">
        {/* Left: Logo + Brand */}
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-[10px] font-bold text-white">
            CC
          </div>
          <span className="text-sm font-semibold text-zinc-50 tracking-wide">
            CodeCity
          </span>
        </Link>

        {/* Center: Nav pill */}
        <NavLinks />

        {/* Right: Auth + Mobile */}
        <div className="flex items-center gap-2">
          {user ? (
            <p className="hidden text-[13px] font-medium text-zinc-500 sm:block">
              {user.name ?? "User"}
            </p>
          ) : (
            <Button
              asChild
              variant="outline"
              size="sm"
              className="hidden md:inline-flex rounded-lg border border-white/[0.08] bg-white/[0.04] text-[13px] font-medium text-zinc-200 hover:border-white/[0.12] hover:bg-white/[0.06] hover:text-white"
            >
              <Link href="/login">Sign In</Link>
            </Button>
          )}

          <MobileNav isLoggedIn={!!user} userName={user?.name ?? null} />
        </div>
      </div>
    </nav>
  )
}
