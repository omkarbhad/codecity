"use client"

import { useEffect, useState } from "react"
import { FileIcon as LucideFile, FolderIcon, FolderOpenIcon } from "@/components/ui/icons"
import {
  getIconForFile as vsFile,
  getIconForFolder as vsFolder,
  getIconForOpenFolder as vsOpenFolder,
} from "vscode-icons-js"
import { AppIcon } from "@/components/ui/app-icon"
import { useSettings, type FileIconTheme } from "@/lib/settings"

// ── VS Code icons ───────────────────────────────────────────────────────────

// vscode-icons-js returns "light_" variants by default, which are invisible on
// dark backgrounds. Remap to the dark variants.
const dark = (icon: string) => icon.replace("_light_", "_")

function vscodeSrc(name: string, folder: boolean, expanded: boolean): string {
  const icon = folder ? (expanded ? vsOpenFolder(name) : vsFolder(name)) : (vsFile(name) ?? "default_file.svg")
  return `/icons/vscode/${dark(icon)}`
}

// ── Material Icon Theme ─────────────────────────────────────────────────────

interface MaterialManifest {
  file: string
  folder: string
  folderExpanded: string
  fileNames: Record<string, string>
  fileExtensions: Record<string, string>
  languageIds: Record<string, string>
  folderNames: Record<string, string>
  folderNamesExpanded: Record<string, string>
}

// Material maps most languages through VS Code language ids rather than
// extensions, so common extensions need their id here.
const LANGUAGE_IDS: Record<string, string> = {
  ts: "typescript", mts: "typescript", cts: "typescript", tsx: "typescriptreact",
  js: "javascript", mjs: "javascript", cjs: "javascript", jsx: "javascriptreact",
  py: "python", rs: "rust", go: "go", java: "java", kt: "kotlin", kts: "kotlin",
  c: "c", h: "c", cpp: "cpp", cc: "cpp", hpp: "cpp", cs: "csharp", rb: "ruby",
  php: "php", swift: "swift", dart: "dart", lua: "lua", r: "r", jl: "julia",
  pl: "perl", ex: "elixir", exs: "elixir", erl: "erlang", hs: "haskell",
  scala: "scala", zig: "zig", nix: "nix", sh: "shellscript", bash: "shellscript",
  zsh: "shellscript", fish: "shellscript", ps1: "powershell", json: "json",
  jsonc: "jsonc", yml: "yaml", yaml: "yaml", toml: "toml", xml: "xml",
  html: "html", htm: "html", css: "css", scss: "scss", sass: "sass", less: "less",
  md: "markdown", mdx: "mdx", sql: "sql", graphql: "graphql", gql: "graphql",
  vue: "vue", svelte: "svelte", astro: "astro", tf: "terraform", hcl: "hcl",
  proto: "proto", dockerfile: "dockerfile", makefile: "makefile", ini: "ini",
  diff: "diff", tex: "latex", vb: "vb", fs: "fsharp", clj: "clojure", ml: "ocaml",
}

let manifest: MaterialManifest | null = null
let manifestPromise: Promise<MaterialManifest | null> | null = null

function loadMaterial(): Promise<MaterialManifest | null> {
  manifestPromise ??= fetch("/icons/material/manifest.json")
    .then((r) => (r.ok ? (r.json() as Promise<MaterialManifest>) : null))
    .then((m) => (manifest = m))
    .catch(() => null)
  return manifestPromise
}

function materialSrc(m: MaterialManifest, rawName: string, folder: boolean, expanded: boolean): string {
  const name = rawName.toLowerCase()
  let icon: string | undefined
  if (folder) {
    icon = expanded ? m.folderNamesExpanded[name] : m.folderNames[name]
    icon ??= expanded ? m.folderExpanded : m.folder
  } else {
    icon = m.fileNames[name]
    // Longest compound extension first: "d.ts" before "ts".
    const parts = name.split(".")
    for (let i = 1; !icon && i < parts.length; i++) {
      icon = m.fileExtensions[parts.slice(i).join(".")]
    }
    if (!icon) {
      const ext = parts.length > 1 ? parts[parts.length - 1] : name
      const lang = LANGUAGE_IDS[ext]
      if (lang) icon = m.languageIds[lang]
    }
    icon ??= m.file
  }
  return `/icons/material/${icon}`
}

function useMaterialManifest(enabled: boolean) {
  const [m, setM] = useState(manifest)
  useEffect(() => {
    if (!enabled || m) return
    let live = true
    loadMaterial().then((loaded) => { if (live) setM(loaded) })
    return () => { live = false }
  }, [enabled, m])
  return m
}

// ── Component ───────────────────────────────────────────────────────────────

export function FileIcon({
  name,
  folder = false,
  expanded = false,
  color,
  theme: themeOverride,
  className = "",
}: {
  name: string
  folder?: boolean
  expanded?: boolean
  /** District colour, used by the minimal set. */
  color?: string
  /** Render a specific set (settings previews); defaults to the user's choice. */
  theme?: FileIconTheme
  className?: string
}) {
  const userTheme = useSettings((s) => s.fileIconTheme)
  const theme = themeOverride ?? userTheme
  const material = useMaterialManifest(theme === "material")
  const box = `size-4 shrink-0 ${className}`

  if (theme === "minimal") {
    return (
      <span className={`flex items-center justify-center ${box}`} style={{ color: folder ? "var(--cream-dark)" : color ?? "var(--muted)" }}>
        <AppIcon icon={folder ? (expanded ? FolderOpenIcon : FolderIcon) : LucideFile} size={14} />
      </span>
    )
  }

  // Material waits for its manifest; vscode icons stand in meanwhile.
  const src = theme === "material" && material
    ? materialSrc(material, name, folder, expanded)
    : vscodeSrc(name, folder, expanded)

  return <img src={src} alt="" draggable={false} className={box} />
}
