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
    { label: "Total Users", value: userCount, tag: "USR" },
    { label: "Total Projects", value: projectCount, tag: "PRJ" },
    { label: "Public Projects", value: publicCount, tag: "PUB" },
    { label: "Failed Analyses", value: recentErrors, tag: "ERR" },
  ]

  return (
    <div className="space-y-8 animate-fade-up">
      <div>
        <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-primary/40">System Status</p>
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
              <span className="font-mono text-[9px] tracking-wider text-muted-foreground/30">{stat.tag}</span>
            </div>
            <p className="mt-2 text-3xl font-bold text-foreground">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-border/30 bg-card/20 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-foreground">Recent Users</h2>
            <span className="font-mono text-[9px] tracking-wider text-muted-foreground/30">LATEST</span>
          </div>
          {recentUsers.length === 0 ? (
            <p className="text-xs text-muted-foreground/50">No users yet.</p>
          ) : (
            <div className="space-y-3">
              {recentUsers.map((user) => (
                <div key={user.id} className="flex items-center gap-3">
                  {user.image ? (
                    <img src={user.image} alt="" className="h-7 w-7 rounded-full" />
                  ) : (
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 border border-primary/20 font-mono text-[10px] text-primary">
                      {user.name?.[0]?.toUpperCase() ?? "?"}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">{user.name ?? "Anonymous"}</p>
                    <p className="font-mono text-[10px] text-muted-foreground/50 truncate">{user.email}</p>
                  </div>
                  <span className="font-mono text-[10px] text-muted-foreground/30 shrink-0">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-border/30 bg-card/20 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-foreground">Recent Projects</h2>
            <span className="font-mono text-[9px] tracking-wider text-muted-foreground/30">QUEUE</span>
          </div>
          {recentProjects.length === 0 ? (
            <p className="text-xs text-muted-foreground/50">No projects yet.</p>
          ) : (
            <div className="space-y-3">
              {recentProjects.map((project) => (
                <div key={project.id} className="flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">{project.name}</p>
                    <p className="font-mono text-[10px] text-muted-foreground/50">
                      by {project.user.name ?? "Anonymous"}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-md px-2 py-0.5 font-mono text-[9px] tracking-wider uppercase ${
                      project.status === "COMPLETED"
                        ? "status-completed"
                        : project.status === "FAILED"
                          ? "status-failed"
                          : project.status === "PROCESSING"
                            ? "status-processing"
                            : "status-pending"
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
