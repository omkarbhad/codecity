"use client"

import { useRef, useEffect, useMemo, useState, useCallback, type ReactNode } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { DropdownMenu } from "radix-ui"
import { ChevronLeftIcon, ChevronRightIcon, ChevronDownIcon, CheckIcon, ArrowUpRightIcon, XIcon, NetworkIcon, BoxIcon, FileCodeIcon, ListFilterIcon, FolderIcon, FolderTreeIcon, GitCommitHorizontalIcon, LayersIcon, LayoutGridIcon, WaypointsIcon, SearchIcon, ShieldCheckIcon, SettingsIcon, PanelLeftIcon, PaletteIcon, CircleHelpIcon, TriangleAlertIcon } from "@/components/ui/icons"
import type { AppIconType } from "@/components/ui/icons"
import { cn } from "@codecity/ui/lib/utils"
import type { CitySnapshot, LayoutMode } from "@/lib/types/city"
import type { SecurityScanResult } from "@/lib/tauri"
import { startSecurityScan, isTauri } from "@/lib/tauri"
import { pollSecurityScan } from "@/lib/security"
import { isTypingTarget } from "@/lib/keyboard"
import { AppIcon } from "@/components/ui/app-icon"
import { useCityStore, type VisualizationMode } from "./use-city-store"
import { FileTree } from "./file-tree"
import { ExtensionFilter, getExtension } from "./extension-filter"
import { DistrictLegend } from "./district-legend"
import { SidePanel } from "./side-panel"
import { SecuritySidebar } from "./security-sidebar"
import { HelpDialog } from "./help-dialog"
import { SettingsPanel } from "./settings-panel"
import { CityTooltip } from "./city-tooltip"
import { CommitTimeline } from "./commit-timeline"
import { EditorPane, EditorTabStrip, FileDialogs, NewFileButton, useEditorBridge } from "./editor-pane"
import { LogoMark } from "@/components/logo"
import { FrameNav, shellIconButton, ThemeToggle, TRAFFIC_LIGHTS_HEIGHT, useReserveTrafficLights } from "@/components/window-frame"

// ── Resize Handle ───────────────────────────────────────────────────────────

function ResizeHandle({
  side,
  width,
  onWidthChange,
}: {
  side: "left" | "right"
  width: number
  onWidthChange: (width: number) => void
}) {
  const handleRef = useRef<HTMLDivElement>(null)
  const widthRef = useRef(width)
  widthRef.current = width

  useEffect(() => {
    const el = handleRef.current
    if (!el) return

    let startX = 0
    let startWidth = 0
    let dragging = false

    function endDrag() {
      dragging = false
      document.body.style.cursor = ""
      document.body.style.userSelect = ""
      window.removeEventListener("mousemove", onMouseMove)
      window.removeEventListener("mouseup", endDrag)
    }

    function onMouseDown(e: MouseEvent) {
      e.preventDefault()
      startX = e.clientX
      startWidth = widthRef.current
      dragging = true
      document.body.style.cursor = "col-resize"
      document.body.style.userSelect = "none"
      window.addEventListener("mousemove", onMouseMove)
      window.addEventListener("mouseup", endDrag)
    }

    // Width is measured from where the drag started, so the handle stays under
    // the cursor even after the panel hits its min or max width.
    function onMouseMove(e: MouseEvent) {
      if (!dragging) return
      const delta = e.clientX - startX
      onWidthChange(clampPanel(startWidth + (side === "left" ? delta : -delta)))
    }

    el.addEventListener("mousedown", onMouseDown)
    return () => {
      el.removeEventListener("mousedown", onMouseDown)
      if (dragging) endDrag()
    }
  }, [side, onWidthChange])

  return (
    <div
      ref={handleRef}
      role="separator"
      aria-orientation="vertical"
      aria-label={side === "left" ? "Resize side panel" : "Resize details panel"}
      className={cn(
        "group hidden w-[7px] shrink-0 cursor-col-resize items-stretch justify-center md:flex",
        side === "left" ? "-mx-[3px] mb-2" : "border-l border-(--border-pixel)"
      )}
    >
      <span className="my-3 w-px rounded-full bg-transparent transition-colors group-hover:bg-(--border-light) group-active:bg-(--muted)" />
    </div>
  )
}

// ── Types ───────────────────────────────────────────────────────────────────

// "home" is the sidebar's list of sections; the rest are the sections you go into.
// Search lives inside Explorer; Commits shows only for GitHub projects.
type PrimaryView = "home" | "explorer" | "filters" | "legend" | "commits" | "settings"

const MODES: { key: VisualizationMode; label: string; hint: string; shortcut: string }[] = [
  { key: "dependencies", label: "Dependencies", hint: "District colours, busier files stronger", shortcut: "1" },
  { key: "complexity", label: "Complexity", hint: "Green is simple, red is complex", shortcut: "2" },
  { key: "unused", label: "Unused", hint: "Files whose exports nothing imports", shortcut: "3" },
  { key: "filesize", label: "Size", hint: "Blue is small, red is large", shortcut: "4" },
  { key: "types", label: "Types", hint: "Files that declare many types", shortcut: "5" },
]

const LAYOUTS: { key: LayoutMode; label: string; hint: string; icon: AppIconType }[] = [
  { key: "folder", label: "Folder", hint: "One district per top-level folder", icon: FolderIcon },
  { key: "extension", label: "Extension", hint: "One district per file type", icon: FileCodeIcon },
  { key: "semantic", label: "Cluster", hint: "Files that import each other", icon: NetworkIcon },
]

const VIEWS = [
  { key: "3d", label: "3D", icon: BoxIcon },
  { key: "2d", label: "2D", icon: LayoutGridIcon },
  { key: "network", label: "Network", icon: WaypointsIcon },
] as const

const MIN_PANEL = 180
const MAX_PANEL = 480

function clampPanel(width: number) {
  return Math.min(MAX_PANEL, Math.max(MIN_PANEL, width))
}

interface ProjectShellProps {
  snapshot: CitySnapshot
  explorerSnapshot?: CitySnapshot
  projectName: string
  projectId?: string
  projectRoot?: string
  repoUrl?: string
  navbarActions?: ReactNode
  onFilesChanged?: () => void
  children: ReactNode
}

// ── Activity Bar (VS Code-style icon strip) ────────────────────────────────

interface ActivityBarProps {
  chrome: ShellChrome
  items: ActivityItem[]
  activeView: PrimaryView | null
  onViewChange: (view: PrimaryView) => void
}

interface ActivityItem {
  id: PrimaryView
  icon: AppIconType
  label: string
  shortcut?: string
  /** A count or short fact shown beside the section on the sidebar's home list. */
  meta?: string
}

const PRIMARY_ACTIVITIES: ActivityItem[] = [
  { id: "explorer", icon: FolderTreeIcon, label: "Explorer", shortcut: "⌘E" },
  { id: "legend", icon: LayersIcon, label: "Districts" },
  { id: "filters", icon: ListFilterIcon, label: "File types" },
  { id: "commits", icon: GitCommitHorizontalIcon, label: "Commits" },
]

/** The sections this project can show: Commits needs a GitHub repository. */
function activitiesFor(repoUrl?: string): ActivityItem[] {
  const hasGithub = !!repoUrl?.startsWith("http")
  return PRIMARY_ACTIVITIES.filter((item) => item.id !== "commits" || hasGithub)
}

// Pinned to the bottom of the rail and of the sidebar's home list.
const SETTINGS_ACTIVITY: ActivityItem = { id: "settings", icon: SettingsIcon, label: "Settings", shortcut: "⌘," }

function ActivityBar({ chrome, items, activeView, onViewChange }: ActivityBarProps) {
  // The collapsed sidebar, as in Ghostly: a 76px rail of 40px rounded squares on
  // the window frame (the macOS window buttons sit above it). Clicking one opens
  // the sidebar on that panel.
  const reserveLights = useReserveTrafficLights()
  const button = (item: ActivityItem) => {
    const active = activeView === item.id
    const label = `${item.label}${item.shortcut ? ` (${item.shortcut})` : ""}`
    return (
      <button
        key={item.id}
        type="button"
        onClick={() => onViewChange(item.id)}
        title={label}
        aria-label={label}
        aria-pressed={active}
        className={cn(
          "flex size-10 items-center justify-center rounded-[10px] transition-[color,background-color,transform] duration-150 ease-[cubic-bezier(.2,.8,.2,1)] active:scale-[0.97]",
          active ? "bg-(--bg-raised) text-(--cream)" : "text-(--muted) hover:bg-(--bg-raised) hover:text-(--cream)"
        )}
      >
        <AppIcon icon={item.icon} className="size-[18px]" active={active} />
      </button>
    )
  }
  const group = "flex flex-col items-center gap-1 rounded-[14px] border border-(--border-pixel) bg-(--bg) p-1"

  // On macOS the rail is wide enough that the window buttons sit inside it,
  // clear of the page card; the panel icons sit in a card-style block below them.
  return (
    <nav
      aria-label="Side panels"
      data-tauri-drag-region
      className="hidden shrink-0 flex-col items-center pb-2 md:flex"
      style={{ width: reserveLights ? 92 : 64, paddingTop: reserveLights ? TRAFFIC_LIGHTS_HEIGHT + 6 : 8 }}
    >
      <div className={group}>
        <div className="flex size-10 items-center justify-center"><SidebarToggle chrome={chrome} /></div>
        <span className="h-px w-6 bg-(--border-pixel)" aria-hidden="true" />
        {items.map(button)}
      </div>
      <div data-tauri-drag-region className="flex-1" />
      <div className={group}>
        <div className="flex size-10 items-center justify-center"><ThemeToggle /></div>
        {chrome.securityEnabled && <div className="flex size-10 items-center justify-center"><SecurityButton chrome={chrome} /></div>}
        <div className="flex size-10 items-center justify-center">
          <button type="button" className={shellIconButton} title="Help and shortcuts (?)" aria-label="Help and shortcuts" onClick={chrome.onHelp}>
            <AppIcon icon={CircleHelpIcon} />
          </button>
        </div>
        {button(SETTINGS_ACTIVITY)}
      </div>
    </nav>
  )
}

// ── Sidebar (open) ──────────────────────────────────────────────────────────

const navRow =
  "group flex h-9 w-full items-center gap-2.5 rounded-[8px] px-2.5 text-left text-[13.5px] text-(--cream-dark) transition-[color,background-color,transform] duration-150 hover:bg-(--bg-raised) hover:text-(--cream) active:scale-[0.99]"

/** One line of the sidebar's home list: an icon, a name, and what is behind it. */
function NavRow({
  icon,
  label,
  meta,
  trailing,
  onClick,
  href,
  title,
}: {
  icon: AppIconType
  label: string
  meta?: ReactNode
  /** Replaces the "go in" chevron, e.g. an external-link arrow or a key hint. */
  trailing?: ReactNode
  onClick?: () => void
  href?: string
  title?: string
}) {
  const body = (
    <>
      <AppIcon icon={icon} className="size-[18px] shrink-0 text-(--muted) transition-colors group-hover:text-(--cream)" />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {meta !== undefined && <span className="shrink-0 text-[12px] tabular-nums text-(--muted)">{meta}</span>}
      {trailing ?? <AppIcon icon={ChevronRightIcon} className="size-3 shrink-0 text-(--dim) transition-colors group-hover:text-(--cream-dark)" />}
    </>
  )
  if (href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" title={title} className={navRow}>
        {body}
      </a>
    )
  }
  return (
    <button type="button" onClick={onClick} title={title} className={navRow}>
      {body}
    </button>
  )
}

function NavGroupLabel({ children }: { children: string }) {
  return <p className="px-2.5 pb-1 pt-3 text-[11px] font-medium text-(--muted)">{children}</p>
}

/** The sidebar's first screen: the sections you can go into, then the project's tools. */
function SidebarHome({ chrome, items, onSelect }: { chrome: ShellChrome; items: ActivityItem[]; onSelect: (view: PrimaryView) => void }) {
  const hasRepoLink = !!chrome.repoUrl?.startsWith("http")
  const hasScan = !!chrome.securityEnabled && !!chrome.onSecurityClick
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <nav aria-label="Sections" className="flex min-h-0 flex-1 flex-col overflow-y-auto px-2 scroll-thin">
        <NavGroupLabel>Browse</NavGroupLabel>
        {items.map((item) => (
          <NavRow key={item.id} icon={item.icon} label={item.label} meta={item.meta} onClick={() => onSelect(item.id)} title={item.shortcut ? `${item.label} (${item.shortcut})` : item.label} />
        ))}

        <NavGroupLabel>Tools</NavGroupLabel>
        <NavRow icon={SearchIcon} label="Search files" onClick={chrome.onSearch} trailing={<kbd className="shrink-0 font-sans text-[11px] text-(--muted)">/</kbd>} />
        {hasScan && (
          <NavRow
            icon={ShieldCheckIcon}
            label="Security scan"
            onClick={chrome.onSecurityClick}
            meta={chrome.securityRunning ? "Running" : undefined}
            trailing={chrome.securityRunning ? <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-primary motion-safe:animate-pulse" /> : undefined}
          />
        )}
        {hasRepoLink && (
          <NavRow icon={ArrowUpRightIcon} label="Open on GitHub" href={chrome.repoUrl} trailing={<span />} />
        )}
        <NavRow icon={CircleHelpIcon} label="Help and shortcuts" onClick={chrome.onHelp} trailing={<kbd className="shrink-0 font-sans text-[11px] text-(--muted)">?</kbd>} />
        {!!chrome.warnings?.length && (
          <div
            className="mt-2 flex items-start gap-2 rounded-[10px] bg-[color-mix(in_srgb,var(--sev-med)_12%,transparent)] px-2.5 py-2 text-[12px] leading-snug text-(--sev-med)"
            title={`${chrome.warnings.slice(0, 10).join("\n")}${chrome.warnings.length > 10 ? "\n…" : ""}`}
          >
            <AppIcon icon={TriangleAlertIcon} className="mt-px size-3.5 shrink-0" />
            {chrome.warnings.length === 1 ? "1 file could not be parsed" : `${chrome.warnings.length.toLocaleString()} files could not be parsed`}
          </div>
        )}
      </nav>

      <div className="flex shrink-0 items-center gap-1 px-2 pt-2">
        <div className="min-w-0 flex-1">
          <NavRow icon={SETTINGS_ACTIVITY.icon} label={SETTINGS_ACTIVITY.label} onClick={() => onSelect("settings")} title="Settings (⌘,)" />
        </div>
        <ThemeToggle />
      </div>
    </div>
  )
}

function SidebarColumn({
  chrome,
  items,
  activeView,
  onSelect,
  width,
  children,
}: {
  chrome: ShellChrome
  items: ActivityItem[]
  activeView: PrimaryView
  onSelect: (view: PrimaryView) => void
  width: number
  children: ReactNode
}) {
  // A single column on the window frame. Its first screen lists the sections;
  // picking one replaces the list with that section, and its header leads back.
  // Collapsed, the column becomes the ActivityBar rail.
  return (
    <aside style={{ width }} className="hidden shrink-0 flex-col overflow-hidden pb-2 md:flex">
      <SidebarHeader chrome={chrome} />
      {activeView === "home" ? (
        <SidebarHome chrome={chrome} items={items} onSelect={onSelect} />
      ) : (
        <div key={activeView} className="cc-drill-in flex min-h-0 flex-1 flex-col">{children}</div>
      )}
    </aside>
  )
}

// ── Primary Sidebar Panel Content ───────────────────────────────────────────

function PrimaryPanelContent({
  view,
  onBack,
  searchFocusKey,
  snapshot,
  explorerSnapshot,
  repoUrl,
}: {
  view: PrimaryView
  onBack: () => void
  searchFocusKey: number
  snapshot: CitySnapshot
  explorerSnapshot: CitySnapshot
  repoUrl?: string
}) {
  const searchQuery = useCityStore((s) => s.searchQuery)
  const setSearch = useCityStore((s) => s.setSearch)
  const inputRef = useRef<HTMLInputElement>(null)

  // "/" and ⌘F open Explorer with its search box focused.
  useEffect(() => {
    if (view !== "explorer" || searchFocusKey === 0) return
    const id = window.setTimeout(() => {
      inputRef.current?.focus()
      inputRef.current?.select()
    }, 50)
    return () => window.clearTimeout(id)
  }, [view, searchFocusKey])

  switch (view) {
    case "home":
      return null
    case "explorer":
      return (
        <>
          <PanelHeader onBack={onBack} title="Explorer" subtitle={`${explorerSnapshot.files.length.toLocaleString()} files`} action={<NewFileButton />} />
          <div className="shrink-0 px-2.5 pb-2 pt-0.5">
            <div className="group relative">
              <AppIcon icon={SearchIcon} className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-(--muted) transition-colors group-focus-within:text-(--cream)" />
              <input
                ref={inputRef}
                type="search"
                value={searchQuery}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Escape" && searchQuery) { e.stopPropagation(); setSearch("") } }}
                placeholder="Search files"
                aria-label="Search files"
                className="h-8 w-full rounded-[10px] border border-transparent bg-(--bg-card) pl-8 pr-8 text-[13px] text-(--cream) outline-none transition-colors placeholder:text-(--muted) focus:border-(--border-light) [&::-webkit-search-cancel-button]:hidden"
              />
              {searchQuery ? (
                <button onClick={() => setSearch("")} aria-label="Clear search" title="Clear search (Esc)" className="absolute right-1 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded-[6px] text-(--muted) transition-colors hover:text-(--cream)">
                  <AppIcon icon={XIcon} className="size-3.5" />
                </button>
              ) : (
                <kbd className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[11px] text-(--muted)">/</kbd>
              )}
            </div>
          </div>
          <div className="flex min-h-0 flex-1 flex-col">
            <FileTree snapshot={explorerSnapshot} selectionSnapshot={snapshot} filterQuery={searchQuery} />
          </div>
        </>
      )
    case "filters":
      return (
        <>
          <PanelHeader onBack={onBack} title="File types" subtitle={`${explorerSnapshot.files.length.toLocaleString()} files`} />
          <ExtensionFilter snapshot={explorerSnapshot} />
        </>
      )
    case "legend":
      return (
        <>
          <PanelHeader onBack={onBack} title="Districts" subtitle={`${snapshot.districts.length}`} />
          <DistrictLegend snapshot={snapshot} />
        </>
      )
    case "settings":
      return (
        <>
          <PanelHeader onBack={onBack} title="Settings" />
          <SettingsPanel />
        </>
      )
    case "commits":
      return (
        <>
          <PanelHeader onBack={onBack} title="Commits" />
          {repoUrl && <CommitTimeline repoUrl={repoUrl} />}
        </>
      )
  }
}

/** Top of a section: the way back to the section list, the section's name, a count, an action. */
function PanelHeader({ title, subtitle, action, onBack }: { title: string; subtitle?: string; action?: ReactNode; onBack: () => void }) {
  return (
    <div className="flex h-10 shrink-0 items-center gap-1 pl-1.5 pr-3">
      <button
        type="button"
        onClick={onBack}
        title="All sections"
        aria-label={`Back to all sections from ${title}`}
        className="group flex h-7 min-w-0 items-center gap-1 rounded-[8px] pl-1 pr-2 text-[13.5px] font-medium text-(--cream) transition-colors hover:bg-(--bg-raised)"
      >
        <AppIcon icon={ChevronLeftIcon} className="size-3.5 shrink-0 text-(--muted) transition-colors group-hover:text-(--cream)" />
        <span className="truncate">{title}</span>
      </button>
      <span className="flex-1" />
      {subtitle && <span className="text-[12px] tabular-nums text-(--muted)">{subtitle}</span>}
      {action}
    </div>
  )
}

// ── Secondary Panel (right) ─────────────────────────────────────────────────

function SecondaryPanel({ snapshot, width, onWidthChange }: { snapshot: CitySnapshot; width: number; onWidthChange: (width: number) => void }) {
  const selectedFile = useCityStore((s) => s.selectedFile)

  if (!selectedFile) return null

  return (
    <>
      <ResizeHandle side="right" width={width} onWidthChange={onWidthChange} />
      <div style={{ width }} className="hidden shrink-0 flex-col overflow-hidden md:flex">
        <SidePanel snapshot={snapshot} />
      </div>
    </>
  )
}

// ── Card top bar (the page's title and its controls) ─────────────────────

/** Everything the old card top bar held; now rendered in the sidebar. */
interface ShellChrome {
  sidebarOpen: boolean
  onToggleSidebar: () => void
  onSearch: () => void
  projectName: string
  repoUrl?: string
  actions?: ReactNode
  onSecurityClick?: () => void
  securityActive?: boolean
  securityEnabled?: boolean
  securityRunning?: boolean
  onHelp: () => void
  /** Files the analysis could not parse; listed in the sidebar when there are any. */
  warnings?: string[]
}

function SidebarToggle({ chrome }: { chrome: ShellChrome }) {
  return (
    <button
      type="button"
      className={shellIconButton}
      title={chrome.sidebarOpen ? "Hide sidebar (L)" : "Show sidebar (L)"}
      aria-label={chrome.sidebarOpen ? "Hide sidebar" : "Show sidebar"}
      aria-pressed={chrome.sidebarOpen}
      onClick={chrome.onToggleSidebar}
    >
      <AppIcon icon={PanelLeftIcon} />
    </button>
  )
}

function SecurityButton({ chrome }: { chrome: ShellChrome }) {
  if (!chrome.securityEnabled || !chrome.onSecurityClick) return null
  return (
    <button
      type="button"
      onClick={chrome.onSecurityClick}
      title={chrome.securityRunning ? "Security scan running" : "Security scan"}
      aria-label="Security scan"
      aria-pressed={!!chrome.securityActive}
      className={cn(shellIconButton, "relative aria-pressed:bg-(--bg-raised)")}
    >
      <AppIcon icon={ShieldCheckIcon} />
      {chrome.securityRunning && (
        <span aria-hidden="true" className="absolute right-1 top-1 size-1.5 rounded-full bg-primary motion-safe:animate-pulse" />
      )}
    </button>
  )
}

/**
 * Top of the open sidebar: the window-button row (sidebar toggle, back, forward
 * beside the macOS buttons), then the project's name and its actions.
 */
function SidebarHeader({ chrome }: { chrome: ShellChrome }) {
  const reserveLights = useReserveTrafficLights()
  return (
    <div className="shrink-0">
      <div
        data-tauri-drag-region
        className="flex h-[38px] items-center justify-end pr-2"
        style={{ paddingLeft: reserveLights ? 82 : 8 }}
      >
        <FrameNav>
          <SidebarToggle chrome={chrome} />
        </FrameNav>
      </div>
      <div className="flex items-center gap-2 px-3.5 pb-2 pt-1">
        <Link href="/dashboard" aria-label="All cities" title="All cities" className="shrink-0 opacity-90 transition-opacity hover:opacity-100">
          <LogoMark className="size-[18px]" />
        </Link>
        <span className="min-w-0 flex-1 truncate text-[14px] font-medium tracking-[-0.01em] text-(--cream)" title={chrome.projectName}>
          {chrome.projectName}
        </span>
        <div className="flex shrink-0 items-center">{chrome.actions}</div>
      </div>
    </div>
  )
}

// ── Canvas toolbar (floating over the city) ─────────────────────────────

const menuContent =
  "z-50 min-w-[232px] rounded-[14px] border border-(--border-pixel) bg-(--bg-card) p-1 shadow-(--shadow-lg) outline-none"
const menuItem =
  "flex cursor-pointer items-center gap-2.5 rounded-[9px] px-2 py-1.5 outline-none transition-colors data-[highlighted]:bg-(--bg-raised)"

/** A toolbar button that names the current choice and opens the list of choices. */
function ToolbarMenu<K extends string>({
  label,
  icon,
  value,
  options,
  onChange,
}: {
  label: string
  icon: AppIconType
  value: K
  options: { key: K; label: string; hint: string; shortcut?: string; icon?: AppIconType }[]
  onChange: (key: K) => void
}) {
  const current = options.find((o) => o.key === value)
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          aria-label={`${label}: ${current?.label}`}
          title={label}
          className="cc-seg-btn gap-1.5 pl-2.5 pr-2 data-[state=open]:bg-(--bg-on) data-[state=open]:text-(--cream)"
        >
          <AppIcon icon={current?.icon ?? icon} />
          <span className="hidden text-(--cream) @[520px]:inline">{current?.label}</span>
          <AppIcon icon={ChevronDownIcon} className="!size-3 text-(--muted)" />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content align="center" sideOffset={10} className={menuContent}>
          <DropdownMenu.Label className="px-2 pb-1 pt-1.5 text-[11px] font-medium text-(--muted)">{label}</DropdownMenu.Label>
          <DropdownMenu.RadioGroup value={value} onValueChange={(key) => onChange(key as K)}>
            {options.map((o) => (
              <DropdownMenu.RadioItem key={o.key} value={o.key} className={menuItem}>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="text-[13px] font-medium text-(--cream)">{o.label}</span>
                  <span className="truncate text-[11.5px] text-(--muted)">{o.hint}</span>
                </span>
                {o.shortcut && <kbd className="shrink-0 rounded-[5px] bg-(--bg-raised) px-1.5 py-px font-sans text-[11px] text-(--cream-dark)">{o.shortcut}</kbd>}
                <span className="flex size-4 shrink-0 items-center justify-center text-(--cream)">
                  <DropdownMenu.ItemIndicator>
                    <AppIcon icon={CheckIcon} className="size-3.5" />
                  </DropdownMenu.ItemIndicator>
                </span>
              </DropdownMenu.RadioItem>
            ))}
          </DropdownMenu.RadioGroup>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}

function CanvasToolbar() {
  const visualizationMode = useCityStore((s) => s.visualizationMode)
  const setMode = useCityStore((s) => s.setMode)
  const layoutMode = useCityStore((s) => s.layoutMode)
  const setLayoutMode = useCityStore((s) => s.setLayoutMode)
  const viewDimension = useCityStore((s) => s.viewDimension)
  const setViewDimension = useCityStore((s) => s.setViewDimension)
  const flat = { background: "transparent", padding: 0 }

  // One small floating pill: the view switch, then two menus that each show
  // their current choice (how files are grouped, what the colours mean).
  return (
    <div className="pointer-events-none absolute inset-x-0 top-3 z-20 flex justify-center px-3">
      <div className="pointer-events-auto flex max-w-full items-center gap-1 rounded-full border border-(--border-pixel) bg-[color-mix(in_srgb,var(--bg-card)_88%,transparent)] p-1 shadow-(--shadow-lg) backdrop-blur-md">
        <div className="cc-seg" style={flat} role="group" aria-label="View">
          {VIEWS.map(({ key, label, icon }) => (
            <button key={key} onClick={() => setViewDimension(key)} aria-pressed={viewDimension === key} aria-label={`${label} view`} title={`${label} view`} className="cc-seg-btn">
              <AppIcon icon={icon} active={viewDimension === key} />
              <span className="hidden @[640px]:inline">{label}</span>
            </button>
          ))}
        </div>
        <span className="h-4 w-px shrink-0 bg-(--border-light)" aria-hidden="true" />
        <ToolbarMenu label="Group files by" icon={FolderIcon} value={layoutMode} options={LAYOUTS} onChange={setLayoutMode} />
        <ToolbarMenu label="Colour buildings by" icon={PaletteIcon} value={visualizationMode} options={MODES} onChange={setMode} />
      </div>
    </div>
  )
}

// ── Project Shell ───────────────────────────────────────────────────────────

export function ProjectShell({ snapshot, explorerSnapshot = snapshot, projectName, projectId, projectRoot, repoUrl, navbarActions, onFilesChanged, children }: ProjectShellProps) {
  useEditorBridge(onFilesChanged)
  const [activeView, setActiveView] = useState<PrimaryView | null>("home")
  const [searchFocusKey, setSearchFocusKey] = useState(0)
  const [helpOpen, setHelpOpen] = useState(false)
  const [primaryWidth, setPrimaryWidth] = useState(260)
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

  const runSecurityScan = useCallback(async () => {
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
  }, [securityLoading, canScan, projectId, projectRoot])

  const handleSecurityClick = useCallback(() => {
    // Closing the panel never cancels a running scan; reopening shows its progress.
    if (securityOpen) {
      setSecurityOpen(false)
      return
    }
    setSecurityOpen(true)
    void runSecurityScan()
  }, [securityOpen, runSecurityScan])

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

  const openSearch = useCallback(() => {
    setActiveView("explorer")
    setSearchFocusKey((k) => k + 1)
  }, [])

  // File details and the security report share the right-hand slot: picking a
  // file brings its details back in front of an open security report.
  useEffect(() => {
    if (selectedFile) setSecurityOpen(false)
  }, [selectedFile])

  // Keyboard shortcuts for activity bar
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && !e.altKey && !e.shiftKey) {
        const key = e.key.toLowerCase()
        if (key === "e") { e.preventDefault(); handleViewChange("explorer"); return }
        if (key === "f") { e.preventDefault(); openSearch(); return }
        if (key === ",") { e.preventDefault(); handleViewChange("settings"); return }
      }
      if (isTypingTarget(e)) return
      if (e.key === "/") {
        e.preventDefault()
        openSearch()
        return
      }
      if (e.key === "?") {
        e.preventDefault()
        setHelpOpen((v) => !v)
        return
      }
      if (e.key === "l" || e.key === "L") {
        e.preventDefault()
        setActiveView((prev) => prev ? null : "home")
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [handleViewChange, openSearch])

  const showSecurityPanel = securityOpen && canScan
  const fileTypeCount = useMemo(() => new Set(explorerSnapshot.files.map((f) => getExtension(f.path))).size, [explorerSnapshot.files])
  const activities = activitiesFor(repoUrl).map((item) => ({
    ...item,
    meta:
      item.id === "explorer" ? explorerSnapshot.files.length.toLocaleString()
      : item.id === "legend" ? String(snapshot.districts.length)
      : item.id === "filters" ? String(fileTypeCount)
      : undefined,
  }))
  const chrome: ShellChrome = {
    sidebarOpen: !!activeView,
    onToggleSidebar: () => setActiveView((prev) => (prev ? null : "home")),
    onSearch: openSearch,
    projectName,
    repoUrl,
    actions: navbarActions,
    onSecurityClick: handleSecurityClick,
    securityActive: securityOpen,
    securityEnabled: canScan,
    securityRunning: securityLoading,
    onHelp: () => setHelpOpen(true),
    warnings: snapshot.warnings,
  }

  return (
    // Ghostly's frame: the rail and side panel run to the top of the window on the
    // near-black frame, and the page is a rounded card beside them, 8px from the edges.
    <div className="flex h-screen flex-col overflow-hidden bg-(--bg-deep) text-(--cream)">
      <FileDialogs />
      <HelpDialog open={helpOpen} onOpenChange={setHelpOpen} />
      <div className="flex min-h-0 flex-1">
        {/* Sidebar: one column when open, the icon rail when collapsed */}
        {activeView ? (
          <>
            <SidebarColumn chrome={chrome} items={activities} activeView={activeView} onSelect={setActiveView} width={primaryWidth}>
              <PrimaryPanelContent view={activeView} onBack={() => setActiveView("home")} searchFocusKey={searchFocusKey} snapshot={snapshot} explorerSnapshot={explorerSnapshot} repoUrl={repoUrl} />
            </SidebarColumn>
            <ResizeHandle side="left" width={primaryWidth} onWidthChange={setPrimaryWidth} />
          </>
        ) : (
          <ActivityBar chrome={chrome} items={activities} activeView={activeView} onViewChange={handleViewChange} />
        )}

        {/* The page card */}
        <section
          className="relative my-2 mr-2 flex min-w-0 flex-1 flex-col overflow-hidden rounded-[16px] border border-(--border-pixel) bg-(--bg) max-md:ml-2"
          style={{ backgroundImage: "var(--ground-lit)" }}
        >

          <div className="flex min-h-0 flex-1">
            {/* Canvas */}
            <div className="@container flex min-w-0 flex-1 flex-col overflow-hidden">
              <EditorTabStrip />
              <div className="relative flex-1 overflow-hidden">
                <CanvasToolbar />
                {children}
                <CityTooltip snapshot={snapshot} />
                <EditorPane />
              </div>
            </div>

            {/* File details; the security report takes this slot while open */}
            {!showSecurityPanel && (
              <SecondaryPanel snapshot={snapshot} width={secondaryWidth} onWidthChange={setSecondaryWidth} />
            )}
            {showSecurityPanel && (
              <>
                <ResizeHandle side="right" width={secondaryWidth} onWidthChange={setSecondaryWidth} />
                <div style={{ width: secondaryWidth }} className="hidden shrink-0 flex-col overflow-hidden md:flex">
                  <SecuritySidebar result={securityResult} loading={securityLoading} error={securityError} onRetry={canScan ? runSecurityScan : undefined} onClose={handleSecurityClose} />
                </div>
              </>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
