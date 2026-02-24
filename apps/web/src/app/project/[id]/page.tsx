import { notFound, redirect } from "next/navigation"
import { auth } from "@/auth"
import { prisma } from "@codecity/db"
import type { CitySnapshot } from "@/lib/types/city"
import { ProjectVisualization } from "@/components/city/project-visualization"

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const project = await prisma.project.findUnique({
    where: { id },
    select: {
      name: true,
      repoUrl: true,
      visibility: true,
      status: true,
      userId: true,
    },
  })

  if (!project) notFound()

  // Auth check for private projects
  if (project.visibility === "PRIVATE") {
    const session = await auth()
    const userId = session?.user?.id
    const userRole = session?.user?.role

    if (!userId) {
      redirect("/login")
    }

    if (userId !== project.userId && userRole !== "ADMIN") {
      redirect("/dashboard")
    }
  }

  // Check if analysis is complete
  if (project.status !== "COMPLETED") {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="font-mono text-sm text-muted-foreground">
            {project.status === "PROCESSING" && (
              <>
                <div className="mb-2 h-1 w-48 overflow-hidden rounded-full bg-border/30">
                  <div className="h-full w-1/2 animate-pulse rounded-full bg-primary" />
                </div>
                <p>Analysis in progress for <span className="text-foreground">{project.name}</span></p>
                <p className="mt-1 text-xs text-muted-foreground/60">This may take a few minutes</p>
              </>
            )}
            {project.status === "PENDING" && (
              <p>Analysis queued for <span className="text-foreground">{project.name}</span></p>
            )}
            {project.status === "FAILED" && (
              <p className="text-red-400">Analysis failed for <span className="text-foreground">{project.name}</span></p>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Fetch the latest snapshot
  const snapshot = await prisma.snapshot.findFirst({
    where: { projectId: id },
    orderBy: { createdAt: "desc" },
    select: { data: true },
  })

  if (!snapshot) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <div className="font-mono text-sm text-muted-foreground">
          No snapshot data available for <span className="text-foreground">{project.name}</span>
        </div>
      </div>
    )
  }

  return (
    <ProjectVisualization
      snapshot={snapshot.data as unknown as CitySnapshot}
      projectName={project.name}
    />
  )
}
