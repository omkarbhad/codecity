"use client"

import { useRef, useEffect, useState, useCallback, type ReactNode } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  ExternalLink,
  FolderTree,
  FileCode,
  Brain,
  Search,
  X,
  Filter,
  Map,
  Palette,
  GitCommit,
  Box,
  Square,
  Share2,
  ShieldAlert,
} from "lucide-react"
import { cn } from "@codecity/ui/lib/utils"
import { IconButton } from "@codecity/ui/components/icon-button"
import type { CitySnapshot, LayoutMode } from "@/lib/types/city"
import type { SecurityScanResult } from "@/lib/tauri"
import { startSecurityScan, isTauri } from "@/lib/tauri"
import { pollSecurityScan } from "@/lib/security"
import { useCityStore, type VisualizationMode } from "./use-city-store"
import { FileTree } from "./file-tree"
import { ExtensionFilter } from "./extension-filter"
import { DistrictLegend } from "./district-legend"
import { Minimap } from "./minimap"
import { SidePanel } from "./side-panel"
import { SecuritySidebar } from "./security-sidebar"
import { BottomBar } from "./bottom-bar"
import { CityTooltip } from "./city-tooltip"
import { CommitTimeline } from "./commit-timeline"
import { CodeViewer } from "./code-viewer"
import { LogoMark } from "@/components/logo"

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
        "group flex w-[5px] shrink-0 cursor-col-resize items-stretch justify-center bg-(--bg-deep) transition-colors hover:bg-(--bg-raised) active:bg-primary/15",
        side === "left" ? "border-r-2 border-(--border-pixel)" : "border-l-2 border-(--border-pixel)"
      )}
    >
      <span className="my-3 w-px bg-(--border-light) transition-colors group-hover:bg-primary" />
    </div>
  )
}

// ── Types ───────────────────────────────────────────────────────────────────

type PrimaryView = "explorer" | "search" | "filters" | "minimap" | "legend" | "commits"

const MODES: { key: VisualizationMode; label: string; title: string; shortcut: string }[] = [
  { key: "dependencies", label: "Deps", title: "Color by dependencies", shortcut: "1" },
  { key: "complexity", label: "Complexity", title: "Color by complexity", shortcut: "2" },
  { key: "unused", label: "Unused", title: "Highlight unused exports", shortcut: "3" },
  { key: "filesize", label: "Size", title: "Color by file size", shortcut: "4" },
  { key: "types", label: "Types", title: "Color by type count", shortcut: "5" },
]

const LAYOUTS: { key: LayoutMode; label: string; title: string; icon: typeof FolderTree }[] = [
  { key: "folder", label: "Folder", title: "Group by folder", icon: FolderTree },
  { key: "extension", label: "Ext", title: "Group by file extension", icon: FileCode },
  { key: "semantic", label: "Cluster", title: "Group by import cluster", icon: Brain },
]

interface ProjectShellProps {
  snapshot: CitySnapshot
  explorerSnapshot?: CitySnapshot
  projectName: string
  projectId?: string
  projectRoot?: string
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
        "flex w-12 shrink-0 flex-col items-center gap-1 bg-(--bg-deep) px-1.5 py-2",
        position === "left" ? "border-r-2 border-(--border-pixel)" : "border-l-2 border-(--border-pixel)"
      )}
    >
      {items.map((item) => {
        const Icon = item.icon
        const active = activeView === item.id
        const label = `${item.label}${item.shortcut ? ` (${item.shortcut})` : ""}`
        return (
          <button
            key={item.id}
            onClick={() => onViewChange(item.id)}
            title={label}
            aria-label={label}
            aria-pressed={active}
            className={cn(
              "relative flex h-9 w-9 items-center justify-center border-2 transition-colors",
              active
                ? "border-(--border-light) bg-(--bg-raised) text-primary"
                : "border-transparent text-(--muted) hover:border-(--border-pixel) hover:bg-(--bg-raised) hover:text-(--cream)"
            )}
          >
            {/* Active indicator bar */}
            {active && (
              <div
                className={cn(
                  "absolute bottom-1.5 top-1.5 w-[3px] bg-primary",
                  position === "left" ? "-left-2" : "-right-2"
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
  explorerSnapshot,
  repoUrl,
}: {
  view: PrimaryView
  snapshot: CitySnapshot
  explorerSnapshot: CitySnapshot
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
          <PanelHeader title="Explorer" subtitle={`${explorerSnapshot.files.length.toLocaleString()} files`} />
          <FileTree snapshot={explorerSnapshot} selectionSnapshot={snapshot} />
        </>
      )
    case "search":
      return (
        <>
          <PanelHeader title="Search" />
          <div className="border-b-2 border-(--border-pixel) px-3 py-2.5">
            <div className="relative group">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-(--muted) pointer-events-none group-focus-within:text-primary transition-colors" />
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search files..."
                aria-label="Search files"
                className="h-8 w-full border-2 border-(--border-pixel) bg-(--bg-card) pl-7 pr-7 font-mono text-[12px] text-(--cream) outline-none transition-colors placeholder:text-(--muted) focus:border-primary"
              />
              {searchQuery && (
                <button onClick={() => setSearch("")} aria-label="Clear search" className="absolute right-1 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center text-(--muted) transition-colors hover:text-(--cream)">
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto overscroll-contain scroll-thin">
            <FileTree snapshot={explorerSnapshot} selectionSnapshot={snapshot} />
          </div>
        </>
      )
    case "filters":
      return (
        <>
          <PanelHeader title="Filters" subtitle={`${explorerSnapshot.files.length.toLocaleString()} files`} />
          <ExtensionFilter snapshot={explorerSnapshot} />
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
          <PanelHeader title="Minimap" subtitle="Click to navigate" />
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
              <p className="text-xs text-(--muted) text-center">No repository URL available</p>
            </div>
          )}
        </>
      )
  }
}

function PanelHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="flex h-11 shrink-0 items-center justify-between border-b-2 border-(--border-pixel) bg-(--bg) px-3">
      <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-(--cream)">
        {title}
      </span>
      {subtitle && (
        <span className="border-2 border-(--border-pixel) bg-(--bg-raised) px-1.5 py-0.5 font-mono text-[10px] tabular-nums text-(--cream-dark)">{subtitle}</span>
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
      <div style={{ width }} className="hidden shrink-0 flex-col overflow-hidden bg-(--bg) md:flex">
        <SidePanel snapshot={snapshot} />
      </div>
    </>
  )
}

// ── Project Navbar ──────────────────────────────────────────────────────────

function ProjectNavbar({
  projectName,
  repoUrl,
  snapshot,
  actions,
  onSecurityClick,
  securityActive,
  securityEnabled,
}: {
  projectName: string
  repoUrl?: string
  snapshot: CitySnapshot
  actions?: ReactNode
  onSecurityClick?: () => void
  securityActive?: boolean
  securityEnabled?: boolean
}) {
  const router = useRouter()
  const visualizationMode = useCityStore((s) => s.visualizationMode)
  const setMode = useCityStore((s) => s.setMode)
  const layoutMode = useCityStore((s) => s.layoutMode)
  const setLayoutMode = useCityStore((s) => s.setLayoutMode)
  const viewDimension = useCityStore((s) => s.viewDimension)
  const setViewDimension = useCityStore((s) => s.setViewDimension)

  return (
    <header className="z-50 grid h-[52px] shrink-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 border-b-2 border-(--border-pixel) bg-(--bg-deep) px-3">
      {/* Left */}
      <div className="flex items-center gap-2 min-w-0">
        <IconButton onClick={() => router.back()} aria-label="Go back" title="Go back">
          <ArrowLeft />
        </IconButton>
        <Link href="/dashboard" className="flex items-center gap-2 text-(--cream) transition-colors hover:text-primary">
          <LogoMark className="size-6" />
          <span className="hidden font-mono text-[12px] font-semibold uppercase tracking-[0.05em] xl:inline">CodeCity</span>
        </Link>
        <span className="hidden text-(--muted) sm:inline">/</span>
        <span className="max-w-[90px] truncate font-mono text-[12px] text-(--cream-dark) sm:max-w-[240px]">{projectName}</span>
        {repoUrl?.startsWith("http") && (
          <a
            href={repoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden size-7 shrink-0 items-center justify-center text-(--muted) transition-colors hover:bg-(--bg-raised) hover:text-(--cream) sm:flex"
            title="Open repository on GitHub"
            aria-label="Open repository on GitHub"
          >
            <ExternalLink className="size-3.5" />
          </a>
        )}
      </div>

      {/* Center — view, layout and color mode */}
      <div className="col-start-2 hidden min-w-0 items-center gap-2 overflow-x-auto scrollbar-none sm:flex">
        <div className="cc-seg" role="group" aria-label="View">
          {([
            { key: "3d" as const, label: "3D", Icon: Box },
            { key: "2d" as const, label: "2D", Icon: Square },
            { key: "network" as const, label: "Network", Icon: Share2 },
          ]).map(({ key, label, Icon }) => (
            <button
              key={key}
              onClick={() => setViewDimension(key)}
              aria-pressed={viewDimension === key}
              aria-label={`${label} view`}
              title={`${label} view`}
              className="cc-seg-btn"
            >
              <Icon />
              <span className="hidden min-[1440px]:inline">{label}</span>
            </button>
          ))}
        </div>

        <div className="cc-seg" role="group" aria-label="Layout">
          {LAYOUTS.map((l) => {
            const Icon = l.icon
            return (
              <button
                key={l.key}
                onClick={() => setLayoutMode(l.key)}
                aria-pressed={layoutMode === l.key}
                aria-label={l.title}
                title={l.title}
                className="cc-seg-btn"
              >
                <Icon />
                <span className="hidden min-[1440px]:inline">{l.label}</span>
              </button>
            )
          })}
        </div>

        <div className="cc-seg" role="group" aria-label="Color mode">
          {MODES.map((m) => (
            <button
              key={m.key}
              onClick={() => setMode(m.key)}
              aria-pressed={visualizationMode === m.key}
              title={`${m.title} (${m.shortcut})`}
              className="cc-seg-btn"
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div className="col-start-3 flex min-w-0 justify-end gap-2 font-mono text-[11px] text-(--muted)">
        {actions}
        {securityEnabled && onSecurityClick && (
          <div className="cc-seg">
            <button
              onClick={onSecurityClick}
              title="Security scan"
              aria-label="Security scan"
              aria-pressed={!!securityActive}
              className="cc-seg-btn"
            >
              <ShieldAlert />
              <span className="hidden xl:inline">Security</span>
            </button>
          </div>
        )}
      </div>

      {/* Mobile center — tap to cycle */}
      <div className="col-start-2 row-start-1 flex items-center justify-center gap-1 sm:hidden">
        <button
          onClick={() => {
            const idx = LAYOUTS.findIndex((l) => l.key === layoutMode)
            setLayoutMode(LAYOUTS[(idx + 1) % LAYOUTS.length].key)
          }}
          aria-label={`Layout: ${LAYOUTS.find((l) => l.key === layoutMode)?.title}. Tap to change`}
          className="flex h-7 items-center gap-1 border-2 border-(--border-pixel) bg-(--bg-card) px-2 text-(--cream)"
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
          aria-label={`Color mode: ${MODES.find((m) => m.key === visualizationMode)?.title}. Tap to change`}
          className="h-7 bg-primary px-2 font-mono text-[11px] font-medium uppercase tracking-[0.05em] text-primary-foreground"
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

export function ProjectShell({ snapshot, explorerSnapshot = snapshot, projectName, projectId, projectRoot, repoUrl, navbarActions, children }: ProjectShellProps) {
  const [activeView, setActiveView] = useState<PrimaryView | null>("explorer")
  const [primaryWidth, setPrimaryWidth] = useState(240)
  const [secondaryWidth, setSecondaryWidth] = useState(280)
  const selectedFile = useCityStore((s) => s.selectedFile)

  // Security scan state
  const [securityOpen, setSecurityOpen] = useState(false)
  const [securityResult, setSecurityResult] = useState<SecurityScanResult | null>(null)
  const [securityLoading, setSecurityLoading] = useState(false)
  const [securityError, setSecurityError] = useState<string | null>(null)
  const stopPollRef = useRef<(() => void) | null>(null)

  const isDesktop = isTauri()
  const canScan = isDesktop && !!projectId && !!projectRoot

  const handleSecurityClick = useCallback(async () => {
    if (securityOpen && !securityLoading) {
      setSecurityOpen(false)
      return
    }
    setSecurityOpen(true)

    if (!canScan || !projectId || !projectRoot) return

    // If already running, just open the panel
    if (securityLoading) return

    // Cancel any previous poll
    stopPollRef.current?.()
    setSecurityLoading(true)
    setSecurityError(null)

    try {
      await startSecurityScan(projectId, projectRoot)

      stopPollRef.current = pollSecurityScan(
        projectId,
        (result) => setSecurityResult(result),
        (result) => { setSecurityResult(result); setSecurityLoading(false) },
        (err) => { setSecurityError(err.message); setSecurityLoading(false) }
      )
    } catch (err) {
      setSecurityError(err instanceof Error ? err.message : String(err))
      setSecurityLoading(false)
    }
  }, [securityOpen, securityLoading, canScan, projectId, projectRoot])

  const handleSecurityClose = useCallback(() => {
    setSecurityOpen(false)
  }, [])

  // Cleanup poll on unmount
  useEffect(() => {
    return () => { stopPollRef.current?.() }
  }, [])

  const handleViewChange = useCallback((view: PrimaryView) => {
    setActiveView((prev) => (prev === view ? null : view))
  }, [])

  const handlePrimaryResize = useCallback((delta: number) => {
    setPrimaryWidth((w) => Math.min(MAX_PANEL, Math.max(MIN_PANEL, w + delta)))
  }, [])

  const handleSecondaryResize = useCallback((delta: number) => {
    setSecondaryWidth((w) => Math.min(MAX_PANEL, Math.max(MIN_PANEL, w + delta)))
  }, [])

  useEffect(() => {
    if (selectedFile) setActiveView("explorer")
  }, [selectedFile])

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

  const showSecurityPanel = securityOpen && canScan

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-(--bg-deep)">
      {/* Top navbar — full width */}
      <ProjectNavbar
        projectName={projectName}
        repoUrl={repoUrl}
        snapshot={snapshot}
        actions={navbarActions}
        onSecurityClick={handleSecurityClick}
        securityActive={securityOpen}
        securityEnabled={canScan}
      />

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
            <div style={{ width: primaryWidth }} className="hidden shrink-0 flex-col overflow-hidden bg-(--bg) md:flex">
              <PrimaryPanelContent view={activeView} snapshot={snapshot} explorerSnapshot={explorerSnapshot} repoUrl={repoUrl} />
            </div>
            <ResizeHandle side="left" onResize={handlePrimaryResize} />
          </>
        )}

        {/* Canvas area */}
        <div className="flex flex-col flex-1 overflow-hidden bg-(--bg-deep)">
          <div className="relative flex-1 overflow-hidden">
            {children}
            <CityTooltip snapshot={snapshot} />
            <CodeViewer />
          </div>
          <BottomBar stats={snapshot.stats} warnings={snapshot.warnings} />
        </div>

        {/* Secondary panel (file details) */}
        <SecondaryPanel snapshot={snapshot} width={secondaryWidth} onResize={handleSecondaryResize} />

        {/* Security panel */}
        {showSecurityPanel && (
          <>
            <ResizeHandle side="right" onResize={handleSecondaryResize} />
            <div style={{ width: secondaryWidth }} className="hidden shrink-0 flex-col overflow-hidden bg-(--bg) md:flex">
              <SecuritySidebar
                result={securityResult}
                loading={securityLoading}
                error={securityError}
                onClose={handleSecurityClose}
              />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
