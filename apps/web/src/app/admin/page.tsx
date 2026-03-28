import { getSessionUser } from "@/lib/auth-helpers"
import { redirect } from "next/navigation"

export const dynamic = "force-dynamic"

export default async function AdminOverviewPage() {
  const user = await getSessionUser()
  if (!user || user.role !== "ADMIN") {
    redirect("/dashboard")
  }

  // Mock admin stats (replace with real DB queries when @codecity/db is configured)
  const stats = [
    { label: "Total Users", value: 42, tag: "USR" },
    { label: "Total Projects", value: 156, tag: "PRJ" },
    { label: "Public Projects", value: 89, tag: "PUB" },
    { label: "Failed Analyses", value: 3, tag: "ERR" },
  ]

  return (
    <div className="space-y-8 animate-fade-up">
      <div>
        <p className="font-sans text-[10px] tracking-[0.2em] uppercase text-primary/40">
          System Status
        </p>
        <h1 className="mt-1 text-2xl font-bold text-foreground">Overview</h1>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-border/30 bg-card/20 p-5 transition-all hover:border-primary/20"
          >
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">{stat.label}</p>
              <span className="font-sans text-[9px] tracking-wider text-muted-foreground/30">
                {stat.tag}
              </span>
            </div>
            <p className="mt-2 text-3xl font-bold text-foreground">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5">
        <p className="text-xs text-amber-400">
          Database not connected. Configure <code className="font-sans">@codecity/db</code> to see live admin data.
        </p>
      </div>
    </div>
  )
}
