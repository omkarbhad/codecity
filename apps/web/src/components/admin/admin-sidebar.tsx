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
    <aside className="w-52 shrink-0 border-r border-border/30 bg-card/20">
      <div className="px-4 py-5">
        <p className="font-mono text-[10px] tracking-[0.3em] uppercase text-primary/40">
          Admin Console
        </p>
      </div>
      <nav className="space-y-0.5 px-2">
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
                  ? "bg-primary/5 text-primary border-l-2 border-primary"
                  : "text-muted-foreground hover:bg-card/50 hover:text-foreground border-l-2 border-transparent"
              }`}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              <span className="flex-1 text-xs">{item.label}</span>
              <span className={`font-mono text-[9px] tracking-wider ${isActive ? "text-primary/50" : "text-muted-foreground/30"}`}>
                {item.tag}
              </span>
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
