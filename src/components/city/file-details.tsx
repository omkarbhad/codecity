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
  if (complexity <= 10) return "text-(--lime)"
  if (complexity <= 20) return "text-(--sev-med)"
  return "text-(--sev-high)"
}

function complexityBorder(complexity: number): string {
  if (complexity <= 10) return "border-(--lime)"
  if (complexity <= 20) return "border-(--sev-med)"
  return "border-(--sev-high)"
}

function StatCell({
  label,
  value,
  colorClass,
  borderClass,
}: {
  label: string
  value: number | string
  colorClass?: string
  borderClass?: string
}) {
  return (
    <div
      className={`pixel-shadow-sm flex flex-col items-center justify-center border-2 bg-(--bg-raised) p-2 ${borderClass ?? "border-(--border-pixel)"}`}
    >
      <span
        className={`font-mono text-[14px] font-bold tabular-nums leading-none ${colorClass ?? "text-(--cream)"}`}
      >
        {value}
      </span>
      <span className="mt-1 font-mono text-[9px] uppercase tracking-[0.08em] text-(--muted)">
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
    <div className="border-t-2 border-dashed border-(--border-pixel)">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full cursor-pointer items-center gap-1.5 bg-(--bg-card) px-3 py-2 text-left font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-(--cream) transition-colors hover:bg-(--bg-raised)"
      >
        {open ? (
          <ChevronDown className="size-3 shrink-0 text-(--cream-dark)" />
        ) : (
          <ChevronRight className="size-3 shrink-0 text-(--cream-dark)" />
        )}
        <span>{title}</span>
        <span className="ml-auto border-2 border-(--border-pixel) bg-(--bg-deep) px-1 py-px font-mono text-[10px] tabular-nums text-(--cream-dark)">{count}</span>
      </button>
      {open && <div className="px-3 pb-3 pt-1">{children}</div>}
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
    <div className="pixel-shadow w-80 max-h-full overflow-y-auto border-l-2 border-(--border-light) bg-(--bg-deep) scroll-thin">
      {/* Header */}
      <div className="flex items-start justify-between gap-2 border-b-2 border-(--border-pixel) bg-(--bg-card) p-3">
        <div className="flex min-w-0 items-start gap-2">
          <FileCode className="mt-0.5 size-4 shrink-0 text-primary" />
          <span className="break-all font-mono text-[11px] leading-relaxed text-(--cream-dark)">
            {file.path}
          </span>
        </div>
        <button
          onClick={() => selectFile(null)}
          className="shrink-0 cursor-pointer rounded-none border-2 border-transparent p-0.5 text-(--muted) transition-colors hover:border-(--border-pixel) hover:bg-(--bg-raised) hover:text-(--cream)"
        >
          <X className="size-4" />
        </button>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-1.5 p-3">
        <StatCell label="Lines" value={file.lines} />
        <StatCell label="Functions" value={file.functions.length} colorClass="text-(--lime)" />
        <StatCell
          label="Complexity"
          value={file.complexity}
          colorClass={complexityColor(file.complexity)}
          borderClass={complexityBorder(file.complexity)}
        />
        <StatCell label="Types" value={file.types.length} />
        <StatCell label="Imports" value={file.imports.length} colorClass="text-(--sev-low)" />
        <StatCell label="Imported By" value={file.importedBy.length} colorClass="text-(--sev-low)" />
      </div>

      {/* Flags */}
      <div className="flex flex-wrap gap-1.5 px-3 pb-3">
        {file.isReactComponent && (
          <span className="inline-flex items-center border-2 border-(--sev-low) bg-[color-mix(in_srgb,var(--sev-low)_8%,transparent)] px-1.5 py-px font-mono text-[10px] uppercase tracking-[0.08em] text-(--sev-low)">
            REACT
          </span>
        )}
        {file.hasUnusedExports && (
          <span className="inline-flex items-center border-2 border-(--sev-high) bg-[color-mix(in_srgb,var(--sev-high)_8%,transparent)] px-1.5 py-px font-mono text-[10px] uppercase tracking-[0.08em] text-(--sev-high)">
            UNUSED
          </span>
        )}
        {file.classes.length > 0 && (
          <span className="inline-flex items-center border-2 border-(--sev-med) bg-[color-mix(in_srgb,var(--sev-med)_8%,transparent)] px-1.5 py-px font-mono text-[10px] uppercase tracking-[0.08em] text-(--sev-med)">
            <span className="mr-1 tabular-nums">{file.classes.length}</span> CLASS{file.classes.length === 1 ? "" : "ES"}
          </span>
        )}
      </div>

      {/* Functions */}
      <ExpandableSection
        title="Functions"
        count={file.functions.length}
        defaultOpen
      >
        <div className="space-y-px">
          {file.functions.map((fn) => (
            <div
              key={fn.name}
              className="flex items-center gap-1.5 border border-transparent px-1 py-1 font-mono text-[11px] text-(--cream-dark) hover:border-(--border-pixel) hover:bg-(--bg-raised) hover:text-(--cream)"
            >
              {fn.exported ? (
                <span className="size-1.5 shrink-0 bg-(--lime)" />
              ) : (
                <span className="size-1.5 shrink-0" />
              )}
              <span className="truncate">{fn.name}</span>
              <span className="ml-auto shrink-0 font-mono text-[10px] tabular-nums text-(--muted)">
                {fn.lines}L
              </span>
            </div>
          ))}
        </div>
      </ExpandableSection>

      {/* Types */}
      <ExpandableSection title="Types" count={file.types.length}>
        <div className="space-y-px">
          {file.types.map((t) => (
            <div
              key={t.name}
              className="flex items-center gap-2 px-1 py-1 font-mono text-[11px] text-(--cream-dark)"
            >
              <span className="w-10 shrink-0 border-2 border-(--sev-med) bg-[color-mix(in_srgb,var(--sev-med)_10%,transparent)] px-1 py-px text-center font-mono text-[9px] uppercase tracking-[0.05em] text-(--sev-med)">
                {t.kind}
              </span>
              <span className="truncate">{t.name}</span>
            </div>
          ))}
        </div>
      </ExpandableSection>

      {/* Imports */}
      <ExpandableSection title="Imports" count={file.imports.length}>
        <div className="space-y-px">
          {file.imports.map((imp) => {
            const isInternal = snapshot.files.some((f) => f.path === imp)
            return (
              <button
                key={imp}
                onClick={() => isInternal && selectFile(imp)}
                disabled={!isInternal}
                className={`flex w-full items-center gap-1.5 px-1 py-1 text-left font-mono text-[11px] transition-colors ${
                  isInternal
                    ? "cursor-pointer text-(--sev-high) hover:bg-[color-mix(in_srgb,var(--sev-high)_8%,transparent)]"
                    : "cursor-default text-(--dim)"
                }`}
              >
                <ArrowUpRight className="size-3 shrink-0" />
                <span className="truncate">{imp}</span>
              </button>
            )
          })}
        </div>
      </ExpandableSection>

      {/* Imported By */}
      <ExpandableSection title="Imported By" count={file.importedBy.length}>
        <div className="space-y-px">
          {file.importedBy.map((imp) => (
            <button
              key={imp}
              onClick={() => selectFile(imp)}
              className="flex w-full cursor-pointer items-center gap-1.5 px-1 py-1 text-left font-mono text-[11px] text-(--sev-low) transition-colors hover:bg-[color-mix(in_srgb,var(--sev-low)_8%,transparent)]"
            >
              <ArrowDownLeft className="size-3 shrink-0" />
              <span className="truncate">{imp}</span>
            </button>
          ))}
        </div>
      </ExpandableSection>
    </div>
  )
}
