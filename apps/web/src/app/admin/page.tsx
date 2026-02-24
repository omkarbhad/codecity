import { prisma } from "@codecity/db"

export default async function AdminOverviewPage() {
  const [userCount, projectCount, publicCount, recentErrors] =
    await Promise.all([
      prisma.user.count(),
      prisma.project.count(),
      prisma.project.count({ where: { visibility: "PUBLIC" } }),
      prisma.project.count({ where: { status: "FAILED" } }),
    ])

  const stats = [
    { label: "Total Users", value: userCount },
    { label: "Total Projects", value: projectCount },
    { label: "Public Projects", value: publicCount },
    { label: "Failed Analyses", value: recentErrors },
  ]

  return (
    <div>
      <h1 className="text-2xl font-bold">System Overview</h1>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-border bg-card p-6"
          >
            <p className="text-sm text-muted-foreground">{stat.label}</p>
            <p className="mt-2 text-3xl font-bold">{stat.value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
