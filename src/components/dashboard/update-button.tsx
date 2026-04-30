"use client"

import * as React from "react"
import { Check, Download, Loader2, RefreshCw, RotateCcw } from "lucide-react"
import { checkForAppUpdate, installAppUpdate, relaunchApp, type AppUpdateInfo } from "@/lib/app-updater"
import { isTauri } from "@/lib/tauri"

type UpdateState = "idle" | "checking" | "available" | "downloading" | "installed" | "current" | "error"

function shortError(message: string): string {
  if (message.includes("endpoints")) return "Updater endpoint missing"
  if (message.includes("public key") || message.includes("pubkey")) return "Updater key missing"
  return message
}

export function UpdateButton() {
  const [state, setState] = React.useState<UpdateState>("idle")
  const [update, setUpdate] = React.useState<AppUpdateInfo | null>(null)
  const [progress, setProgress] = React.useState(0)
  const [message, setMessage] = React.useState("Check for updates")

  if (!isTauri()) return null

  async function handleCheck() {
    setState("checking")
    setMessage("Checking for updates")
    setProgress(0)

    try {
      const nextUpdate = await checkForAppUpdate()
      setUpdate(nextUpdate)
      if (!nextUpdate) {
        setState("current")
        setMessage("App is up to date")
        return
      }

      setState("available")
      setMessage(`Update ${nextUpdate.version} available`)
    } catch (err) {
      setState("error")
      setMessage(shortError(err instanceof Error ? err.message : "Update check failed"))
    }
  }

  async function handleInstall() {
    setState("downloading")
    setMessage(update ? `Downloading ${update.version}` : "Downloading update")

    try {
      await installAppUpdate({
        onProgress: (value) => setProgress(value),
      })
      setState("installed")
      setProgress(100)
      setMessage("Restart to finish update")
    } catch (err) {
      setState("error")
      setMessage(shortError(err instanceof Error ? err.message : "Update failed"))
    }
  }

  const disabled = state === "checking" || state === "downloading"
  const action = state === "available" ? handleInstall : state === "installed" ? relaunchApp : handleCheck
  const Icon = state === "checking" || state === "downloading"
    ? Loader2
    : state === "available"
      ? Download
      : state === "installed"
        ? RotateCcw
        : state === "current"
          ? Check
          : RefreshCw

  return (
    <div className="mb-2 rounded-md border border-white/[0.07] bg-white/[0.02] p-2">
      <button
        type="button"
        onClick={action}
        disabled={disabled}
        className="flex h-8 w-full items-center gap-2 rounded-md px-2 text-left text-[11px] font-medium text-zinc-500 transition-colors hover:bg-white/[0.04] hover:text-zinc-200 disabled:cursor-wait disabled:opacity-70"
      >
        <Icon className={`size-3.5 shrink-0 ${disabled ? "animate-spin text-primary" : "text-zinc-600"}`} />
        <span className="min-w-0 flex-1 truncate">{message}</span>
      </button>
      {state === "downloading" && (
        <div className="mt-2 h-1 overflow-hidden rounded-sm bg-white/[0.08]">
          <div
            className="h-full rounded-sm bg-primary transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  )
}
