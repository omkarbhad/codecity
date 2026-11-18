"use client"

import { useMemo, useState, useCallback } from "react"
import { ArrowLeftIcon, ChevronLeftIcon, ChevronRightIcon, ArrowRightIcon, XIcon, CopyIcon, GithubIcon, PackageIcon, CodeXmlIcon, FileCodeIcon, CheckIcon } from "@/components/ui/icons"
import type { AppIconType } from "@/components/ui/icons"
import { FileIcon } from "./file-icons"
import { AppIcon } from "@/components/ui/app-icon"

function getGitHubFileUrl(repoUrl: string, filePath: string): string | null {
  if (!/^https?:\/\/(www\.)?github\.com\//.test(repoUrl)) return null
  return `${repoUrl.replace(/\.git$/, "")}/blob/HEAD/${filePath}`
}

import type { CitySnapshot } from "@/lib/types/city"
import { useCityStore } from "./use-city-store"
import { UNKNOWN_COLOR } from "@/lib/theme"

interface SidePanelProps {
  snapshot: CitySnapshot
}

type Detail = "functions" | "types" | "imports" | "importedBy" | "packages"

const iconButton =
  "flex size-7 shrink-0 items-center justify-center rounded-[7px] text-(--muted) transition-[color,background-color] hover:bg-(--bg-raised) hover:text-(--cream)"
const listRow =
  "flex h-8 w-full items-center gap-2 rounded-[8px] px-2.5 text-left text-[13px] transition-colors"

/** One line of the file's overview: what it has, how many, and the way in to the list. */
function DetailRow({ icon, label, count, onOpen }: { icon: AppIconType; label: string; count: number; onOpen: () => void }) {
  const empty = count === 0
  return (
    <button
      type="button"
      onClick={onOpen}
      disabled={empty}
      className="group flex h-9 w-full items-center gap-2.5 rounded-[8px] px-2.5 text-left text-[13.5px] text-(--cream-dark) transition-[color,background-color,transform] duration-150 enabled:hover:bg-(--bg-raised) enabled:hover:text-(--cream) enabled:active:scale-[0.99] disabled:text-(--muted)"
    >
      <AppIcon icon={icon} className="size-[18px] shrink-0 text-(--muted) transition-colors group-enabled:group-hover:text-(--cream)" />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      <span className="shrink-0 text-[12px] tabular-nums text-(--muted)">{count.toLocaleString()}</span>
      <AppIcon icon={ChevronRightIcon} className={`size-3 shrink-0 ${empty ? "invisible" : "text-(--dim) transition-colors group-hover:text-(--cream-dark)"}`} />
    </button>
  )
}

export function SidePanel({ snapshot }: SidePanelProps) {
  const selectedFile = useCityStore((s) => s.selectedFile)
  const selectFile = useCityStore((s) => s.selectFile)
  const repoUrl = useCityStore((s) => s.repoUrl)
  const openCodeViewer = useCityStore((s) => s.openCodeViewer)
  const [copied, setCopied] = useState(false)
  const [openDetail, setOpenDetail] = useState<{ path: string; detail: Detail } | null>(null)

  const file = useMemo(() => {
    if (!selectedFile) return null
    return snapshot.files.find((f) => f.path === selectedFile) ?? null
  }, [selectedFile, snapshot.files])

  const districtColor = useMemo(() => {
    if (!file) return UNKNOWN_COLOR
    return snapshot.districts.find((d) => d.name === file.district)?.color ?? UNKNOWN_COLOR
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
  const folder = file.path.includes("/") ? file.path.slice(0, file.path.lastIndexOf("/")) : ""
  const cplxTone = file.complexity <= 10 ? "lime" : file.complexity <= 25 ? "med" : "high"
  const cplxColorClass = cplxTone === "lime" ? "text-(--lime)" : cplxTone === "med" ? "text-(--sev-med)" : "text-(--sev-high)"
  const cplxLabel = cplxTone === "lime" ? "Low" : cplxTone === "med" ? "Medium" : "High"
  const githubUrl = repoUrl ? getGitHubFileUrl(repoUrl, file.path) : null
  const packages = file.externalImports ?? []
  // The list being looked at; a different file starts again from its overview
  const detail = openDetail?.path === file.path ? openDetail.detail : null
  const open = (next: Detail) => setOpenDetail({ path: file.path, detail: next })

  const details: { key: Detail; icon: AppIconType; label: string; count: number }[] = [
    { key: "functions", icon: CodeXmlIcon, label: "Functions", count: file.functions.length },
    { key: "types", icon: FileCodeIcon, label: "Types", count: file.types.length },
    { key: "imports", icon: ArrowRightIcon, label: "Imports", count: file.imports.length },
    { key: "importedBy", icon: ArrowLeftIcon, label: "Used by", count: file.importedBy.length },
    { key: "packages", icon: PackageIcon, label: "Packages", count: packages.length },
  ]
  const current = details.find((d) => d.key === detail)

  return (
    <div className="flex h-full flex-col overflow-hidden bg-transparent">
      {/* The file: icon, name, folder, close */}
      <div className="flex shrink-0 items-start gap-2.5 px-3.5 pb-3 pt-3.5">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-(--bg-card)">
          <FileIcon name={fileName} />
        </span>
        <div className="min-w-0 flex-1">
          <button
            type="button"
            onClick={() => openCodeViewer(file.path)}
            title={`Open ${file.path}`}
            className="block w-full truncate text-left text-[14px] font-medium text-(--cream) transition-colors hover:underline hover:decoration-(--dim) hover:underline-offset-[3px]"
          >
            {fileName}
          </button>
          <div className="mt-0.5 flex items-center gap-1.5" title={file.path}>
            <span className="size-2 shrink-0 rounded-[2px]" style={{ backgroundColor: districtColor }} />
            <span className="truncate text-[12px] text-(--muted)">{folder || file.district}</span>
          </div>
        </div>
        <button onClick={() => selectFile(null, null)} aria-label="Close file details" title="Close (Esc)" className={iconButton}>
          <AppIcon icon={XIcon} className="size-3.5" />
        </button>
      </div>

      {current ? (
        // One list, with the way back to the overview
        <div key={current.key} className="cc-drill-in flex min-h-0 flex-1 flex-col border-t border-(--border-pixel)">
          <div className="flex h-10 shrink-0 items-center gap-1 pl-1.5 pr-3.5">
            <button
              type="button"
              onClick={() => setOpenDetail(null)}
              aria-label={`Back to the file overview from ${current.label}`}
              title="Back to overview"
              className="group flex h-7 min-w-0 items-center gap-1 rounded-[8px] pl-1 pr-2 text-[13.5px] font-medium text-(--cream) transition-colors hover:bg-(--bg-raised)"
            >
              <AppIcon icon={ChevronLeftIcon} className="size-3.5 shrink-0 text-(--muted) transition-colors group-hover:text-(--cream)" />
              <span className="truncate">{current.label}</span>
            </button>
            <span className="flex-1" />
            <span className="text-[12px] tabular-nums text-(--muted)">{current.count.toLocaleString()}</span>
          </div>

          <div className="flex-1 overflow-y-auto overscroll-contain px-2 pb-3 scroll-thin">
            {detail === "functions" && file.functions.map((fn, i) => (
              <button
                key={`${fn.name}-${i}`}
                type="button"
                onClick={() => openCodeViewer(file.path, fn.name)}
                title={`Open ${fn.name} in the source viewer`}
                className={`${listRow} text-(--cream-dark) hover:bg-(--bg-raised) hover:text-(--cream)`}
              >
                <span className="min-w-0 flex-1 truncate">{fn.name}</span>
                {fn.exported && <span className="shrink-0 text-[11px] text-(--muted)">exported</span>}
                <span className="w-9 shrink-0 text-right text-[11.5px] tabular-nums text-(--muted)">{fn.lines}</span>
              </button>
            ))}

            {detail === "types" && file.types.map((t, i) => (
              <div key={`${t.name}-${i}`} className={`${listRow} text-(--cream-dark)`}>
                <span className="min-w-0 flex-1 truncate">{t.name}</span>
                <span className="shrink-0 text-[11.5px] text-(--muted)">{t.kind}</span>
              </div>
            ))}

            {(detail === "imports" || detail === "importedBy") && (detail === "imports" ? file.imports : file.importedBy).map((path, i) => {
              const name = path.split("/").pop() ?? path
              return (
                <button
                  key={`${path}-${i}`}
                  type="button"
                  onClick={() => handleNavigate(path)}
                  title={`Go to ${path}`}
                  className={`${listRow} text-(--cream-dark) hover:bg-(--bg-raised) hover:text-(--cream)`}
                >
                  <FileIcon name={name} className="!size-3.5 shrink-0" />
                  <span className="min-w-0 flex-1 truncate">{name}</span>
                  <span className="max-w-[45%] shrink-0 truncate text-[11.5px] text-(--muted)" dir="rtl">{path.slice(0, Math.max(0, path.length - name.length - 1))}</span>
                </button>
              )
            })}

            {detail === "packages" && packages.map((name, i) => (
              <div key={`${name}-${i}`} className={`${listRow} text-(--cream-dark)`}>
                <span className="min-w-0 flex-1 truncate">{name}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto overscroll-contain scroll-thin">
          {/* Actions on the file */}
          <div className="flex items-center gap-1.5 px-3.5 pb-3.5">
            <button
              type="button"
              onClick={() => openCodeViewer(file.path)}
              className="flex h-8 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-[9px] bg-(--bg-card) text-[13px] font-medium text-(--cream) transition-[background-color,transform] duration-150 hover:bg-(--bg-raised) active:scale-[0.98]"
            >
              <AppIcon icon={CodeXmlIcon} className="size-4 text-(--muted)" />
              Open file
            </button>
            <button onClick={handleCopyPath} aria-label="Copy file path" title={copied ? "Copied" : "Copy path"} className={`${iconButton} !size-8 bg-(--bg-card)`}>
              <AppIcon icon={copied ? CheckIcon : CopyIcon} className={`size-4 ${copied ? "text-(--lime)" : ""}`} />
            </button>
            {githubUrl && (
              <a href={githubUrl} target="_blank" rel="noopener noreferrer" title="Open on GitHub" aria-label="Open file on GitHub" className={`${iconButton} !size-8 bg-(--bg-card)`}>
                <AppIcon icon={GithubIcon} className="size-4" />
              </a>
            )}
          </div>

          {/* Three numbers that size the file up */}
          <div className="mx-3.5 grid grid-cols-3 divide-x divide-(--border-pixel) rounded-[12px] border border-(--border-pixel)">
            <StatCell label="Lines" value={file.lines} />
            <StatCell label="Functions" value={file.functions.length} />
            <StatCell label="Complexity" value={file.complexity} valueClassName={cplxColorClass} title={`${cplxLabel} complexity`} />
          </div>

          {(file.isReactComponent || file.hasUnusedExports) && (
            <div className="flex flex-wrap items-center gap-1.5 px-3.5 pt-3">
              {file.isReactComponent && (
                <span className="rounded-full bg-[color-mix(in_srgb,var(--sev-low)_14%,transparent)] px-2 py-0.5 text-[11px] text-(--sev-low)">React component</span>
              )}
              {file.hasUnusedExports && (
                <span className="rounded-full bg-[color-mix(in_srgb,var(--sev-high)_14%,transparent)] px-2 py-0.5 text-[11px] text-(--sev-high)">Unused exports</span>
              )}
            </div>
          )}

          {/* What is inside; each row opens its list */}
          <nav aria-label="File contents" className="px-2 pb-3 pt-3">
            <p className="px-2.5 pb-1 text-[11px] font-medium text-(--muted)">Inside this file</p>
            {details.map((d) => (
              <DetailRow key={d.key} icon={d.icon} label={d.label} count={d.count} onOpen={() => open(d.key)} />
            ))}
          </nav>
        </div>
      )}
    </div>
  )
}

function StatCell({ label, value, valueClassName = "", title }: { label: string; value: number; valueClassName?: string; title?: string }) {
  return (
    <div className="min-w-0 px-2 py-2.5 text-center" title={title}>
      <div className={`text-[16px] font-semibold tabular-nums leading-none ${valueClassName || "text-(--cream)"}`}>
        {value.toLocaleString()}
      </div>
      <div className="mt-1.5 truncate text-[11px] text-(--muted)">{label}</div>
    </div>
  )
}
