"use client"

import { useState } from "react"
import Link from "next/link"
import { Menu, X, Compass, LayoutDashboard, LogIn } from "lucide-react"

export function MobileNav({
  isLoggedIn,
  userName,
}: {
  isLoggedIn: boolean
  userName: string | null
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className="md:hidden">
      <button
        onClick={() => setOpen(!open)}
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-border/40 bg-card/35 text-muted-foreground transition-colors hover:text-foreground hover:bg-card/60"
        aria-label={open ? "Close menu" : "Open menu"}
      >
        {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 top-[3.75rem] z-40 bg-background/80 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />

          {/* Menu panel */}
          <div className="fixed left-0 right-0 top-[3.75rem] z-50 border-b border-border/40 bg-background/95 backdrop-blur-xl animate-slide-up">
            <div className="content-container py-4 space-y-1">
              {isLoggedIn && userName && (
                <div className="px-3 py-2 mb-2 border-b border-border/20 pb-3">
                  <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground/50">
                    Signed in as
                  </p>
                  <p className="font-mono text-xs text-foreground mt-0.5">{userName}</p>
                </div>
              )}

              <Link
                href="/explore"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 font-mono text-xs tracking-wide text-muted-foreground/70 transition-colors hover:bg-primary/10 hover:text-primary"
              >
                <Compass className="h-4 w-4" />
                Explore
              </Link>
              <Link
                href="/dashboard"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 font-mono text-xs tracking-wide text-muted-foreground/70 transition-colors hover:bg-primary/10 hover:text-primary"
              >
                <LayoutDashboard className="h-4 w-4" />
                Dashboard
              </Link>

              {!isLoggedIn && (
                <Link
                  href="/login"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 font-mono text-xs tracking-wide text-primary transition-colors hover:bg-primary/10"
                >
                  <LogIn className="h-4 w-4" />
                  Sign In
                </Link>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
