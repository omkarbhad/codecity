import { Redis } from "@upstash/redis"

export const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
})

// Progress tracking keys expire after 10 minutes
const PROGRESS_TTL = 600

export interface AnalysisProgress {
  stage: string
  progress: number
  message: string
  error?: string
  completed: boolean
}

export async function setAnalysisProgress(
  projectId: string,
  state: AnalysisProgress
) {
  await redis.set(`progress:${projectId}`, JSON.stringify(state), {
    ex: PROGRESS_TTL,
  })
}

export async function getAnalysisProgress(
  projectId: string
): Promise<AnalysisProgress | null> {
  const data = await redis.get<string>(`progress:${projectId}`)
  if (!data) return null
  return typeof data === "string" ? JSON.parse(data) : data
}

// Snapshot storage (expires after 1 hour)
const SNAPSHOT_TTL = 3600

export async function setAnalysisSnapshot(
  projectId: string,
  snapshot: unknown
) {
  await redis.set(`snapshot:${projectId}`, JSON.stringify(snapshot), {
    ex: SNAPSHOT_TTL,
  })
}

export async function getAnalysisSnapshot(
  projectId: string
): Promise<unknown | null> {
  const data = await redis.get<string>(`snapshot:${projectId}`)
  if (!data) return null
  return typeof data === "string" ? JSON.parse(data) : data
}
