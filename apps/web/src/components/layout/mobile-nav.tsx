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
        className="flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-800/50 bg-zinc-900/50 text-zinc-400 transition-colors hover:text-white hover:bg-zinc-800/50"
        aria-label={open ? "Close menu" : "Open menu"}
      >
        {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 top-14 z-40 bg-zinc-950/80 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />

          {/* Menu panel */}
          <div className="fixed left-0 right-0 top-14 z-50 border-b border-zinc-800/50 bg-zinc-950/95 backdrop-blur-xl animate-slide-up">
            <div className="max-w-6xl mx-auto px-4 py-4 space-y-1">
              {isLoggedIn && userName && (
                <div className="px-3 py-2 mb-2 border-b border-zinc-800/30 pb-4">
                  <p className="font-mono text-xs uppercase tracking-wide text-zinc-600">
                    Signed in as
                  </p>
                  <p className="font-mono text-xs text-zinc-300 mt-1">{userName}</p>
                </div>
              )}

              <Link
                href="/explore"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 font-mono text-xs font-medium tracking-wide text-zinc-400 transition-colors hover:bg-primary/10 hover:text-white"
              >
                <Compass className="h-4 w-4" />
                Explore
              </Link>
              <Link
                href="/dashboard"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 font-mono text-xs font-medium tracking-wide text-zinc-400 transition-colors hover:bg-primary/10 hover:text-white"
              >
                <LayoutDashboard className="h-4 w-4" />
                Dashboard
              </Link>

              {!isLoggedIn && (
                <Link
                  href="/login"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 font-mono text-xs font-medium tracking-wide text-primary transition-colors hover:bg-primary/10"
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
