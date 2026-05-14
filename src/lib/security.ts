/**
 * Security scan polling helper.
 *
 * Calls getSecurityScan every 2 seconds until the scan reaches a terminal
 * status (COMPLETED | FAILED | CANCELLED), then resolves with the result.
 * Cleans up its interval on completion or error.
 */
import { getSecurityScan, type SecurityScanResult } from "@/lib/tauri"

const POLL_INTERVAL_MS = 2000
const TERMINAL_STATUSES = new Set(["COMPLETED", "FAILED", "CANCELLED"])

export function pollSecurityScan(
  projectId: string,
  onUpdate: (result: SecurityScanResult) => void,
  onDone: (result: SecurityScanResult) => void,
  onError: (error: Error) => void
): () => void {
  let cancelled = false

  const tick = async () => {
    if (cancelled) return
    try {
      const result = await getSecurityScan(projectId)
      if (cancelled) return
      if (!result) return

      onUpdate(result)
      if (TERMINAL_STATUSES.has(result.scan.status)) {
        cancelled = true
        onDone(result)
      }
    } catch (err) {
      if (!cancelled) {
        cancelled = true
        onError(err instanceof Error ? err : new Error(String(err)))
      }
    }
  }

  // Kick off first tick immediately, then repeat.
  tick()
  const id = setInterval(tick, POLL_INTERVAL_MS)

  return () => {
    cancelled = true
    clearInterval(id)
  }
}
