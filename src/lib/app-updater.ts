import { relaunch } from "@tauri-apps/plugin-process"
import { check, type DownloadEvent } from "@tauri-apps/plugin-updater"
import { isTauri } from "@/lib/tauri"

export interface AppUpdateInfo {
  currentVersion: string
  version: string
  date?: string
  body?: string
}

export interface InstallUpdateOptions {
  onProgress?: (progress: number) => void
}

export async function checkForAppUpdate(): Promise<AppUpdateInfo | null> {
  if (!isTauri()) return null

  const update = await check()
  if (!update) return null

  return {
    currentVersion: update.currentVersion,
    version: update.version,
    date: update.date,
    body: update.body,
  }
}

export async function installAppUpdate(options: InstallUpdateOptions = {}): Promise<void> {
  if (!isTauri()) return

  const update = await check()
  if (!update) return

  let downloaded = 0
  let contentLength = 0

  await update.downloadAndInstall((event: DownloadEvent) => {
    if (event.event === "Started") {
      downloaded = 0
      contentLength = event.data.contentLength ?? 0
      options.onProgress?.(contentLength > 0 ? 1 : 0)
      return
    }

    if (event.event === "Progress") {
      downloaded += event.data.chunkLength
      if (contentLength > 0) {
        options.onProgress?.(Math.min(99, Math.round((downloaded / contentLength) * 100)))
      }
      return
    }

    options.onProgress?.(100)
  })
}

export async function relaunchApp(): Promise<void> {
  if (!isTauri()) return
  await relaunch()
}
