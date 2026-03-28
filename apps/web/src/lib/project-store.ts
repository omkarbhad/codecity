import { sql } from "./db"

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

/** Map a DB row (snake_case) to ProjectRecord (camelCase) */
function toProject(row: Record<string, unknown>): ProjectRecord {
  return {
    id: row.id as string,
    name: row.name as string,
    repoUrl: row.repo_url as string,
    visibility: row.visibility as Visibility,
    status: row.status as AnalysisStatus,
    fileCount: (row.file_count as number) ?? 0,
    lineCount: (row.line_count as number) ?? 0,
    userId: row.user_id as string,
    error: (row.error as string) ?? null,
    createdAt: (row.created_at as Date)?.toISOString?.() ?? (row.created_at as string),
    updatedAt: (row.updated_at as Date)?.toISOString?.() ?? (row.updated_at as string),
  }
}

function toSnapshot(row: Record<string, unknown>): SnapshotRecord {
  return {
    id: row.id as string,
    projectId: row.project_id as string,
    name: row.name as string,
    data: row.data,
    createdAt: (row.created_at as Date)?.toISOString?.() ?? (row.created_at as string),
  }
}

/** Find a recent completed public project for this repo URL (any user). */
export async function findCompletedPublicProject(repoUrl: string): Promise<ProjectRecord | null> {
  const rows = await sql`
    SELECT * FROM projects
    WHERE repo_url = ${repoUrl}
      AND visibility = 'PUBLIC'
      AND status = 'COMPLETED'
    ORDER BY updated_at DESC
    LIMIT 1
  `
  return rows.length > 0 ? toProject(rows[0]) : null
}

// ── Project CRUD ──

export async function getProject(id: string): Promise<ProjectRecord | null> {
  const rows = await sql`SELECT * FROM projects WHERE id = ${id}`
  return rows.length > 0 ? toProject(rows[0]) : null
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
  const id = data.id ?? crypto.randomUUID()
  const rows = await sql`
    INSERT INTO projects (id, name, repo_url, visibility, status, file_count, line_count, user_id, error)
    VALUES (
      ${id},
      ${data.name},
      ${data.repoUrl},
      ${data.visibility ?? "PRIVATE"},
      ${data.status ?? "PENDING"},
      ${data.fileCount ?? 0},
      ${data.lineCount ?? 0},
      ${data.userId},
      ${data.error ?? null}
    )
    RETURNING *
  `
  return toProject(rows[0])
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
  // Build SET clause dynamically
  const sets: string[] = []
  const values: unknown[] = []
  let idx = 2 // $1 is the id

  if (data.name !== undefined) { sets.push(`name = $${idx}`); values.push(data.name); idx++ }
  if (data.visibility !== undefined) { sets.push(`visibility = $${idx}`); values.push(data.visibility); idx++ }
  if (data.status !== undefined) { sets.push(`status = $${idx}`); values.push(data.status); idx++ }
  if (data.fileCount !== undefined) { sets.push(`file_count = $${idx}`); values.push(data.fileCount); idx++ }
  if (data.lineCount !== undefined) { sets.push(`line_count = $${idx}`); values.push(data.lineCount); idx++ }
  if (data.error !== undefined) { sets.push(`error = $${idx}`); values.push(data.error); idx++ }

  if (sets.length === 0) {
    const existing = await getProject(id)
    if (!existing) throw new Error(`Project ${id} not found`)
    return existing
  }

  sets.push("updated_at = now()")

  // neon() tagged template doesn't support dynamic column sets,
  // so we use the raw query approach via the pool
  const { getPool } = await import("./db")
  const pool = getPool()
  const result = await pool.query(
    `UPDATE projects SET ${sets.join(", ")} WHERE id = $1 RETURNING *`,
    [id, ...values]
  )

  if (result.rows.length === 0) {
    throw new Error(`Project ${id} not found`)
  }

  return toProject(result.rows[0])
}

export async function deleteProject(id: string): Promise<void> {
  // Cascade deletes snapshots due to FK constraint
  await sql`DELETE FROM projects WHERE id = ${id}`
}

export async function getProjectsByUser(userId: string): Promise<ProjectRecord[]> {
  const rows = await sql`
    SELECT * FROM projects
    WHERE user_id = ${userId}
    ORDER BY updated_at DESC
  `
  return rows.map(toProject)
}

export async function getAllPublicProjects(): Promise<ProjectRecord[]> {
  const rows = await sql`
    SELECT * FROM projects
    WHERE visibility = 'PUBLIC' AND status = 'COMPLETED'
    ORDER BY updated_at DESC
    LIMIT 50
  `
  return rows.map(toProject)
}

// ── Snapshot helpers ──

export async function saveSnapshot(
  projectId: string,
  data: unknown,
  name?: string
): Promise<SnapshotRecord> {
  // Delete old snapshots for this project first (keep only latest)
  await sql`DELETE FROM snapshots WHERE project_id = ${projectId}`

  const rows = await sql`
    INSERT INTO snapshots (project_id, name, data)
    VALUES (${projectId}, ${name ?? "default"}, ${JSON.stringify(data)})
    RETURNING *
  `
  return toSnapshot(rows[0])
}

export async function getSnapshot(
  projectId: string
): Promise<SnapshotRecord | null> {
  const rows = await sql`
    SELECT * FROM snapshots
    WHERE project_id = ${projectId}
    ORDER BY created_at DESC
    LIMIT 1
  `
  return rows.length > 0 ? toSnapshot(rows[0]) : null
}
