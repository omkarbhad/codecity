"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@codecity/ui/lib/utils"
import { useScroll } from "@/hooks/use-scroll"
import { HeaderMobileNav } from "@/components/mobile-nav"

export const navLinks = [
  { label: "Features", href: "/#features" },
  { label: "Explore", href: "/explore" },
  { label: "Dashboard", href: "/dashboard" },
]

export function Header({
  user,
  compact = false,
}: {
  user: { name: string | null } | null
  compact?: boolean
}) {
  const scrolled = useScroll(10)
  const pathname = usePathname()

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full transition-all duration-300",
        scrolled
          ? "bg-[#07070c]/80 backdrop-blur-xl border-b border-white/[0.06]"
          : "bg-transparent border-b border-transparent",
      )}
    >
      <nav className={cn(
        "mx-auto flex w-full max-w-5xl items-center justify-between px-5",
        compact ? "h-10" : "h-14",
      )}>
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <img
            src="/logo.png"
            alt="CodeCity"
            className={cn("rounded-lg object-cover", compact ? "h-5 w-5" : "h-7 w-7")}
          />
          <span className={cn(
            "font-semibold text-zinc-100 tracking-tight",
            compact ? "text-xs" : "text-[14px]",
          )}>
            CodeCity
          </span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden items-center gap-0.5 md:flex">
          {navLinks.map((link) => {
            const active = link.href === "/#features" ? false : pathname.startsWith(link.href)
            return (
              <Link
                key={link.label}
                href={link.href}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-[13px] font-medium transition-all duration-150",
                  active
                    ? "text-zinc-100 bg-white/[0.07]"
                    : "text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.04]",
                )}
              >
                {link.label}
              </Link>
            )
          })}

          <div className="w-px h-4 bg-white/[0.08] mx-2" />

          {user ? (
            <Link
              href="/dashboard"
              className="px-3 py-1.5 rounded-lg text-[13px] font-medium text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.04] transition-all duration-150"
            >
              {user.name ?? "Dashboard"}
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="px-3 py-1.5 rounded-lg text-[13px] font-medium text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.04] transition-all duration-150"
              >
                Sign In
              </Link>
              <Link
                href="/dashboard"
                className="ml-1 px-3.5 py-1.5 rounded-lg text-[13px] font-medium bg-primary hover:bg-primary/90 text-white transition-colors duration-150"
              >
                Try It Free
              </Link>
            </>
          )}
        </div>

        {/* Mobile nav */}
        <HeaderMobileNav user={user} />
      </nav>
    </header>
  )
}
