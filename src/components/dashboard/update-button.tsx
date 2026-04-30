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
  const [canUpdate, setCanUpdate] = React.useState(false)
  const [state, setState] = React.useState<UpdateState>("idle")
  const [update, setUpdate] = React.useState<AppUpdateInfo | null>(null)
  const [progress, setProgress] = React.useState(0)
  const [message, setMessage] = React.useState("Check for updates")

  React.useEffect(() => {
    setCanUpdate(isTauri())
  }, [])

  if (!canUpdate) return null

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
    <div className="relative flex shrink-0 justify-end">
      <button
        type="button"
        onClick={action}
        disabled={disabled}
        title={message}
        aria-label={message}
        className="flex size-7 items-center justify-center rounded-md border border-transparent bg-transparent text-zinc-700 transition-colors hover:border-white/[0.08] hover:bg-white/[0.03] hover:text-zinc-300 disabled:cursor-wait disabled:opacity-70"
      >
        <Icon className={`size-3.5 shrink-0 ${disabled ? "animate-spin text-primary" : "text-zinc-600"}`} />
      </button>
      {state === "downloading" && (
        <div className="absolute -bottom-1 left-0 right-0 h-0.5 overflow-hidden rounded-sm bg-white/[0.08]">
          <div
            className="h-full rounded-sm bg-primary transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  )
}
