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
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.04] text-zinc-400 transition-all duration-200 hover:text-white hover:border-white/[0.12]"
        aria-label={open ? "Close menu" : "Open menu"}
      >
        {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 top-[52px] z-40 bg-[#09090b]/80 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />

          {/* Menu panel */}
          <div className="fixed left-0 right-0 top-[52px] z-50 border-b border-white/[0.06] bg-[#09090b]">
            <div className="max-w-5xl mx-auto px-5 py-4 space-y-1">
              {isLoggedIn && userName && (
                <div className="px-3 py-2 mb-2 border-b border-white/[0.06] pb-4">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                    Signed in as
                  </p>
                  <p className="text-[13px] font-medium text-zinc-50 mt-1">{userName}</p>
                </div>
              )}

              <Link
                href="/explore"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium text-zinc-500 transition-colors duration-200 hover:bg-white/[0.04] hover:text-white"
              >
                <Compass className="h-4 w-4" />
                Explore
              </Link>
              <Link
                href="/dashboard"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium text-zinc-500 transition-colors duration-200 hover:bg-white/[0.04] hover:text-white"
              >
                <LayoutDashboard className="h-4 w-4" />
                Dashboard
              </Link>

              {!isLoggedIn && (
                <Link
                  href="/login"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium text-primary transition-colors duration-200 hover:bg-white/[0.04]"
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
