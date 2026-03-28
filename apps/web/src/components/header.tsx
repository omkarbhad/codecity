"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@codecity/ui/lib/utils"
import { useScroll } from "@/hooks/use-scroll"
import { Button } from "@codecity/ui/components/button"
import { HeaderMobileNav } from "@/components/mobile-nav"
import { motion } from "framer-motion"

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
        "sticky top-0 z-50 w-full border-b border-transparent transition-all duration-200",
        scrolled &&
          "bg-black/40 backdrop-blur-2xl border-white/[0.07]",
      )}
    >
      <nav className={cn(
        "mx-auto flex w-full max-w-5xl items-center justify-between px-4",
        compact ? "h-10" : "h-14",
      )}>
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2 rounded-md p-1.5 hover:bg-muted dark:hover:bg-muted/50"
        >
          <img
            src="/logo.png"
            alt="CodeCity"
            className={cn(
              "rounded-md",
              compact ? "h-5 w-5" : "h-6 w-6",
            )}
          />
          <span className={cn(
            "font-semibold text-zinc-50 tracking-wide",
            compact ? "text-xs" : "text-sm",
          )}>
            CodeCity
          </span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => {
            const active = pathname.startsWith(link.href)
            return (
              <Button asChild key={link.label} size="sm" variant="ghost" className="relative">
                <Link href={link.href}>
                  {active && (
                    <motion.span
                      layoutId="header-nav-active"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                      className="absolute inset-0 -z-10 rounded-md border border-red-400/30 bg-red-500/18"
                    />
                  )}
                  {link.label}
                </Link>
              </Button>
            )
          })}
          {user ? (
            <span className="ml-2 text-[13px] font-medium text-zinc-500">
              {user.name ?? "User"}
            </span>
          ) : (
            <>
              <Button asChild size="sm" variant="ghost" className="ml-2">
                <Link href="/login">Sign In</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/dashboard">Try It Free</Link>
              </Button>
            </>
          )}
        </div>

        {/* Mobile nav */}
        <HeaderMobileNav user={user} />
      </nav>
    </header>
  )
}
