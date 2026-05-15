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
        className="flex w-full items-center gap-2 border-t-2 border-dashed border-(--border-pixel) bg-(--bg-card) px-3 py-2.5 text-left transition-colors hover:bg-(--bg-raised)"
      >
        {open ? <ChevronDown className="size-3 text-(--cream-dark)" /> : <ChevronRight className="size-3 text-(--cream-dark)" />}
        <span className="flex-1 font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-(--cream)">{title}</span>
        {count !== undefined && (
          <span className="border-2 border-(--border-pixel) bg-(--bg-raised) px-1.5 py-px font-mono text-[10px] tabular-nums text-(--cream-dark)">{count}</span>
        )}
      </button>
      {open && <div className="px-3 pb-3 pt-2">{children}</div>}
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
  const cplxTone = file.complexity <= 10 ? "lime" : file.complexity <= 25 ? "med" : "high"
  const cplxColorClass = cplxTone === "lime" ? "text-(--lime)" : cplxTone === "med" ? "text-(--sev-med)" : "text-(--sev-high)"
  const cplxBadgeClass = cplxTone === "lime"
    ? "border-(--lime) text-(--lime)"
    : cplxTone === "med"
      ? "border-(--sev-med) text-(--sev-med)"
      : "border-(--sev-high) text-(--sev-high)"
  const cplxLabel = cplxTone === "lime" ? "LOW" : cplxTone === "med" ? "MED" : "HIGH"
  const githubUrl = repoUrl ? getGitHubFileUrl(repoUrl, file.path) : null

  return (
    <div className="pixel-shadow flex h-full flex-col overflow-hidden border-2 border-(--border-light) bg-(--bg-deep)">
      {/* Terminal header */}
      <div className="shrink-0 border-b-2 border-(--border-pixel) bg-(--bg-card) px-3 py-2.5">
        <div className="flex items-center gap-3">
          <div className="flex shrink-0 items-center gap-1.5">
            <span className="size-2.5 bg-(--sev-high)" />
            <span className="size-2.5 bg-(--sev-med)" />
            <span className="size-2.5 bg-(--lime)" />
          </div>
          <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-(--cream-dark)">
            file <span className="text-(--dim)">~</span> <span className="text-primary">{fileName}</span>
          </span>
          <button
            onClick={() => selectFile(null, null)}
            aria-label="Close panel"
            className="shrink-0 rounded-none border-2 border-transparent p-0.5 text-(--muted) transition-colors hover:border-(--border-pixel) hover:bg-(--bg-raised) hover:text-(--cream)"
          >
            <X className="size-3" />
          </button>
        </div>
      </div>

      {/* Identity row */}
      <div className="shrink-0 border-b-2 border-dashed border-(--border-pixel) bg-(--bg-card) px-3 py-3">
        <div className="flex items-start gap-2.5">
          <span className="flex size-9 shrink-0 items-center justify-center border-2 border-(--border-pixel) bg-(--bg-raised)">
            <img src={`/icons/vscode/${getFileIcon(fileName)}`} alt="" className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <button
              onClick={() => openCodeViewer(file.path)}
              className="block w-full truncate text-left font-mono text-[12px] font-semibold text-(--cream) transition-colors hover:text-primary"
            >
              {fileName}
            </button>
            <div className="mt-1 flex items-center gap-1.5">
              <span className="size-1.5 shrink-0" style={{ backgroundColor: districtColor }} />
              <span className="truncate font-mono text-[10px] uppercase tracking-[0.06em] text-(--cream-dark)">{file.district}</span>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button
              onClick={() => openCodeViewer(file.path)}
              aria-label="View source"
              title="View source"
              className="rounded-none border-2 border-transparent p-1 text-(--muted) transition-colors hover:border-(--border-pixel) hover:bg-(--bg-raised) hover:text-(--cream)"
            >
              <FileCode className="size-3" />
            </button>
            <button
              onClick={handleCopyPath}
              aria-label="Copy file path"
              title="Copy path"
              className="rounded-none border-2 border-transparent p-1 text-(--muted) transition-colors hover:border-(--border-pixel) hover:bg-(--bg-raised) hover:text-(--cream)"
            >
              {copied ? <Check className="size-3 text-(--lime)" /> : <Copy className="size-3" />}
            </button>
            {githubUrl && (
              <a
                href={githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                title="Open on GitHub"
                className="rounded-none border-2 border-transparent p-1 text-(--muted) transition-colors hover:border-(--border-pixel) hover:bg-(--bg-raised) hover:text-(--cream)"
              >
                <svg className="size-3" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.477 2 2 6.477 2 12c0 4.418 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.009-.868-.013-1.703-2.782.604-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0 1 12 6.836a9.59 9.59 0 0 1 2.504.337c1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.202 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.163 22 16.418 22 12c0-5.523-4.477-10-10-10z"/></svg>
              </a>
            )}
          </div>
        </div>

        {/* Tag row */}
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {ext && (
            <span className="border-2 border-(--border-pixel) bg-(--bg-raised) px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.08em] text-(--cream-dark)">
              {ext}
            </span>
          )}
          <span className={`border-2 ${cplxBadgeClass} bg-(--bg-raised) px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.08em]`}>
            CPLX {cplxLabel}
          </span>
          {file.isReactComponent && (
            <span className="border-2 border-(--sev-low) bg-[color-mix(in_srgb,var(--sev-low)_8%,transparent)] px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.08em] text-(--sev-low)">
              REACT
            </span>
          )}
          {file.hasUnusedExports && (
            <span className="border-2 border-(--sev-high) bg-[color-mix(in_srgb,var(--sev-high)_8%,transparent)] px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.08em] text-(--sev-high)">
              UNUSED
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto overscroll-contain scroll-thin">
        <div className="px-3 py-3">
          <div className="grid grid-cols-3 gap-1.5">
            <StatCell label="Lines" value={file.lines} />
            <StatCell label="Funcs" value={file.functions.length} />
            <StatCell label="Cplx" value={file.complexity} valueClassName={cplxColorClass} />
            <StatCell label="Types" value={file.types.length} />
            <StatCell label="Imp" value={file.imports.length} />
            <StatCell label="Used" value={file.importedBy.length} />
          </div>
        </div>

        {file.functions.length > 0 && (
          <Section title="Functions" count={file.functions.length}>
            <div className="space-y-px">
              {file.functions.map((fn, i) => (
                <button
                  key={`${fn.name}-${i}`}
                  onClick={() => openCodeViewer(file.path, fn.name)}
                  className="group flex w-full cursor-pointer items-center justify-between border border-transparent px-2 py-1.5 text-left transition-colors hover:border-(--border-pixel) hover:bg-(--bg-raised)"
                >
                  <span className="flex items-center gap-1.5 truncate font-mono text-[11px] text-(--cream) group-hover:text-primary">
                    {fn.exported && <span className="size-1.5 shrink-0 bg-(--lime)" />}
                    {fn.name}
                  </span>
                  <span className="ml-2 shrink-0 font-mono text-[10px] tabular-nums text-(--muted)">{fn.lines}L</span>
                </button>
              ))}
            </div>
          </Section>
        )}

        {file.types.length > 0 && (
          <Section title="Types" count={file.types.length} defaultOpen={file.types.length <= 8}>
            <div className="space-y-px">
              {file.types.map((t, i) => (
                <div key={`${t.name}-${i}`} className="flex items-center gap-2 border border-transparent px-2 py-1.5 transition-colors hover:border-(--border-pixel) hover:bg-(--bg-raised)">
                  <span className="border-2 border-(--sev-med) bg-[color-mix(in_srgb,var(--sev-med)_10%,transparent)] px-1.5 py-px font-mono text-[9px] uppercase tracking-[0.08em] text-(--sev-med)">
                    {t.kind}
                  </span>
                  <span className="truncate font-mono text-[11px] text-(--cream-dark)">{t.name}</span>
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
                  <p className="mb-1.5 flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.08em] text-(--muted)">
                    <ArrowRight className="size-2.5" /> Imports
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {file.imports.map((imp, i) => (
                      <button
                        key={`${imp}-${i}`}
                        onClick={() => handleNavigate(imp)}
                        className="max-w-[130px] truncate border-2 border-(--sev-high) bg-[color-mix(in_srgb,var(--sev-high)_8%,transparent)] px-1.5 py-0.5 font-mono text-[10px] text-(--sev-high) transition-colors hover:bg-[color-mix(in_srgb,var(--sev-high)_14%,transparent)]"
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
                  <p className="mb-1.5 flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.08em] text-(--muted)">
                    <ArrowLeft className="size-2.5" /> Imported By
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {file.importedBy.map((dep, i) => (
                      <button
                        key={`${dep}-${i}`}
                        onClick={() => handleNavigate(dep)}
                        className="max-w-[130px] truncate border-2 border-(--sev-low) bg-[color-mix(in_srgb,var(--sev-low)_8%,transparent)] px-1.5 py-0.5 font-mono text-[10px] text-(--sev-low) transition-colors hover:bg-[color-mix(in_srgb,var(--sev-low)_14%,transparent)]"
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
                  <p className="mb-1.5 flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.08em] text-(--muted)">
                    <Package className="size-2.5" /> External
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {file.externalImports.map((extern, i) => (
                      <span
                        key={`${extern}-${i}`}
                        className="border-2 border-(--border-light) bg-(--bg-raised) px-1.5 py-0.5 font-mono text-[10px] text-(--cream-dark)"
                      >
                        {extern}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Section>
        )}
      </div>

      {/* Terminal footer */}
      <div className="shrink-0 border-t-2 border-(--border-pixel) bg-(--bg-card) px-3 py-1.5">
        <div className="flex items-center justify-between gap-2 font-mono text-[10px] uppercase tracking-[0.08em] text-(--muted)">
          <span className="truncate">
            <span className="text-(--dim)">{">"}</span>{" "}
            <span className="text-(--cream-dark) tabular-nums">{file.lines}</span> lines
          </span>
          <span className="shrink-0 text-(--dim)">
            <span className="text-(--cream-dark) tabular-nums">{file.functions.length}</span>fn ·{" "}
            <span className="text-(--cream-dark) tabular-nums">{file.types.length}</span>t ·{" "}
            <span className="text-(--cream-dark) tabular-nums">{file.imports.length}</span>→ ·{" "}
            <span className="text-(--cream-dark) tabular-nums">{file.importedBy.length}</span>←
          </span>
        </div>
      </div>
    </div>
  )
}

function StatCell({ label, value, valueClassName = "" }: { label: string; value: number; valueClassName?: string }) {
  return (
    <div className="pixel-shadow-sm border-2 border-(--border-pixel) bg-(--bg-raised) p-2 text-center transition-colors hover:border-(--border-light)">
      <div className={`font-mono text-[15px] font-bold tabular-nums leading-none ${valueClassName || "text-(--cream)"}`}>
        {value.toLocaleString()}
      </div>
      <div className="mt-1 font-mono text-[9px] font-medium uppercase tracking-[0.08em] text-(--muted)">{label}</div>
    </div>
  )
}
