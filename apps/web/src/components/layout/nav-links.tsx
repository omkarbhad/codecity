"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { motion } from "framer-motion"

const links = [
  { href: "/explore", label: "Explore" },
  { href: "/dashboard", label: "Dashboard" },
]

export function NavLinks() {
  const pathname = usePathname()

  return (
    <div className="hidden items-center gap-1 rounded-xl border border-white/[0.06] bg-white/[0.02] p-1 md:flex">
      {links.map((link) => {
        const active = pathname === link.href

        return (
          <Link
            key={link.href}
            href={link.href}
            className={`relative rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors ${
              active ? "text-white" : "text-zinc-500 hover:text-zinc-200"
            }`}
          >
            {active ? (
              <motion.span
                layoutId="nav-active-bg"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                className="absolute inset-0 -z-10 rounded-lg border border-red-400/30 bg-red-500/18"
              />
            ) : null}
            {link.label}
          </Link>
        )
      })}
    </div>
  )
}
