// In-memory project store — no database needed
// Projects live in memory for the session. For a portfolio project, this is fine.
// Add Neon/Turso later if persistence is needed.

import { randomUUID } from "crypto"

export type Visibility = "PUBLIC" | "PRIVATE"
export type AnalysisStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED"

export interface ProjectRecord {
  id: string
  name: string
  repoUrl: string
  visibility: Visibility
  status: AnalysisStatus
  fileCount: number
  lineCount: number
  userId: string
  error?: string | null
  createdAt: string
  updatedAt: string
}

interface SnapshotRecord {
  id: string
  projectId: string
  name: string
  data: unknown
  createdAt: string
}

// In-memory stores
const projects = new Map<string, ProjectRecord>()
const snapshots = new Map<string, SnapshotRecord>()

export async function getProject(id: string): Promise<ProjectRecord | null> {
  return projects.get(id) ?? null
}

export async function createProject(data: {
  id?: string
  name: string
  repoUrl: string
  visibility?: Visibility
  status?: AnalysisStatus
  fileCount?: number
  lineCount?: number
  userId: string
  error?: string
}): Promise<ProjectRecord> {
  const now = new Date().toISOString()
  const project: ProjectRecord = {
    id: data.id ?? randomUUID(),
    name: data.name,
    repoUrl: data.repoUrl,
    visibility: data.visibility ?? "PRIVATE",
    status: data.status ?? "PENDING",
    fileCount: data.fileCount ?? 0,
    lineCount: data.lineCount ?? 0,
    userId: data.userId,
    error: data.error ?? null,
    createdAt: now,
    updatedAt: now,
  }
  projects.set(project.id, project)
  return project
}

export async function updateProject(
  id: string,
  data: Partial<{
    name: string
    visibility: Visibility
    status: AnalysisStatus
    fileCount: number
    lineCount: number
    error: string | null
  }>
): Promise<ProjectRecord> {
  const existing = projects.get(id)
  if (!existing) {
    throw new Error(`Project ${id} not found`)
  }

  const updated: ProjectRecord = {
    ...existing,
    ...data,
    updatedAt: new Date().toISOString(),
  }
  projects.set(id, updated)
  return updated
}

export async function deleteProject(id: string): Promise<void> {
  projects.delete(id)
  // Also delete associated snapshots
  for (const [key, snap] of snapshots) {
    if (snap.projectId === id) {
      snapshots.delete(key)
    }
  }
}

export async function getProjectsByUser(userId: string): Promise<ProjectRecord[]> {
  return Array.from(projects.values())
    .filter((p) => p.userId === userId)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

export async function getAllPublicProjects(): Promise<ProjectRecord[]> {
  return Array.from(projects.values())
    .filter((p) => p.visibility === "PUBLIC" && p.status === "COMPLETED")
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 50)
}

// ── Snapshot helpers ──

export async function saveSnapshot(
  projectId: string,
  data: unknown,
  name?: string
): Promise<SnapshotRecord> {
  const snapshot: SnapshotRecord = {
    id: randomUUID(),
    projectId,
    name: name ?? "default",
    data,
    createdAt: new Date().toISOString(),
  }
  snapshots.set(snapshot.id, snapshot)
  return snapshot
}

export async function getSnapshot(
  projectId: string
): Promise<SnapshotRecord | null> {
  // Find the latest snapshot for this project
  let latest: SnapshotRecord | null = null
  for (const snap of snapshots.values()) {
    if (snap.projectId === projectId) {
      if (!latest || snap.createdAt > latest.createdAt) {
        latest = snap
      }
    }
  }
  return latest
}
