"use client"

import { useRef, useEffect, useState, useCallback, type ReactNode } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  Code2,
  ExternalLink,
  FolderTree,
  FileCode,
  Brain,
  Search,
  X,
  Filter,
  Map,
  Palette,
  Info,
  GitCommit,
  Keyboard,
} from "lucide-react"
import { cn } from "@codecity/ui/lib/utils"
import { IconButton } from "@codecity/ui/components/icon-button"
import type { CitySnapshot, LayoutMode } from "@/lib/types/city"
import { useCityStore, type VisualizationMode } from "./use-city-store"
import { FileTree } from "./file-tree"
import { ExtensionFilter } from "./extension-filter"
import { DistrictLegend } from "./district-legend"
import { Minimap } from "./minimap"
import { SidePanel } from "./side-panel"
import { BottomBar } from "./bottom-bar"
import { CityTooltip } from "./city-tooltip"
import { CommitTimeline } from "./commit-timeline"
import { CodeViewer } from "./code-viewer"

// ── Resize Handle ───────────────────────────────────────────────────────────

function ResizeHandle({
  side,
  onResize,
}: {
  side: "left" | "right"
  onResize: (delta: number) => void
}) {
  const handleRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = handleRef.current
    if (!el) return

    let startX = 0
    let dragging = false

    function onMouseDown(e: MouseEvent) {
      e.preventDefault()
      startX = e.clientX
      dragging = true
      document.body.style.cursor = "col-resize"
      document.body.style.userSelect = "none"
      window.addEventListener("mousemove", onMouseMove)
      window.addEventListener("mouseup", onMouseUp)
    }

    function onMouseMove(e: MouseEvent) {
      if (!dragging) return
      const delta = e.clientX - startX
      startX = e.clientX
      onResize(side === "left" ? delta : -delta)
    }

    function onMouseUp() {
      dragging = false
      document.body.style.cursor = ""
      document.body.style.userSelect = ""
      window.removeEventListener("mousemove", onMouseMove)
      window.removeEventListener("mouseup", onMouseUp)
    }

    el.addEventListener("mousedown", onMouseDown)
    return () => {
      el.removeEventListener("mousedown", onMouseDown)
      window.removeEventListener("mousemove", onMouseMove)
      window.removeEventListener("mouseup", onMouseUp)
    }
  }, [side, onResize])

  return (
    <div
      ref={handleRef}
      className={cn(
        "group flex w-[5px] shrink-0 cursor-col-resize items-stretch justify-center bg-[#080809] transition-colors hover:bg-white/[0.04] active:bg-primary/15",
        side === "left" ? "border-r border-white/[0.06]" : "border-l border-white/[0.06]"
      )}
    >
      <span className="my-3 w-px rounded-full bg-white/[0.05] transition-colors group-hover:bg-primary/45" />
    </div>
  )
}

// ── Types ───────────────────────────────────────────────────────────────────

type PrimaryView = "explorer" | "search" | "filters" | "minimap" | "legend" | "commits"

const MODES: { key: VisualizationMode; label: string; shortcut: string }[] = [
  { key: "dependencies", label: "Deps", shortcut: "1" },
  { key: "complexity", label: "Cplx", shortcut: "2" },
  { key: "unused", label: "Unused", shortcut: "3" },
  { key: "filesize", label: "Size", shortcut: "4" },
  { key: "types", label: "Types", shortcut: "5" },
]

const LAYOUTS: { key: LayoutMode; label: string; icon: typeof FolderTree }[] = [
  { key: "folder", label: "Folder", icon: FolderTree },
  { key: "extension", label: "Ext", icon: FileCode },
  { key: "semantic", label: "Cluster", icon: Brain },
]

interface ProjectShellProps {
  snapshot: CitySnapshot
  projectName: string
  repoUrl?: string
  navbarActions?: ReactNode
  children: ReactNode
}

// ── Activity Bar (VS Code-style icon strip) ────────────────────────────────

interface ActivityBarProps {
  activeView: PrimaryView | null
  onViewChange: (view: PrimaryView) => void
  position: "left" | "right"
}

interface ActivityItem {
  id: PrimaryView
  icon: typeof FolderTree
  label: string
  shortcut?: string
}

const PRIMARY_ACTIVITIES: ActivityItem[] = [
  { id: "explorer", icon: FolderTree, label: "Explorer", shortcut: "E" },
  { id: "search", icon: Search, label: "Search", shortcut: "/" },
  { id: "filters", icon: Filter, label: "Filters" },
  { id: "legend", icon: Palette, label: "Legend" },
  { id: "minimap", icon: Map, label: "Minimap" },
  { id: "commits", icon: GitCommit, label: "Commits" },
]

function ActivityBar({ activeView, onViewChange, position }: ActivityBarProps) {
  const items = PRIMARY_ACTIVITIES

  return (
    <div
      className={cn(
        "flex w-12 shrink-0 flex-col items-center gap-1 bg-[#09090a] px-1.5 py-2",
        position === "left" ? "border-r border-white/[0.08]" : "border-l border-white/[0.08]"
      )}
    >
      {items.map((item) => {
        const Icon = item.icon
        const active = activeView === item.id
        return (
          <button
            key={item.id}
            onClick={() => onViewChange(item.id)}
            title={`${item.label}${item.shortcut ? ` (${item.shortcut})` : ""}`}
            className={cn(
              "relative flex h-9 w-9 items-center justify-center rounded-lg border transition-colors",
              active
                ? "border-white/[0.10] bg-white/[0.08] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
                : "border-transparent text-white/38 hover:border-white/[0.06] hover:bg-white/[0.04] hover:text-white/72"
            )}
          >
            {/* Active indicator bar */}
            {active && (
              <div
                className={cn(
                  "absolute bottom-2 top-2 w-[2px] rounded-sm bg-primary",
                  position === "left" ? "-left-1.5" : "-right-1.5"
                )}
              />
            )}
            <Icon className="size-[18px]" />
          </button>
        )
      })}
    </div>
  )
}

// ── Primary Sidebar Panel Content ───────────────────────────────────────────

function PrimaryPanelContent({
  view,
  snapshot,
  repoUrl,
}: {
  view: PrimaryView
  snapshot: CitySnapshot
  repoUrl?: string
}) {
  const searchQuery = useCityStore((s) => s.searchQuery)
  const setSearch = useCityStore((s) => s.setSearch)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (view === "search") {
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [view])

  switch (view) {
    case "explorer":
      return (
        <>
          <PanelHeader title="Explorer" subtitle={`${snapshot.files.length.toLocaleString()} files`} />
          <FileTree snapshot={snapshot} />
        </>
      )
    case "search":
      return (
        <>
          <PanelHeader title="Search" />
          <div className="border-b border-white/[0.06] px-3 py-2.5">
            <div className="relative group">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-white/45 pointer-events-none group-focus-within:text-white/65 transition-colors" />
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search files..."
                aria-label="Search files"
                className="h-8 w-full rounded-md border border-white/[0.08] bg-[#111113] pl-7 pr-7 text-[12px] text-white/80 outline-none transition-colors placeholder:text-white/35 focus:border-white/18 focus:bg-white/[0.05]"
              />
              {searchQuery && (
                <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-white/65 hover:text-white/75 transition-colors">
                  <X className="w-2.5 h-2.5" />
                </button>
              )}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto overscroll-contain scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
            <FileTree snapshot={snapshot} />
          </div>
        </>
      )
    case "filters":
      return (
        <>
          <PanelHeader title="Filters" subtitle={`${snapshot.files.length.toLocaleString()} files`} />
          <ExtensionFilter snapshot={snapshot} />
        </>
      )
    case "legend":
      return (
        <>
          <PanelHeader title="Districts" subtitle={`${snapshot.districts.length}`} />
          <DistrictLegend snapshot={snapshot} />
        </>
      )
    case "minimap":
      return (
        <>
          <PanelHeader title="Minimap" />
          <Minimap snapshot={snapshot} />
        </>
      )
    case "commits":
      return (
        <>
          <PanelHeader title="Commits" />
          {repoUrl ? (
            <CommitTimeline repoUrl={repoUrl} />
          ) : (
            <div className="flex items-center justify-center p-6">
              <p className="text-xs text-white/40 text-center">No repository URL available</p>
            </div>
          )}
        </>
      )
  }
}

function PanelHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="flex h-11 shrink-0 items-center justify-between border-b border-white/[0.08] bg-[#0d0d0f] px-3 shadow-[inset_0_-1px_0_rgba(255,255,255,0.02)]">
      <span className="text-[13px] font-semibold text-white/72">
        {title}
      </span>
      {subtitle && (
        <span className="rounded border border-white/[0.07] bg-white/[0.03] px-1.5 py-0.5 text-[10px] tabular-nums text-white/38">{subtitle}</span>
      )}
    </div>
  )
}

// ── Secondary Panel (right) ─────────────────────────────────────────────────

function SecondaryPanel({ snapshot, width, onResize }: { snapshot: CitySnapshot; width: number; onResize: (delta: number) => void }) {
  const selectedFile = useCityStore((s) => s.selectedFile)

  if (!selectedFile) return null

  return (
    <>
      <ResizeHandle side="right" onResize={onResize} />
      <div style={{ width }} className="hidden shrink-0 flex-col overflow-hidden border-l border-white/[0.08] bg-[#0b0b0c] shadow-[-20px_0_60px_rgba(0,0,0,0.20)] md:flex">
        <SidePanel snapshot={snapshot} />
      </div>
    </>
  )
}

// ── Project Navbar ──────────────────────────────────────────────────────────

function formatStat(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`
  return n.toString()
}

function ProjectNavbar({
  projectName,
  repoUrl,
  snapshot,
  actions,
}: {
  projectName: string
  repoUrl?: string
  snapshot: CitySnapshot
  actions?: ReactNode
}) {
  const router = useRouter()
  const visualizationMode = useCityStore((s) => s.visualizationMode)
  const setMode = useCityStore((s) => s.setMode)
  const layoutMode = useCityStore((s) => s.layoutMode)
  const setLayoutMode = useCityStore((s) => s.setLayoutMode)

  return (
    <header className="z-50 grid h-[52px] shrink-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 border-b border-white/[0.08] bg-[#0b0b0c]/95 px-3 shadow-[0_1px_0_rgba(255,255,255,0.02),0_14px_40px_rgba(0,0,0,0.20)] backdrop-blur">
      {/* Left */}
      <div className="flex items-center gap-2 min-w-0">
        <IconButton
          onClick={() => router.back()}
          className="text-white/60 hover:text-white"
          aria-label="Go back"
        >
          <ArrowLeft />
        </IconButton>
        <Link href="/dashboard" className="flex items-center gap-2 text-white/80 transition-colors hover:text-white">
          <img src="/logo.png" alt="CodeCity" className="size-6 shrink-0 rounded-sm" />
          <span className="hidden text-[13px] font-semibold sm:inline">CodeCity</span>
        </Link>
        <span className="hidden text-white/35 sm:inline">/</span>
        <span className="max-w-[90px] truncate font-sans text-[13px] font-medium text-white/72 sm:max-w-[240px]">{projectName}</span>
        {repoUrl?.startsWith("http") && (
          <a
            href={repoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden size-7 shrink-0 items-center justify-center rounded-md text-white/35 transition-colors hover:bg-white/[0.04] hover:text-white/70 sm:flex"
            title="Open repository"
          >
            <ExternalLink className="size-3.5" />
          </a>
        )}
      </div>

      {/* Center — layout + viz modes */}
      <div className="col-start-2 hidden min-w-0 items-center gap-1 overflow-x-auto scrollbar-none sm:flex">
        <div className="flex shrink-0 items-center rounded-lg border border-white/[0.08] bg-white/[0.035] p-0.5">
          {LAYOUTS.map((l) => {
            const Icon = l.icon
            const active = layoutMode === l.key
            return (
              <button
                key={l.key}
                onClick={() => setLayoutMode(l.key)}
                className={`flex h-7 items-center gap-1.5 rounded-md px-2 text-[11px] font-medium transition-colors ${
                  active ? "bg-white/[0.10] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]" : "text-white/58 hover:bg-white/[0.05] hover:text-white/85"
                }`}
              >
                <Icon className="size-3.5" />
                <span className="hidden md:inline">{l.label}</span>
              </button>
            )
          })}
        </div>

        <div className="h-4 w-px shrink-0 bg-white/[0.08]" />

        <div className="flex shrink-0 items-center rounded-lg border border-white/[0.08] bg-white/[0.035] p-0.5">
          {MODES.map((m) => (
            <button
              key={m.key}
              onClick={() => setMode(m.key)}
              className={`h-7 rounded-md px-2 text-[11px] font-medium transition-colors ${
                visualizationMode === m.key ? "bg-white/[0.10] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]" : "text-white/58 hover:bg-white/[0.05] hover:text-white/85"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div className="col-start-3 flex min-w-0 justify-end gap-2 font-mono text-[10px] text-white/45">
        <div className="hidden items-center gap-2 lg:flex">
          <span className="flex h-7 items-center gap-1 rounded-md border border-white/[0.07] bg-white/[0.025] px-2">
            <FileCode className="size-3 text-white/30" />
            <strong className="font-medium text-white/70">{formatStat(snapshot.stats.totalFiles)}</strong>
            files
          </span>
          <span className="flex h-7 items-center gap-1 rounded-md border border-white/[0.07] bg-white/[0.025] px-2">
            <Code2 className="size-3 text-white/30" />
            <strong className="font-medium text-white/70">{formatStat(snapshot.stats.totalLines)}</strong>
            lines
          </span>
        </div>
        {actions}
      </div>

      {/* Mobile center — tap to cycle */}
      <div className="col-start-2 row-start-1 flex items-center justify-center gap-1 sm:hidden">
        <button
          onClick={() => {
            const idx = LAYOUTS.findIndex((l) => l.key === layoutMode)
            setLayoutMode(LAYOUTS[(idx + 1) % LAYOUTS.length].key)
          }}
          className="flex items-center gap-1 rounded-md border border-white/[0.08] bg-white/[0.03] px-2 py-1 text-[11px] font-medium text-white"
        >
          {(() => {
            const ActiveIcon = LAYOUTS.find((l) => l.key === layoutMode)!.icon
            return <ActiveIcon className="w-3 h-3" />
          })()}
        </button>
        <button
          onClick={() => {
            const idx = MODES.findIndex((m) => m.key === visualizationMode)
            setMode(MODES[(idx + 1) % MODES.length].key)
          }}
          className="rounded-md border border-white/[0.08] bg-white/[0.07] px-2 py-1 text-[11px] font-medium text-white"
        >
          {MODES.find((m) => m.key === visualizationMode)?.label}
        </button>
      </div>
    </header>
  )
}

// ── Project Shell ───────────────────────────────────────────────────────────

const MIN_PANEL = 180
const MAX_PANEL = 480

export function ProjectShell({ snapshot, projectName, repoUrl, navbarActions, children }: ProjectShellProps) {
  const [activeView, setActiveView] = useState<PrimaryView | null>("explorer")
  const [primaryWidth, setPrimaryWidth] = useState(240)
  const [secondaryWidth, setSecondaryWidth] = useState(280)

  const handleViewChange = useCallback((view: PrimaryView) => {
    setActiveView((prev) => (prev === view ? null : view))
  }, [])

  const handlePrimaryResize = useCallback((delta: number) => {
    setPrimaryWidth((w) => Math.min(MAX_PANEL, Math.max(MIN_PANEL, w + delta)))
  }, [])

  const handleSecondaryResize = useCallback((delta: number) => {
    setSecondaryWidth((w) => Math.min(MAX_PANEL, Math.max(MIN_PANEL, w + delta)))
  }, [])

  // Keyboard shortcuts for activity bar
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.target as HTMLElement).tagName === "INPUT") return
      if (e.metaKey || e.ctrlKey) {
        if (e.key === "e" || e.key === "E") { e.preventDefault(); handleViewChange("explorer") }
        if (e.key === "f" || e.key === "F") { e.preventDefault(); handleViewChange("search") }
      }
      if (e.key === "l" || e.key === "L") {
        if (!e.metaKey && !e.ctrlKey) {
          e.preventDefault()
          setActiveView((prev) => prev ? null : "explorer")
        }
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [handleViewChange])

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#050506]">
      {/* Top navbar — full width */}
      <ProjectNavbar projectName={projectName} repoUrl={repoUrl} snapshot={snapshot} actions={navbarActions} />

      {/* Main area: activity bar + panel + canvas + secondary */}
      <div className="flex flex-1 overflow-hidden border-t border-black/30">
        {/* Activity bar (icon strip) */}
        <ActivityBar
          activeView={activeView}
          onViewChange={handleViewChange}
          position="left"
        />

        {/* Primary sidebar panel — slides in/out */}
        {activeView && (
          <>
            <div style={{ width: primaryWidth }} className="hidden shrink-0 flex-col overflow-hidden border-r border-white/[0.08] bg-[#0b0b0c] shadow-[18px_0_60px_rgba(0,0,0,0.16)] md:flex">
              <PrimaryPanelContent view={activeView} snapshot={snapshot} repoUrl={repoUrl} />
            </div>
            <ResizeHandle side="left" onResize={handlePrimaryResize} />
          </>
        )}

        {/* Canvas area */}
        <div className="flex flex-col flex-1 overflow-hidden bg-[#070708]">
          <div className="relative flex-1 overflow-hidden">
            {children}
            <CityTooltip snapshot={snapshot} />
            <CodeViewer />
          </div>
          <BottomBar stats={snapshot.stats} warnings={snapshot.warnings} />
        </div>

        {/* Secondary panel (file details) */}
        <SecondaryPanel snapshot={snapshot} width={secondaryWidth} onResize={handleSecondaryResize} />
      </div>
    </div>
  )
}
