"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Users, Activity, Shield, Settings } from "lucide-react"

const NAV_ITEMS = [
  { href: "/admin", icon: Activity, label: "Overview" },
  { href: "/admin/users", icon: Users, label: "Users" },
  { href: "/admin/moderation", icon: Shield, label: "Moderation" },
  { href: "/admin/settings", icon: Settings, label: "Settings" },
]

export function AdminSidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-56 shrink-0 border-r border-border bg-card">
      <div className="p-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Admin
        </h2>
      </div>
      <nav className="space-y-1 px-2">
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(item.href)

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                isActive
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground"
              }`}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
