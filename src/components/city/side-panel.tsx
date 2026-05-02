"use client"

import { useMemo, useState, useCallback } from "react"
import { X, ChevronDown, ChevronRight, ArrowRight, ArrowLeft, Package, Copy, Check, FileCode } from "lucide-react"
import { getIconForFile as _getIconForFile } from "vscode-icons-js"

function getFileIcon(name: string): string {
  const icon = _getIconForFile(name) ?? "default_file.svg"
  return icon.includes("_light_") ? icon.replace("_light_", "_") : icon
}

function getGitHubFileUrl(repoUrl: string, filePath: string): string | null {
  if (!/^https?:\/\/(www\.)?github\.com\//.test(repoUrl)) return null
  return `${repoUrl.replace(/\.git$/, "")}/blob/main/${filePath}`
}
import type { CitySnapshot } from "@/lib/types/city"
import { useCityStore } from "./use-city-store"

interface SidePanelProps {
  snapshot: CitySnapshot
}

function Section({
  title,
  count,
  defaultOpen = true,
  children,
}: {
  title: string
  count?: number
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 border-t border-white/[0.06] bg-[#0d0d0f] px-3 py-2.5 text-left transition-colors hover:bg-white/[0.035]"
      >
        {open ? <ChevronDown className="w-3 h-3 text-white/65" /> : <ChevronRight className="w-3 h-3 text-white/65" />}
        <span className="flex-1 text-[12px] font-semibold text-white/68">{title}</span>
        {count !== undefined && (
          <span className="rounded border border-white/[0.07] bg-white/[0.03] px-1.5 py-0.5 text-[10px] tabular-nums text-white/48">{count}</span>
        )}
      </button>
      {open && <div className="px-3 pb-2.5 pt-0.5">{children}</div>}
    </div>
  )
}

export function SidePanel({ snapshot }: SidePanelProps) {
  const selectedFile = useCityStore((s) => s.selectedFile)
  const selectFile = useCityStore((s) => s.selectFile)
  const repoUrl = useCityStore((s) => s.repoUrl)
  const openCodeViewer = useCityStore((s) => s.openCodeViewer)
  const [copied, setCopied] = useState(false)

  const file = useMemo(() => {
    if (!selectedFile) return null
    return snapshot.files.find((f) => f.path === selectedFile) ?? null
  }, [selectedFile, snapshot.files])

  const districtColor = useMemo(() => {
    if (!file) return "#888"
    return snapshot.districts.find((d) => d.name === file.district)?.color ?? "#888"
  }, [file, snapshot.districts])

  const handleCopyPath = useCallback(() => {
    if (!file) return
    navigator.clipboard.writeText(file.path).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }, [file])

  const handleNavigate = useCallback((path: string) => {
    const idx = snapshot.files.findIndex((f) => f.path === path)
    selectFile(path, idx >= 0 ? idx : undefined)
  }, [snapshot.files, selectFile])

  if (!file) return null

  const fileName = file.path.split("/").pop() ?? file.path
  const ext = fileName.includes(".") ? fileName.slice(fileName.lastIndexOf(".")) : ""
  const cplxColor = file.complexity <= 10 ? "text-emerald-400" : file.complexity <= 25 ? "text-yellow-400" : "text-red-400"
  const cplxLabel = file.complexity <= 10 ? "Low" : file.complexity <= 25 ? "Med" : "High"
  const githubUrl = repoUrl ? getGitHubFileUrl(repoUrl, file.path) : null

  return (
      <div className="flex h-full flex-col overflow-hidden bg-[#0b0b0c]">
        {/* Header */}
        <div className="shrink-0 border-b border-white/[0.08] bg-[#0d0d0f] px-3 py-3 shadow-[inset_0_-1px_0_rgba(255,255,255,0.02)]">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-md border border-white/[0.07] bg-white/[0.035]">
                  <img src={`/icons/vscode/${getFileIcon(fileName)}`} alt="" className="h-4 w-4" />
                </span>
                <button onClick={() => openCodeViewer(file.path)} className="truncate text-[13px] font-semibold text-white/90 transition-colors hover:text-primary">{fileName}</button>
              </div>
              <div className="ml-9 mt-1.5 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: districtColor }} />
                <p className="text-[10px] text-white/65 truncate">{file.district}</p>
                <button onClick={() => openCodeViewer(file.path)} aria-label="View source" className="shrink-0 rounded p-0.5 text-white/40 transition-colors hover:bg-white/[0.06] hover:text-white/65" title="View source">
                  <FileCode className="w-2.5 h-2.5" />
                </button>
                <button onClick={handleCopyPath} aria-label="Copy file path" className="shrink-0 rounded p-0.5 text-white/40 transition-colors hover:bg-white/[0.06] hover:text-white/65" title="Copy path">
                  {copied ? <Check className="w-2.5 h-2.5 text-emerald-400" /> : <Copy className="w-2.5 h-2.5" />}
                </button>
                {githubUrl && (
                  <a
                    href={githubUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 rounded p-0.5 text-white/40 transition-colors hover:bg-white/[0.06] hover:text-white/65"
                    title="Open on GitHub"
                  >
                    <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.477 2 2 6.477 2 12c0 4.418 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.009-.868-.013-1.703-2.782.604-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0 1 12 6.836a9.59 9.59 0 0 1 2.504.337c1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.202 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.163 22 16.418 22 12c0-5.523-4.477-10-10-10z"/></svg>
                  </a>
                )}
              </div>
            </div>
            <button onClick={() => selectFile(null, null)} aria-label="Close panel" className="shrink-0 rounded-md border border-transparent p-1 text-white/45 transition-colors hover:border-white/[0.06] hover:bg-white/[0.06] hover:text-white/75">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto overscroll-contain py-1 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
          <div className="px-3 py-3">
            <div className="mb-2.5 flex flex-wrap items-center gap-1.5">
              <span className="flex items-center gap-1.5 rounded-md border border-white/[0.08] bg-white/[0.025] px-2 py-1 text-[10px] font-medium text-white/70">
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: districtColor }} />
                {file.district}
              </span>
              {ext && <span className="rounded-md border border-white/[0.08] bg-white/[0.025] px-2 py-1 text-[10px] font-medium text-white/70">{ext}</span>}
              <span className={`rounded-md border border-white/[0.08] bg-white/[0.025] px-2 py-1 text-[10px] font-medium ${cplxColor}`}>{cplxLabel}</span>
              {file.isReactComponent && <span className="rounded-md border border-blue-400/[0.12] bg-blue-400/[0.05] px-2 py-1 text-[10px] font-medium text-blue-400/80">React</span>}
              {file.hasUnusedExports && <span className="rounded-md border border-red-400/[0.12] bg-red-400/[0.05] px-2 py-1 text-[10px] font-medium text-red-400/80">Unused</span>}
            </div>

            <div className="grid grid-cols-3 gap-1.5">
              <StatCell label="Lines" value={file.lines} />
              <StatCell label="Functions" value={file.functions.length} />
              <StatCell label="Complexity" value={file.complexity} className={cplxColor} />
              <StatCell label="Types" value={file.types.length} />
              <StatCell label="Imports" value={file.imports.length} />
              <StatCell label="Used By" value={file.importedBy.length} />
            </div>
          </div>

          {file.functions.length > 0 && (
            <Section title="Functions" count={file.functions.length}>
              <div className="space-y-px">
                {file.functions.map((fn, i) => (
                  <button
                    key={`${fn.name}-${i}`}
                    onClick={() => openCodeViewer(file.path, fn.name)}
                    className="group flex w-full cursor-pointer items-center justify-between rounded-md px-2 py-1.5 text-left transition-colors hover:bg-white/[0.04]"
                  >
                    <span className="flex items-center gap-1.5 truncate text-[11px] text-white/85 transition-colors group-hover:text-primary">
                      {fn.exported && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />}
                      {fn.name}
                    </span>
                    <span className="text-[10px] text-white/45 shrink-0 ml-2 tabular-nums">{fn.lines}L</span>
                  </button>
                ))}
              </div>
            </Section>
          )}

          {file.types.length > 0 && (
            <Section title="Types" count={file.types.length} defaultOpen={file.types.length <= 8}>
              <div className="space-y-px">
                {file.types.map((t, i) => (
                  <div key={`${t.name}-${i}`} className="flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors hover:bg-white/[0.04]">
                    <span className="rounded-sm border border-amber-500/[0.08] bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-medium text-amber-400/80">{t.kind}</span>
                    <span className="text-[11px] text-white/75 truncate">{t.name}</span>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {(file.imports.length > 0 || file.importedBy.length > 0 || (file.externalImports && file.externalImports.length > 0)) && (
            <Section title="Dependencies" count={file.imports.length + file.importedBy.length + (file.externalImports?.length ?? 0)}>
              <div className="space-y-3">
                {file.imports.length > 0 && (
                  <div>
                    <p className="text-[10px] text-white/55 font-medium mb-1 flex items-center gap-1">
                      <ArrowRight className="w-2.5 h-2.5" /> Imports
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {file.imports.map((imp, i) => (
                        <button
                          key={`${imp}-${i}`}
                          onClick={() => handleNavigate(imp)}
                          className="max-w-[130px] truncate rounded-sm border border-red-500/[0.08] bg-red-500/[0.06] px-1.5 py-0.5 text-[10px] font-medium text-red-400/80 transition-colors hover:bg-red-500/[0.12]"
                          title={imp}
                          aria-label={`Navigate to ${imp}`}
                        >
                          {imp.split("/").pop()}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {file.importedBy.length > 0 && (
                  <div>
                    <p className="text-[10px] text-white/55 font-medium mb-1 flex items-center gap-1">
                      <ArrowLeft className="w-2.5 h-2.5" /> Imported By
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {file.importedBy.map((dep, i) => (
                        <button
                          key={`${dep}-${i}`}
                          onClick={() => handleNavigate(dep)}
                          className="max-w-[130px] truncate rounded-sm border border-blue-500/[0.08] bg-blue-500/[0.06] px-1.5 py-0.5 text-[10px] font-medium text-blue-400/80 transition-colors hover:bg-blue-500/[0.12]"
                          title={dep}
                          aria-label={`Navigate to ${dep}`}
                        >
                          {dep.split("/").pop()}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {file.externalImports && file.externalImports.length > 0 && (
                  <div>
                    <p className="text-[10px] text-white/55 font-medium mb-1 flex items-center gap-1">
                      <Package className="w-2.5 h-2.5" /> External
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {file.externalImports.map((ext, i) => (
                        <span key={`${ext}-${i}`} className="rounded-sm border border-purple-500/[0.08] bg-purple-500/[0.06] px-1.5 py-0.5 text-[10px] font-medium text-purple-400/80">
                          {ext}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Section>
          )}
        </div>
      </div>
  )
}

function StatCell({ label, value, className = "" }: { label: string; value: number; className?: string }) {
  return (
    <div className="rounded-lg border border-white/[0.07] bg-white/[0.035] p-2.5 text-center transition-colors hover:bg-white/[0.055]">
      <div className={`text-sm font-bold tabular-nums ${className || "text-white/80"}`}>{value.toLocaleString()}</div>
      <div className="mt-0.5 text-[9px] font-medium uppercase text-white/48">{label}</div>
    </div>
  )
}
