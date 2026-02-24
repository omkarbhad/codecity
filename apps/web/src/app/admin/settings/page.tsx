"use client"

import { useEffect, useState } from "react"

interface PlatformSettings {
  registrationEnabled: boolean
  publicGalleryEnabled: boolean
  aiChatEnabled: boolean
  maxFilesPerAnalysis: number
  maxConcurrentAnalyses: number
  maintenanceMode: boolean
  maintenanceMessage: string
}

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<PlatformSettings | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then(setSettings)
      .catch(() => {})
  }, [])

  async function handleSave() {
    if (!settings) return
    setSaving(true)
    await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  if (!settings) {
    return (
      <div className="py-20 text-center">
        <div className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
      </div>
    )
  }

  return (
    <div className="animate-fade-up">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-primary/40">Configuration</p>
          <h1 className="mt-1 text-2xl font-bold text-foreground">Platform Settings</h1>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className={`rounded-lg border px-5 py-2 font-mono text-xs font-medium transition-all disabled:opacity-50 ${
            saved
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
              : "border-accent/30 bg-accent/10 text-accent hover:bg-accent/20 hover:border-accent/50 glow-amber"
          }`}
        >
          {saving ? "Saving..." : saved ? "\u2713 Saved" : "Save Changes"}
        </button>
      </div>

      <div className="mt-8 space-y-8">
        <section>
          <h2 className="font-mono text-[10px] tracking-[0.2em] uppercase text-muted-foreground/50 mb-3">Feature Flags</h2>
          <div className="space-y-2">
            {([
              ["registrationEnabled", "Allow new user registration"],
              ["publicGalleryEnabled", "Enable public gallery"],
              ["aiChatEnabled", "Enable AI chat feature"],
            ] as const).map(([key, label]) => (
              <label
                key={key}
                className="flex items-center justify-between rounded-lg border border-border/30 bg-card/20 px-4 py-3 cursor-pointer transition-all hover:border-border/50 hover:bg-card/40"
              >
                <span className="text-sm text-foreground">{label}</span>
                <div
                  className={`relative h-5 w-9 rounded-full transition-colors ${
                    settings[key] ? "bg-primary/30" : "bg-muted"
                  }`}
                  onClick={(e) => {
                    e.preventDefault()
                    setSettings({ ...settings, [key]: !settings[key] })
                  }}
                >
                  <div
                    className={`absolute top-0.5 h-4 w-4 rounded-full transition-all ${
                      settings[key]
                        ? "left-[18px] bg-primary glow-cyan"
                        : "left-0.5 bg-muted-foreground/50"
                    }`}
                  />
                </div>
              </label>
            ))}
          </div>
        </section>

        <section>
          <h2 className="font-mono text-[10px] tracking-[0.2em] uppercase text-muted-foreground/50 mb-3">Limits</h2>
          <div className="space-y-2">
            <div className="flex items-center justify-between rounded-lg border border-border/30 bg-card/20 px-4 py-3">
              <span className="text-sm text-foreground">Max files per analysis</span>
              <input
                type="number"
                value={settings.maxFilesPerAnalysis}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    maxFilesPerAnalysis: parseInt(e.target.value) || 0,
                  })
                }
                className="w-20 rounded-md border border-border/30 bg-background/50 px-3 py-1 text-right font-mono text-xs text-foreground focus:outline-none focus:border-primary/30"
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border/30 bg-card/20 px-4 py-3">
              <span className="text-sm text-foreground">Max concurrent analyses per user</span>
              <input
                type="number"
                value={settings.maxConcurrentAnalyses}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    maxConcurrentAnalyses: parseInt(e.target.value) || 0,
                  })
                }
                className="w-20 rounded-md border border-border/30 bg-background/50 px-3 py-1 text-right font-mono text-xs text-foreground focus:outline-none focus:border-primary/30"
              />
            </div>
          </div>
        </section>

        <section>
          <h2 className="font-mono text-[10px] tracking-[0.2em] uppercase text-muted-foreground/50 mb-3">Maintenance</h2>
          <div className="space-y-2">
            <label className="flex items-center justify-between rounded-lg border border-border/30 bg-card/20 px-4 py-3 cursor-pointer transition-all hover:border-border/50 hover:bg-card/40">
              <span className="text-sm text-foreground">Enable maintenance mode</span>
              <div
                className={`relative h-5 w-9 rounded-full transition-colors ${
                  settings.maintenanceMode ? "bg-destructive/30" : "bg-muted"
                }`}
                onClick={(e) => {
                  e.preventDefault()
                  setSettings({ ...settings, maintenanceMode: !settings.maintenanceMode })
                }}
              >
                <div
                  className={`absolute top-0.5 h-4 w-4 rounded-full transition-all ${
                    settings.maintenanceMode
                      ? "left-[18px] bg-destructive"
                      : "left-0.5 bg-muted-foreground/50"
                  }`}
                />
              </div>
            </label>
            {settings.maintenanceMode && (
              <div className="rounded-lg border border-destructive/20 bg-card/20 px-4 py-3">
                <label className="font-mono text-[10px] tracking-wider uppercase text-destructive/50">
                  Maintenance message
                </label>
                <input
                  type="text"
                  value={settings.maintenanceMessage}
                  onChange={(e) =>
                    setSettings({ ...settings, maintenanceMessage: e.target.value })
                  }
                  placeholder="We're performing maintenance. Back soon!"
                  className="mt-1.5 w-full rounded-md border border-border/30 bg-background/50 px-3 py-2 font-mono text-xs text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:border-destructive/30"
                />
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
