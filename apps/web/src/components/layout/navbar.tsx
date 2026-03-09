import Link from "next/link"
import { getSessionUser } from "@/lib/auth-helpers"
import { Button } from "@codecity/ui/components/button"
import { MobileNav } from "@/components/layout/mobile-nav"

export async function Navbar() {
  const user = await getSessionUser()

  return (
    <nav className="sticky top-0 z-50 border-b border-zinc-800 bg-zinc-950/95 backdrop-blur-xl">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 flex h-16 items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary font-mono text-[10px] font-bold text-white shadow-[0_0_12px_hsl(var(--primary)/0.25)] transition-shadow group-hover:shadow-[0_0_18px_hsl(var(--primary)/0.4)]">
            CC
          </div>
          <span className="font-sans text-sm font-semibold tracking-[0.18em] uppercase text-zinc-300">
            CodeCity
          </span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden items-center gap-1 rounded-full border border-zinc-800 bg-zinc-900 p-1 md:flex">
          <Link
            href="/explore"
            className="rounded-full px-3 py-1.5 font-mono text-xs tracking-wide text-zinc-400 transition-colors hover:bg-primary/10 hover:text-primary"
          >
            Explore
          </Link>
          <Link
            href="/dashboard"
            className="rounded-full px-3 py-1.5 font-mono text-xs tracking-wide text-zinc-400 transition-colors hover:bg-primary/10 hover:text-primary"
          >
            Dashboard
          </Link>
        </div>

        <div className="flex items-center gap-2">
          {user ? (
            <p className="hidden font-mono text-[10px] uppercase tracking-wider text-zinc-500 sm:block">
              {user.name ?? "User"}
            </p>
          ) : (
            <Button asChild variant="outline" size="sm" className="hidden md:inline-flex border-primary/25 bg-primary/10 text-primary hover:bg-primary/20 hover:border-primary/40 shadow-[0_0_20px_hsl(var(--primary)/0.15)] font-medium">
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
