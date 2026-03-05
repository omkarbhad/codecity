import { prisma, Visibility, AnalysisStatus } from "@codecity/db"

// Re-export a compatible interface so consumers don't break
export interface ProjectRecord {
  id: string
  name: string
  repoUrl: string
  visibility: "PUBLIC" | "PRIVATE"
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED"
  fileCount: number
  lineCount: number
  userId: string
  error?: string | null
  createdAt: string
  updatedAt: string
}

// Helper to convert Prisma model → ProjectRecord
function toRecord(p: {
  id: string
  name: string
  repoUrl: string
  visibility: Visibility
  status: AnalysisStatus
  fileCount: number
  lineCount: number
  userId: string
  error: string | null
  createdAt: Date
  updatedAt: Date
}): ProjectRecord {
  return {
    id: p.id,
    name: p.name,
    repoUrl: p.repoUrl,
    visibility: p.visibility,
    status: p.status,
    fileCount: p.fileCount,
    lineCount: p.lineCount,
    userId: p.userId,
    error: p.error,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  }
}

export async function getProject(id: string): Promise<ProjectRecord | null> {
  const p = await prisma.project.findUnique({ where: { id } })
  return p ? toRecord(p) : null
}

export async function createProject(data: {
  id?: string
  name: string
  repoUrl: string
  visibility?: "PUBLIC" | "PRIVATE"
  status?: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED"
  fileCount?: number
  lineCount?: number
  userId: string
  error?: string
}): Promise<ProjectRecord> {
  const p = await prisma.project.create({
    data: {
      ...(data.id && { id: data.id }),
      name: data.name,
      repoUrl: data.repoUrl,
      visibility: (data.visibility ?? "PRIVATE") as Visibility,
      status: (data.status ?? "PENDING") as AnalysisStatus,
      fileCount: data.fileCount ?? 0,
      lineCount: data.lineCount ?? 0,
      userId: data.userId,
      error: data.error,
    },
  })
  return toRecord(p)
}

export async function updateProject(
  id: string,
  data: Partial<{
    name: string
    visibility: "PUBLIC" | "PRIVATE"
    status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED"
    fileCount: number
    lineCount: number
    error: string | null
  }>
): Promise<ProjectRecord> {
  const updateData: Record<string, unknown> = {}
  if (data.name !== undefined) updateData.name = data.name
  if (data.visibility !== undefined) updateData.visibility = data.visibility as Visibility
  if (data.status !== undefined) updateData.status = data.status as AnalysisStatus
  if (data.fileCount !== undefined) updateData.fileCount = data.fileCount
  if (data.lineCount !== undefined) updateData.lineCount = data.lineCount
  if (data.error !== undefined) updateData.error = data.error

  const p = await prisma.project.update({ where: { id }, data: updateData })
  return toRecord(p)
}

export async function deleteProject(id: string): Promise<void> {
  await prisma.project.delete({ where: { id } })
}

export async function getProjectsByUser(userId: string): Promise<ProjectRecord[]> {
  const projects = await prisma.project.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
  })
  return projects.map(toRecord)
}

export async function getAllPublicProjects(): Promise<ProjectRecord[]> {
  const projects = await prisma.project.findMany({
    where: { visibility: "PUBLIC", status: "COMPLETED" },
    orderBy: { updatedAt: "desc" },
    take: 50,
  })
  return projects.map(toRecord)
}

// ── Snapshot helpers ──

export async function saveSnapshot(projectId: string, data: unknown, name?: string) {
  return prisma.snapshot.create({
    data: {
      projectId,
      data: data as any,
      name: name ?? "default",
    },
  })
}

export async function getSnapshot(projectId: string) {
  return prisma.snapshot.findFirst({
    where: { projectId },
    orderBy: { createdAt: "desc" },
  })
}
