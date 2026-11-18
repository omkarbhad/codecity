"use client"

import { useEffect, useState } from "react"
import { create } from "zustand"
import { persist } from "zustand/middleware"

/** Icon set used by the file tree. */
export type FileIconTheme = "vscode" | "material" | "minimal"

export const FILE_ICON_THEMES: { key: FileIconTheme; label: string; description: string }[] = [
  { key: "material", label: "Material", description: "Material Icon Theme, full colour" },
  { key: "vscode", label: "VS Code", description: "vscode-icons, full colour" },
  { key: "minimal", label: "Minimal", description: "Outline glyphs tinted by district" },
]

/** Colour scheme; "system" follows the OS. */
export type Appearance = "system" | "dark" | "light"

export const APPEARANCES: { key: Appearance; label: string }[] = [
  { key: "system", label: "System" },
  { key: "dark", label: "Dark" },
  { key: "light", label: "Light" },
]

interface SettingsState {
  appearance: Appearance
  setAppearance: (appearance: Appearance) => void
  fileIconTheme: FileIconTheme
  indentGuides: boolean
  setFileIconTheme: (theme: FileIconTheme) => void
  setIndentGuides: (on: boolean) => void
}

/** UI preferences, kept on this device (localStorage). */
export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      appearance: "system",
      setAppearance: (appearance) => set({ appearance }),
      fileIconTheme: "material",
      indentGuides: true,
      setFileIconTheme: (fileIconTheme) => set({ fileIconTheme }),
      setIndentGuides: (indentGuides) => set({ indentGuides }),
    }),
    { name: "codecity-settings", version: 1 }
  )
)

/** The scheme actually in use: "dark" or "light". Follows the OS for "system". */
export function useResolvedTheme(): "dark" | "light" {
  const appearance = useSettings((s) => s.appearance)
  const [systemLight, setSystemLight] = useState(false)
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: light)")
    setSystemLight(media.matches)
    const onChange = () => setSystemLight(media.matches)
    media.addEventListener("change", onChange)
    return () => media.removeEventListener("change", onChange)
  }, [])
  if (appearance === "system") return systemLight ? "light" : "dark"
  return appearance
}

/** Puts the resolved scheme on <html> (data-theme + the .dark class). Mount once. */
export function ThemeApplier() {
  const theme = useResolvedTheme()
  useEffect(() => {
    const root = document.documentElement
    root.dataset.theme = theme
    root.classList.toggle("dark", theme === "dark")
    root.style.colorScheme = theme
  }, [theme])
  return null
}
