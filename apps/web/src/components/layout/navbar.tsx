import Link from "next/link"
import { getSessionUser } from "@/lib/auth-helpers"
import { Button } from "@codecity/ui/components/button"
import { MobileNav } from "@/components/layout/mobile-nav"

export async function Navbar() {
  const user = await getSessionUser()

  return (
    <nav className="sticky top-0 z-50 bg-[#09090b]/80 backdrop-blur-xl border-b border-white/[0.06]">
      <div className="max-w-5xl mx-auto px-5 sm:px-8 md:px-10 flex h-[52px] items-center justify-between gap-4">
        {/* Left: Logo + Brand */}
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-[10px] font-bold text-white">
            CC
          </div>
          <span className="text-sm font-semibold text-zinc-50 tracking-wide">
            CodeCity
          </span>
        </Link>

        {/* Center: Nav pill */}
        <div className="hidden items-center gap-1 rounded-xl bg-[#09090b]/50 border border-white/[0.04] p-1 md:flex">
          <Link
            href="/explore"
            className="rounded-lg px-3 py-1.5 text-[13px] font-medium text-zinc-500 hover:text-white transition-colors duration-200"
          >
            Explore
          </Link>
          <Link
            href="/dashboard"
            className="rounded-lg px-3 py-1.5 text-[13px] font-medium text-zinc-500 hover:text-white transition-colors duration-200"
          >
            Dashboard
          </Link>
        </div>

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
              className="hidden md:inline-flex rounded-lg text-[13px] font-medium text-zinc-300 hover:text-white bg-white/[0.04] border border-white/[0.08] hover:border-white/[0.12] hover:bg-white/[0.06] transition-all duration-200"
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
