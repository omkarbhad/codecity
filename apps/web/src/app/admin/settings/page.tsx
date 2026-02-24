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
    return <div className="py-12 text-center text-muted-foreground">Loading...</div>
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Platform Settings</h1>
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {saving ? "Saving..." : saved ? "Saved!" : "Save Changes"}
        </button>
      </div>

      <div className="mt-8 space-y-8">
        <section>
          <h2 className="text-lg font-semibold">Feature Flags</h2>
          <div className="mt-4 space-y-4">
            {([
              ["registrationEnabled", "Allow new user registration"],
              ["publicGalleryEnabled", "Enable public gallery"],
              ["aiChatEnabled", "Enable AI chat feature"],
            ] as const).map(([key, label]) => (
              <label key={key} className="flex items-center justify-between rounded-lg border border-border p-4">
                <span className="text-sm">{label}</span>
                <input
                  type="checkbox"
                  checked={settings[key] as boolean}
                  onChange={(e) =>
                    setSettings({ ...settings, [key]: e.target.checked })
                  }
                  className="h-4 w-4"
                />
              </label>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold">Limits</h2>
          <div className="mt-4 space-y-4">
            <div className="rounded-lg border border-border p-4">
              <label className="flex items-center justify-between">
                <span className="text-sm">Max files per analysis</span>
                <input
                  type="number"
                  value={settings.maxFilesPerAnalysis}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      maxFilesPerAnalysis: parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-24 rounded border border-input bg-background px-3 py-1 text-sm"
                />
              </label>
            </div>
            <div className="rounded-lg border border-border p-4">
              <label className="flex items-center justify-between">
                <span className="text-sm">Max concurrent analyses per user</span>
                <input
                  type="number"
                  value={settings.maxConcurrentAnalyses}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      maxConcurrentAnalyses: parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-24 rounded border border-input bg-background px-3 py-1 text-sm"
                />
              </label>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold">Maintenance Mode</h2>
          <div className="mt-4 space-y-4">
            <label className="flex items-center justify-between rounded-lg border border-border p-4">
              <span className="text-sm">Enable maintenance mode</span>
              <input
                type="checkbox"
                checked={settings.maintenanceMode}
                onChange={(e) =>
                  setSettings({ ...settings, maintenanceMode: e.target.checked })
                }
                className="h-4 w-4"
              />
            </label>
            {settings.maintenanceMode && (
              <div className="rounded-lg border border-border p-4">
                <label className="text-sm">Maintenance message</label>
                <input
                  type="text"
                  value={settings.maintenanceMessage}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      maintenanceMessage: e.target.value,
                    })
                  }
                  placeholder="We're performing maintenance. Back soon!"
                  className="mt-1 w-full rounded border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
