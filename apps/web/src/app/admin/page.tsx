import { prisma } from "@codecity/db"

export const dynamic = "force-dynamic"

export default async function AdminOverviewPage() {
  const [userCount, projectCount, publicCount, recentErrors] =
    await Promise.all([
      prisma.user.count(),
      prisma.project.count(),
      prisma.project.count({ where: { visibility: "PUBLIC" } }),
      prisma.project.count({ where: { status: "FAILED" } }),
    ])

  const recentUsers = await prisma.user.findMany({
    select: { id: true, name: true, email: true, image: true, createdAt: true },
    orderBy: { createdAt: "desc" },
    take: 5,
  })

  const recentProjects = await prisma.project.findMany({
    select: {
      id: true,
      name: true,
      status: true,
      createdAt: true,
      user: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 5,
  })

  const stats = [
    { label: "Total Users", value: userCount },
    { label: "Total Projects", value: projectCount },
    { label: "Public Projects", value: publicCount },
    { label: "Failed Analyses", value: recentErrors },
  ]

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">System Overview</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Users */}
        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="text-lg font-semibold">Recent Users</h2>
          {recentUsers.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">No users yet.</p>
          ) : (
            <div className="mt-4 space-y-3">
              {recentUsers.map((user) => (
                <div key={user.id} className="flex items-center gap-3">
                  {user.image ? (
                    <img src={user.image} alt="" className="h-8 w-8 rounded-full" />
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-medium">
                      {user.name?.[0] ?? "?"}
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium">{user.name ?? "Anonymous"}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </div>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Projects */}
        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="text-lg font-semibold">Recent Projects</h2>
          {recentProjects.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">No projects yet.</p>
          ) : (
            <div className="mt-4 space-y-3">
              {recentProjects.map((project) => (
                <div key={project.id} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{project.name}</p>
                    <p className="text-xs text-muted-foreground">
                      by {project.user.name ?? "Anonymous"}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      project.status === "COMPLETED"
                        ? "bg-green-500/10 text-green-500"
                        : project.status === "FAILED"
                          ? "bg-destructive/10 text-destructive"
                          : "bg-yellow-500/10 text-yellow-500"
                    }`}
                  >
                    {project.status.toLowerCase()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
