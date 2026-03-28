"use client"

import { useMemo, useState, useCallback } from "react"
import { X, ChevronDown, ChevronRight, ArrowRight, ArrowLeft, Package, Copy, Check, Pin, PinOff } from "lucide-react"
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
        className="flex items-center gap-2 w-full text-left px-3 py-2 hover:bg-white/[0.03] transition-colors"
      >
        {open ? <ChevronDown className="w-3 h-3 text-white/65" /> : <ChevronRight className="w-3 h-3 text-white/65" />}
        <span className="text-[10px] font-medium text-white/75 uppercase tracking-wider flex-1">{title}</span>
        {count !== undefined && (
          <span className="text-[10px] text-white/65 tabular-nums">{count}</span>
        )}
      </button>
      {open && <div className="px-3 pb-2.5 pt-0.5">{children}</div>}
    </div>
  )
}

export function SidePanel({ snapshot }: SidePanelProps) {
  const selectedFile = useCityStore((s) => s.selectedFile)
  const selectFile = useCityStore((s) => s.selectFile)
  const sidePanelPinned = useCityStore((s) => s.sidePanelPinned)
  const togglePinSidePanel = useCityStore((s) => s.togglePinSidePanel)
  const repoUrl = useCityStore((s) => s.repoUrl)
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

  return (
    <>
      {/* Mobile backdrop */}
      <div
        className="fixed inset-0 z-[49] bg-black/50 sm:hidden"
        onClick={() => selectFile(null, null)}
        aria-hidden="true"
      />

      {/* Panel — bottom sheet on mobile, right sidebar on sm+ */}
      <div className="fixed z-[50] bg-black/40 backdrop-blur-2xl border border-white/[0.07] shadow-2xl shadow-black/50 flex flex-col overflow-hidden left-0 right-0 bottom-0 w-full rounded-t-2xl max-h-[75vh] animate-slide-up sm:left-auto sm:top-10 sm:bottom-0 sm:right-0 sm:w-[300px] sm:m-1.5 sm:mb-2 sm:rounded-lg sm:max-h-none sm:animate-slide-in-right">
        {/* Mobile drag handle */}
        <div className="sm:hidden flex justify-center pt-2 pb-1 shrink-0">
          <div className="w-8 h-1 rounded-full bg-white/20" />
        </div>

        {/* Header */}
        <div className="px-3 py-2.5 border-b border-white/[0.04] shrink-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: districtColor, boxShadow: `0 0 8px ${districtColor}30` }} />
                <h3 className="text-[13px] font-semibold text-white/90 truncate">{fileName}</h3>
              </div>
              <div className="flex items-center gap-1 mt-1 ml-[18px]">
                <p className="text-[10px] text-white/65 truncate">{file.path}</p>
                <button onClick={handleCopyPath} className="shrink-0 p-0.5 rounded hover:bg-white/[0.06] text-white/40 hover:text-white/65 transition-colors">
                  {copied ? <Check className="w-2.5 h-2.5 text-emerald-400" /> : <Copy className="w-2.5 h-2.5" />}
                </button>
                {repoUrl && (
                  <a
                    href={`${repoUrl.replace(/\.git$/, "")}/blob/main/${file.path}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 p-0.5 rounded hover:bg-white/[0.06] text-white/40 hover:text-white/65 transition-colors"
                    title="Open on GitHub"
                  >
                    <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.477 2 2 6.477 2 12c0 4.418 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.009-.868-.013-1.703-2.782.604-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0 1 12 6.836a9.59 9.59 0 0 1 2.504.337c1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.202 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.163 22 16.418 22 12c0-5.523-4.477-10-10-10z"/></svg>
                  </a>
                )}
              </div>
            </div>
            <div className="flex items-center gap-px shrink-0">
              <button
                onClick={togglePinSidePanel}
                className={`p-1 rounded-md hover:bg-white/[0.06] transition-colors ${sidePanelPinned ? "text-primary" : "text-white/45 hover:text-white/65"}`}
              >
                {sidePanelPinned ? <PinOff className="w-3 h-3" /> : <Pin className="w-3 h-3" />}
              </button>
              <button onClick={() => selectFile(null, null)} className="p-1 rounded-md hover:bg-white/[0.06] text-white/45 hover:text-white/75 transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto overscroll-contain scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent py-1">
          <div className="px-3 py-2">
            <div className="flex items-center gap-1.5 flex-wrap mb-2.5">
              <span className="px-2 py-0.5 rounded text-[10px] border border-white/[0.06] text-white/75 flex items-center gap-1.5 font-medium">
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: districtColor }} />
                {file.district}
              </span>
              {ext && <span className="px-2 py-0.5 rounded text-[10px] border border-white/[0.06] text-white/75 font-medium">{ext}</span>}
              <span className={`px-2 py-0.5 rounded text-[10px] border border-white/[0.06] font-medium ${cplxColor}`}>{cplxLabel}</span>
              {file.isReactComponent && <span className="px-2 py-0.5 rounded text-[10px] border border-white/[0.06] text-blue-400/80 font-medium">React</span>}
              {file.hasUnusedExports && <span className="px-2 py-0.5 rounded text-[10px] border border-white/[0.06] text-red-400/80 font-medium">Unused</span>}
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
                {file.functions.map((fn) => (
                  <div key={fn.name} className="flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-white/[0.03] transition-colors">
                    <span className="text-[11px] text-white/85 truncate flex items-center gap-1.5">
                      {fn.exported && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />}
                      {fn.name}
                    </span>
                    <span className="text-[10px] text-white/45 shrink-0 ml-2 tabular-nums">{fn.lines}L</span>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {file.types.length > 0 && (
            <Section title="Types" count={file.types.length} defaultOpen={file.types.length <= 8}>
              <div className="space-y-px">
                {file.types.map((t) => (
                  <div key={t.name} className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-white/[0.03] transition-colors">
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400/80 border border-amber-500/[0.08] font-medium">{t.kind}</span>
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
                      {file.imports.map((imp) => (
                        <button
                          key={imp}
                          onClick={() => handleNavigate(imp)}
                          className="px-1.5 py-0.5 rounded text-[10px] border font-medium bg-red-500/[0.06] text-red-400/80 border-red-500/[0.08] hover:bg-red-500/[0.12] transition-all truncate max-w-[130px]"
                          title={imp}
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
                      {file.importedBy.map((dep) => (
                        <button
                          key={dep}
                          onClick={() => handleNavigate(dep)}
                          className="px-1.5 py-0.5 rounded text-[10px] border font-medium bg-blue-500/[0.06] text-blue-400/80 border-blue-500/[0.08] hover:bg-blue-500/[0.12] transition-all truncate max-w-[130px]"
                          title={dep}
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
                      {file.externalImports.map((ext) => (
                        <span key={ext} className="px-1.5 py-0.5 rounded text-[10px] border font-medium bg-purple-500/[0.06] text-purple-400/80 border-purple-500/[0.08]">
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
    </>
  )
}

function StatCell({ label, value, className = "" }: { label: string; value: number; className?: string }) {
  return (
    <div className="bg-white/[0.03] rounded-md p-2 text-center hover:bg-white/[0.05] transition-colors">
      <div className={`text-sm font-bold tabular-nums ${className || "text-white/80"}`}>{value.toLocaleString()}</div>
      <div className="text-[9px] text-white/65 font-medium mt-0.5">{label}</div>
    </div>
  )
}
