"use client"

import { useMemo, useState } from "react"
import {
  X,
  ChevronRight,
  ChevronDown,
  FileCode,
  ArrowUpRight,
  ArrowDownLeft,
} from "lucide-react"
import type { CitySnapshot } from "@/lib/types/city"
import { useCityStore } from "./use-city-store"

interface FileDetailsProps {
  snapshot: CitySnapshot
}

function complexityColor(complexity: number): string {
  if (complexity <= 10) return "text-emerald-400"
  if (complexity <= 20) return "text-yellow-400"
  return "text-red-400"
}

function complexityBg(complexity: number): string {
  if (complexity <= 10) return "bg-emerald-400/10"
  if (complexity <= 20) return "bg-yellow-400/10"
  return "bg-red-400/10"
}

function StatCell({
  label,
  value,
  colorClass,
  bgClass,
}: {
  label: string
  value: number | string
  colorClass?: string
  bgClass?: string
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-md p-2 ${bgClass ?? "bg-white/5"}`}
    >
      <span
        className={`font-mono text-sm font-bold ${colorClass ?? "text-white"}`}
      >
        {value}
      </span>
      <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
        {label}
      </span>
    </div>
  )
}

function ExpandableSection({
  title,
  count,
  children,
  defaultOpen = false,
}: {
  title: string
  count: number
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  if (count === 0) return null

  return (
    <div className="border-t border-border/20">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 w-full text-left py-2 px-3
          font-mono text-xs text-white/70 hover:text-white/90
          transition-colors duration-100 cursor-pointer"
      >
        {open ? (
          <ChevronDown className="w-3 h-3 shrink-0" />
        ) : (
          <ChevronRight className="w-3 h-3 shrink-0" />
        )}
        <span>{title}</span>
        <span className="text-white/30 ml-auto">{count}</span>
      </button>
      {open && <div className="px-3 pb-2">{children}</div>}
    </div>
  )
}

export function FileDetails({ snapshot }: FileDetailsProps) {
  const selectedFile = useCityStore((s) => s.selectedFile)
  const selectFile = useCityStore((s) => s.selectFile)

  const file = useMemo(() => {
    if (!selectedFile) return null
    return snapshot.files.find((f) => f.path === selectedFile) ?? null
  }, [selectedFile, snapshot.files])

  if (!file) return null

  return (
    <div className="bg-card/40 backdrop-blur-xl border-l border-border/30 w-80 overflow-y-auto max-h-full">
      {/* Header */}
      <div className="flex items-start justify-between gap-2 p-3 border-b border-border/30">
        <div className="flex items-start gap-2 min-w-0">
          <FileCode className="w-4 h-4 shrink-0 text-white/50 mt-0.5" />
          <span className="font-mono text-xs text-muted-foreground break-all leading-relaxed">
            {file.path}
          </span>
        </div>
        <button
          onClick={() => selectFile(null)}
          className="p-1 rounded-md hover:bg-white/10 text-white/50 hover:text-white
            transition-colors duration-100 shrink-0 cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-1.5 p-3">
        <StatCell label="Lines" value={file.lines} />
        <StatCell label="Functions" value={file.functions.length} />
        <StatCell
          label="Complexity"
          value={file.complexity}
          colorClass={complexityColor(file.complexity)}
          bgClass={complexityBg(file.complexity)}
        />
        <StatCell label="Types" value={file.types.length} />
        <StatCell label="Imports" value={file.imports.length} />
        <StatCell label="Imported By" value={file.importedBy.length} />
      </div>

      {/* Flags */}
      <div className="flex flex-wrap gap-1.5 px-3 pb-3">
        {file.isReactComponent && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-blue-500/15 text-blue-400 border border-blue-500/20">
            React Component
          </span>
        )}
        {file.hasUnusedExports && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-orange-500/15 text-orange-400 border border-orange-500/20">
            Unused Exports
          </span>
        )}
        {file.classes.length > 0 && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-purple-500/15 text-purple-400 border border-purple-500/20">
            {file.classes.length} {file.classes.length === 1 ? "Class" : "Classes"}
          </span>
        )}
      </div>

      {/* Functions */}
      <ExpandableSection
        title="Functions"
        count={file.functions.length}
        defaultOpen
      >
        <div className="space-y-0.5">
          {file.functions.map((fn) => (
            <div
              key={fn.name}
              className="flex items-center gap-1.5 font-mono text-xs text-white/60"
            >
              {fn.exported && (
                <ArrowUpRight className="w-3 h-3 shrink-0 text-emerald-400" />
              )}
              {!fn.exported && (
                <span className="w-3 h-3 shrink-0 inline-block" />
              )}
              <span className="truncate">{fn.name}</span>
              <span className="text-white/25 ml-auto shrink-0">
                {fn.lines}L
              </span>
            </div>
          ))}
        </div>
      </ExpandableSection>

      {/* Types */}
      <ExpandableSection title="Types" count={file.types.length}>
        <div className="space-y-0.5">
          {file.types.map((t) => (
            <div
              key={t.name}
              className="flex items-center gap-1.5 font-mono text-xs text-white/60"
            >
              <span className="text-[10px] text-yellow-400/70 uppercase shrink-0 w-10">
                {t.kind}
              </span>
              <span className="truncate">{t.name}</span>
            </div>
          ))}
        </div>
      </ExpandableSection>

      {/* Imports */}
      <ExpandableSection title="Imports" count={file.imports.length}>
        <div className="space-y-0.5">
          {file.imports.map((imp) => {
            const isInternal = snapshot.files.some((f) => f.path === imp)
            return (
              <button
                key={imp}
                onClick={() => isInternal && selectFile(imp)}
                disabled={!isInternal}
                className={`
                  flex items-center gap-1.5 font-mono text-xs w-full text-left
                  ${
                    isInternal
                      ? "text-cyan-400/70 hover:text-cyan-400 cursor-pointer"
                      : "text-white/40 cursor-default"
                  }
                `}
              >
                <ArrowUpRight className="w-3 h-3 shrink-0" />
                <span className="truncate">{imp}</span>
              </button>
            )
          })}
        </div>
      </ExpandableSection>

      {/* Imported By */}
      <ExpandableSection title="Imported By" count={file.importedBy.length}>
        <div className="space-y-0.5">
          {file.importedBy.map((imp) => (
            <button
              key={imp}
              onClick={() => selectFile(imp)}
              className="flex items-center gap-1.5 font-mono text-xs text-cyan-400/70
                hover:text-cyan-400 cursor-pointer w-full text-left"
            >
              <ArrowDownLeft className="w-3 h-3 shrink-0" />
              <span className="truncate">{imp}</span>
            </button>
          ))}
        </div>
      </ExpandableSection>
    </div>
  )
}
