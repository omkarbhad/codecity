export interface ProgressState {
  stage: string
  progress: number
  message: string
  error?: string
  completed: boolean
}

const progressMap = new Map<string, ProgressState>()

export function setProgress(projectId: string, state: ProgressState) {
  progressMap.set(projectId, state)
}

export function getProgress(projectId: string): ProgressState | null {
  return progressMap.get(projectId) ?? null
}

export function clearProgress(projectId: string) {
  progressMap.delete(projectId)
}
