import Link from "next/link"
import { getSessionUser } from "@/lib/auth-helpers"
import { Button } from "@codecity/ui/components/button"
import { MobileNav } from "@/components/layout/mobile-nav"

export async function Navbar() {
  const user = await getSessionUser()

  return (
    <nav className="sticky top-0 z-50 border-b border-zinc-800/50 bg-zinc-950/80 backdrop-blur-xl">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 flex h-14 items-center justify-between gap-4">
        {/* Left: Logo + Brand */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-xs font-bold text-white transition-shadow group-hover:shadow-primary/10">
            CC
          </div>
          <span className="text-sm font-semibold tracking-widest uppercase text-zinc-300">
            CodeCity
          </span>
        </Link>

        {/* Center: Nav pill */}
        <div className="hidden items-center gap-1 rounded-full border border-zinc-800 bg-zinc-900/50 p-1 md:flex">
          <Link
            href="/explore"
            className="rounded-full px-3 py-1.5 font-mono text-xs font-medium tracking-wide text-zinc-400 transition-colors hover:bg-primary/10 hover:text-white"
          >
            Explore
          </Link>
          <Link
            href="/dashboard"
            className="rounded-full px-3 py-1.5 font-mono text-xs font-medium tracking-wide text-zinc-400 transition-colors hover:bg-primary/10 hover:text-white"
          >
            Dashboard
          </Link>
        </div>

        {/* Right: Auth + Mobile */}
        <div className="flex items-center gap-2">
          {user ? (
            <p className="hidden font-mono text-xs uppercase tracking-wide text-zinc-500 sm:block">
              {user.name ?? "User"}
            </p>
          ) : (
            <Button
              asChild
              variant="outline"
              size="sm"
              className="hidden md:inline-flex border-zinc-800 text-zinc-300 hover:bg-primary/10 hover:text-white hover:border-primary/30 font-medium"
            >
              <Link href="/login">Sign In</Link>
            </Button>
          )}

          {/* Mobile hamburger */}
          <MobileNav isLoggedIn={!!user} userName={user?.name ?? null} />
        </div>
      </div>
    </nav>
  )
}
