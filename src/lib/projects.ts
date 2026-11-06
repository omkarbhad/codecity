import { getProjects } from "@/lib/tauri"

/** A project as the dashboard and sidebar use it (backend may send snake_case or camelCase). */
export interface Project {
  id: string
  name: string
  repoUrl: string
  status: string
  fileCount?: number
  lineCount?: number
  progress?: number
  progressStage?: string
  progressMessage?: string
  filesDiscovered?: number
  filesParsed?: number
  error?: string | null
  createdAt: string
}

export function normalizeProjectRecord(record: Record<string, unknown>): Project {
  return {
    id: String(record.id ?? ""),
    name: String(record.name ?? "Untitled"),
    repoUrl: String(record.repo_url ?? record.repoUrl ?? ""),
    status: String(record.status ?? "FAILED"),
    fileCount: Number(record.file_count ?? record.fileCount ?? 0),
    lineCount: Number(record.line_count ?? record.lineCount ?? 0),
    progress: Number(record.progress ?? 0),
    progressStage: String(record.progress_stage ?? record.progressStage ?? "queued"),
    progressMessage: String(record.progress_message ?? record.progressMessage ?? "Queued"),
    filesDiscovered: Number(record.files_discovered ?? record.filesDiscovered ?? 0),
    filesParsed: Number(record.files_parsed ?? record.filesParsed ?? 0),
    error: typeof record.error === "string" ? record.error : null,
    createdAt: (() => {
      const raw = record.created_at ?? record.createdAt
      if (typeof raw === "string" && raw.trim()) return raw
      if (typeof raw === "number" && Number.isFinite(raw)) return new Date(raw).toISOString()
      return new Date().toISOString()
    })(),
  }
}

/** Single fetcher for the shared ["projects"] query, so every consumer caches the same shape. */
export async function fetchProjects(): Promise<Project[]> {
  const records = await getProjects()
  return records.map((record) => normalizeProjectRecord(record as unknown as Record<string, unknown>))
}
