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
    <div className="border border-white/[0.06] rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 w-full text-left px-3 py-2 hover:bg-white/[0.03] transition-colors"
      >
        {open ? <ChevronDown className="w-3 h-3 text-white/40" /> : <ChevronRight className="w-3 h-3 text-white/40" />}
        <span className="text-[10px] font-mono text-white/50 uppercase tracking-wider flex-1">{title}</span>
        {count !== undefined && (
          <span className="text-[10px] font-mono text-white/30 bg-white/[0.04] px-1.5 py-0.5 rounded">{count}</span>
        )}
      </button>
      {open && <div className="px-3 pb-3">{children}</div>}
    </div>
  )
}

export function SidePanel({ snapshot }: SidePanelProps) {
  const selectedFile = useCityStore((s) => s.selectedFile)
  const selectFile = useCityStore((s) => s.selectFile)
  const sidePanelPinned = useCityStore((s) => s.sidePanelPinned)
  const togglePinSidePanel = useCityStore((s) => s.togglePinSidePanel)
  const [copied, setCopied] = useState(false)

  const file = useMemo(() => {
    if (!selectedFile) return null
    return snapshot.files.find((f) => f.path === selectedFile) ?? null
  }, [selectedFile, snapshot.files])

  const fileIndex = useMemo(() => {
    if (!selectedFile) return null
    return snapshot.files.findIndex((f) => f.path === selectedFile)
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
    if (idx >= 0) {
      selectFile(path, idx)
    } else {
      selectFile(path)
    }
  }, [snapshot.files, selectFile])

  if (!file) return null

  const fileName = file.path.split("/").pop() ?? file.path
  const ext = fileName.includes(".") ? fileName.slice(fileName.lastIndexOf(".")) : ""
  const complexityColor = file.complexity <= 10 ? "text-emerald-400" : file.complexity <= 25 ? "text-yellow-400" : "text-red-400"
  const complexityLabel = file.complexity <= 10 ? "Low" : file.complexity <= 25 ? "Medium" : "High"

  return (
    <div className="fixed right-0 top-12 bottom-12 w-[320px] z-40 m-2 animate-slide-in-right">
      <div className="glass-panel h-full flex flex-col rounded-xl">
        {/* Header */}
        <div className="relative px-4 pt-3 pb-2.5 border-b border-white/[0.06] shrink-0">
          <div className="absolute top-0 left-0 right-0 h-[2px] rounded-t-xl" style={{ background: `linear-gradient(90deg, ${districtColor}, transparent 80%)` }} />
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: districtColor, boxShadow: `0 0 6px ${districtColor}30` }} />
              <div className="min-w-0">
                <h3 className="font-mono text-xs text-white font-semibold truncate">{fileName}</h3>
                <div className="flex items-center gap-1 mt-0.5">
                  <p className="font-mono text-[9px] text-white/35 truncate">{file.path}</p>
                  <button
                    onClick={handleCopyPath}
                    className="shrink-0 p-0.5 rounded hover:bg-white/10 text-white/20 hover:text-white/50 transition-colors"
                    title="Copy path"
                  >
                    {copied ? <Check className="w-2.5 h-2.5 text-emerald-400" /> : <Copy className="w-2.5 h-2.5" />}
                  </button>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-0.5">
              <button
                onClick={togglePinSidePanel}
                className={`p-1 rounded-md hover:bg-white/10 transition-colors ${
                  sidePanelPinned ? "text-primary" : "text-white/25 hover:text-white/50"
                }`}
                title={sidePanelPinned ? "Unpin" : "Pin"}
              >
                {sidePanelPinned ? <PinOff className="w-3 h-3" /> : <Pin className="w-3 h-3" />}
              </button>
              <button
                onClick={() => selectFile(null)}
                className="p-1 rounded-md hover:bg-white/10 text-white/30 hover:text-white transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2.5 scroll-thin">
          {/* Tags row */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="px-1.5 py-0.5 rounded text-[9px] font-mono border border-white/[0.06] text-white/35 flex items-center gap-1">
              <span className="w-1 h-1 rounded-full shrink-0" style={{ backgroundColor: districtColor }} />
              {file.district}
            </span>
            {ext && (
              <span className="px-1.5 py-0.5 rounded text-[9px] font-mono border border-white/[0.06] text-white/35">
                {ext}
              </span>
            )}
            <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono border border-white/[0.06] ${complexityColor}`}>
              {complexityLabel}
            </span>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-3 gap-1">
            <StatBox label="Lines" value={file.lines} />
            <StatBox label="Fns" value={file.functions.length} />
            <StatBox label="Complexity" value={file.complexity} className={complexityColor} />
            <StatBox label="Types" value={file.types.length} />
            <StatBox label="Imports" value={file.imports.length} />
            <StatBox label="Used By" value={file.importedBy.length} />
          </div>

          {/* Flags */}
          {(file.isReactComponent || file.hasUnusedExports || file.classes.length > 0 || (file.externalImports && file.externalImports.length > 0)) && (
            <div className="flex flex-wrap gap-1">
              {file.isReactComponent && <Flag color="blue" label="React" />}
              {file.hasUnusedExports && <Flag color="red" label="Unused" />}
              {file.classes.length > 0 && <Flag color="purple" label={`${file.classes.length} Class`} />}
              {file.fileType && file.fileType !== "typescript" && <Flag color="cyan" label={file.fileType} />}
              {file.decorators && file.decorators.length > 0 && <Flag color="yellow" label={`${file.decorators.length} Decor`} />}
              {file.externalImports && file.externalImports.length > 0 && <Flag color="green" label={`${file.externalImports.length} Ext`} />}
            </div>
          )}

          {/* Functions */}
          {file.functions.length > 0 && (
            <Section title="Functions" count={file.functions.length}>
              <div className="space-y-0.5 max-h-40 overflow-y-auto scroll-thin">
                {file.functions.map((fn, i) => (
                  <div key={i} className="flex items-center justify-between px-2 py-1 rounded bg-white/[0.02] border border-white/[0.03] hover:bg-white/[0.04] transition-colors">
                    <span className="font-mono text-[10px] text-white/70 truncate flex items-center gap-1">
                      {fn.exported && <span className="w-1 h-1 rounded-full bg-emerald-400 shrink-0" />}
                      {fn.name}
                    </span>
                    <span className="font-mono text-[9px] text-white/25 shrink-0 ml-2">{fn.lines}L</span>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Types */}
          {file.types.length > 0 && (
            <Section title="Types" count={file.types.length} defaultOpen={file.types.length <= 8}>
              <div className="space-y-0.5">
                {file.types.map((t, i) => (
                  <div key={i} className="flex items-center gap-2 px-2 py-1 rounded bg-white/[0.02] border border-white/[0.03]">
                    <span className="text-[8px] font-mono px-1 py-0.5 rounded bg-amber-500/10 text-amber-400/80 border border-amber-500/10">{t.kind}</span>
                    <span className="font-mono text-[10px] text-white/70 truncate">{t.name}</span>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Dependencies */}
          {(file.imports.length > 0 || file.importedBy.length > 0 || (file.externalImports && file.externalImports.length > 0)) && (
            <Section title="Dependencies" count={file.imports.length + file.importedBy.length + (file.externalImports?.length ?? 0)}>
              <div className="space-y-2">
                {file.imports.length > 0 && (
                  <div>
                    <p className="text-[8px] font-mono text-white/25 uppercase tracking-wider mb-1 flex items-center gap-1">
                      <ArrowRight className="w-2 h-2" /> Imports
                    </p>
                    <div className="flex flex-wrap gap-0.5">
                      {file.imports.map((imp, i) => (
                        <button
                          key={`imp-${i}`}
                          onClick={() => handleNavigate(imp)}
                          className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-red-500/8 text-red-400/80 border border-red-500/10 hover:bg-red-500/15 hover:border-red-500/20 transition-all truncate max-w-[140px]"
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
                    <p className="text-[8px] font-mono text-white/25 uppercase tracking-wider mb-1 flex items-center gap-1">
                      <ArrowLeft className="w-2 h-2" /> Imported By
                    </p>
                    <div className="flex flex-wrap gap-0.5">
                      {file.importedBy.map((dep, i) => (
                        <button
                          key={`dep-${i}`}
                          onClick={() => handleNavigate(dep)}
                          className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-blue-500/8 text-blue-400/80 border border-blue-500/10 hover:bg-blue-500/15 hover:border-blue-500/20 transition-all truncate max-w-[140px]"
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
                    <p className="text-[8px] font-mono text-white/25 uppercase tracking-wider mb-1 flex items-center gap-1">
                      <Package className="w-2 h-2" /> External
                    </p>
                    <div className="flex flex-wrap gap-0.5">
                      {file.externalImports.map((ext, i) => (
                        <span key={`ext-${i}`} className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-purple-500/8 text-purple-400/80 border border-purple-500/10">
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
    </div>
  )
}

function StatBox({ label, value, className = "" }: { label: string; value: number; className?: string }) {
  return (
    <div className="bg-white/[0.02] border border-white/[0.05] rounded-md p-1.5 text-center hover:bg-white/[0.04] transition-colors">
      <div className={`font-mono text-xs font-semibold tabular-nums ${className || "text-white/90"}`}>{value.toLocaleString()}</div>
      <div className="font-mono text-[7px] text-white/30 uppercase tracking-wider mt-0.5">{label}</div>
    </div>
  )
}

function Flag({ color, label }: { color: string; label: string }) {
  const colorMap: Record<string, string> = {
    blue: "bg-blue-500/8 text-blue-400/80 border-blue-500/10",
    red: "bg-red-500/8 text-red-400/80 border-red-500/10",
    purple: "bg-purple-500/8 text-purple-400/80 border-purple-500/10",
    cyan: "bg-cyan-500/8 text-cyan-400/80 border-cyan-500/10",
    green: "bg-emerald-500/8 text-emerald-400/80 border-emerald-500/10",
    yellow: "bg-amber-500/8 text-amber-400/80 border-amber-500/10",
  }

  return (
    <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono border ${colorMap[color] ?? colorMap.blue}`}>
      {label}
    </span>
  )
}
