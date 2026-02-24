import Link from "next/link"
import { auth } from "@/auth"

export async function Navbar() {
  const session = await auth()

  return (
    <nav className="sticky top-0 z-50 border-b border-border/50 bg-background/60 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2">
          <svg className="h-5 w-5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 21h18M3 7v14M21 7v14M6 7V3h4v4M14 7V3h4v4M9 21v-4h6v4" />
          </svg>
          <span className="font-sans text-sm font-semibold tracking-widest uppercase text-foreground">
            CodeCity
          </span>
        </Link>

        <div className="flex items-center gap-1">
          <Link
            href="/dashboard?tab=explore"
            className="rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-all hover:text-primary"
          >
            Explore
          </Link>

          {session?.user ? (
            <Link
              href="/dashboard"
              className="ml-2 rounded-md border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary transition-all hover:bg-primary/20 glow-red"
            >
              Dashboard
            </Link>
          ) : (
            <Link
              href="/login"
              className="ml-2 rounded-md border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary transition-all hover:bg-primary/20 glow-red"
            >
              Sign In
            </Link>
          )}
        </div>
      </div>
    </nav>
  )
}
