"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Users, Activity, Shield, Settings } from "lucide-react"

const NAV_ITEMS = [
  { href: "/admin", icon: Activity, label: "Overview", tag: "SYS" },
  { href: "/admin/users", icon: Users, label: "Users", tag: "USR" },
  { href: "/admin/moderation", icon: Shield, label: "Moderation", tag: "MOD" },
  { href: "/admin/settings", icon: Settings, label: "Settings", tag: "CFG" },
]

export function AdminSidebar() {
  const pathname = usePathname()

  return (
    <aside className="sticky top-[3.75rem] hidden h-[calc(100vh-3.75rem)] w-56 shrink-0 border-r border-border/30 bg-card/25 lg:block">
      <div className="border-b border-border/25 px-4 py-5">
        <p className="font-sans text-[10px] tracking-[0.3em] uppercase text-primary/40">
          Admin Console
        </p>
        <p className="mt-1 font-sans text-[10px] tracking-wide text-muted-foreground/45">
          System controls
        </p>
      </div>
      <nav className="space-y-1 px-2 py-3">
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(item.href)

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`group flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all ${
                isActive
                  ? "border-l-2 border-primary bg-primary/5 text-primary"
                  : "border-l-2 border-transparent text-muted-foreground hover:bg-card/50 hover:text-foreground"
              }`}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              <span className="flex-1 text-xs">{item.label}</span>
              <span className={`font-sans text-[9px] tracking-wider ${isActive ? "text-primary/50" : "text-muted-foreground/30"}`}>
                {item.tag}
              </span>
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
