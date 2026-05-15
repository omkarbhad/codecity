"use client"

import { useRef, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, FolderTree, FileCode, Brain, X, Search, PanelLeft } from "lucide-react"
import { useCityStore } from "./use-city-store"
import type { VisualizationMode } from "./use-city-store"
import type { LayoutMode } from "@/lib/types/city"

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

interface TopBarProps {
  projectName: string
}

export function TopBar({ projectName }: TopBarProps) {
  const router = useRouter()
  const visualizationMode = useCityStore((s) => s.visualizationMode)
  const setMode = useCityStore((s) => s.setMode)
  const layoutMode = useCityStore((s) => s.layoutMode)
  const setLayoutMode = useCityStore((s) => s.setLayoutMode)
  const searchQuery = useCityStore((s) => s.searchQuery)
  const setSearch = useCityStore((s) => s.setSearch)
  const toggleLeftPanel = useCityStore((s) => s.toggleLeftPanel)
  const leftPanelCollapsed = useCityStore((s) => s.leftPanelCollapsed)
  const inputRef = useRef<HTMLInputElement>(null)
  const mobileInputRef = useRef<HTMLInputElement>(null)
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.target as HTMLElement).tagName === "INPUT") {
        if (e.key === "Escape") {
          inputRef.current?.blur()
          mobileInputRef.current?.blur()
          setSearch("")
          setMobileSearchOpen(false)
        }
        return
      }
      if (e.key === "/") { e.preventDefault(); inputRef.current?.focus() }
      if (e.key === "l" || e.key === "L") toggleLeftPanel()
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [setSearch, toggleLeftPanel])

  return (
    <div className="fixed top-0 left-0 right-0 z-[60] border-b-2 border-(--border-pixel) bg-(--bg-deep)">
      <div className="flex items-center justify-between h-10 px-3 gap-2">
        {/* Left — breadcrumb shell */}
        <div className="flex items-center gap-2 shrink-0 min-w-0">
          <button
            onClick={() => router.back()}
            aria-label="Back"
            className="flex h-6 w-6 items-center justify-center rounded-none border-2 border-(--border-pixel) bg-(--bg-raised) text-(--cream-dark) transition-colors hover:border-(--border-light) hover:text-(--cream)"
          >
            <ArrowLeft className="size-3" />
          </button>
          <Link href="/dashboard" className="flex items-center gap-1.5 text-(--cream) transition-colors hover:text-primary">
            <img src="/logo.png" alt="CodeCity" className="size-4 rounded-none border-2 border-(--border-pixel)" />
            <span className="hidden font-mono text-[11px] font-semibold uppercase tracking-[0.05em] sm:inline">CodeCity</span>
          </Link>
          <span className="hidden font-mono text-(--dim) sm:inline">/</span>
          <span className="truncate max-w-[80px] font-mono text-[11px] text-(--cream-dark) sm:max-w-[160px]">{projectName}</span>
        </div>

        {/* Center — pill groups */}
        <div className="hidden sm:flex items-center gap-2 min-w-0 overflow-x-auto scrollbar-none">
          <div className="flex shrink-0 items-center border-2 border-(--border-pixel) bg-(--bg-card)">
            {LAYOUTS.map((l) => {
              const Icon = l.icon
              const active = layoutMode === l.key
              return (
                <button
                  key={l.key}
                  onClick={() => setLayoutMode(l.key)}
                  className={`flex items-center gap-1 px-2 py-1 font-mono text-[10px] font-medium uppercase tracking-[0.05em] transition-colors ${
                    active
                      ? "bg-primary text-[#0d0d0f]"
                      : "text-(--cream-dark) hover:bg-(--bg-raised) hover:text-(--cream)"
                  }`}
                >
                  <Icon className="size-3" />
                  <span className="hidden md:inline">{l.label}</span>
                </button>
              )
            })}
          </div>

          <div className="flex shrink-0 items-center border-2 border-(--border-pixel) bg-(--bg-card)">
            {MODES.map((m) => (
              <button
                key={m.key}
                onClick={() => setMode(m.key)}
                className={`px-2 py-1 font-mono text-[10px] font-medium uppercase tracking-[0.05em] transition-colors ${
                  visualizationMode === m.key
                    ? "bg-primary text-[#0d0d0f]"
                    : "text-(--cream-dark) hover:bg-(--bg-raised) hover:text-(--cream)"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* Mobile center — single tap-to-cycle pill per group */}
        <div className="flex sm:hidden items-center gap-1 shrink-0">
          <button
            onClick={() => {
              const idx = LAYOUTS.findIndex((l) => l.key === layoutMode)
              setLayoutMode(LAYOUTS[(idx + 1) % LAYOUTS.length].key)
            }}
            className="flex items-center gap-1 border-2 border-[#0d0d0f] bg-primary px-2 py-1 font-mono text-[10px] font-medium uppercase tracking-[0.05em] text-[#0d0d0f]"
          >
            {(() => {
              const ActiveIcon = LAYOUTS.find((l) => l.key === layoutMode)!.icon
              return <ActiveIcon className="size-3" />
            })()}
          </button>
          <button
            onClick={() => {
              const idx = MODES.findIndex((m) => m.key === visualizationMode)
              setMode(MODES[(idx + 1) % MODES.length].key)
            }}
            className="border-2 border-[#0d0d0f] bg-primary px-2 py-1 font-mono text-[10px] font-medium uppercase tracking-[0.05em] text-[#0d0d0f]"
          >
            {MODES.find((m) => m.key === visualizationMode)?.label}
          </button>
        </div>

        {/* Right */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Search — sm+ */}
          <div className="relative group hidden sm:block">
            <Search className="pointer-events-none absolute left-2 top-1/2 size-3 -translate-y-1/2 text-(--muted) transition-colors group-focus-within:text-primary" />
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="search /"
              aria-label="Search files"
              className="w-[100px] rounded-none border-2 border-(--border-pixel) bg-(--bg-card) py-1 pl-7 pr-2 font-mono text-[11px] text-(--cream) outline-none placeholder:text-(--dim) transition-all focus:w-[180px] focus:border-primary"
            />
            {searchQuery && (
              <button onClick={() => setSearch("")} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-(--muted) transition-colors hover:text-(--cream)">
                <X className="size-2.5" />
              </button>
            )}
          </div>

          {/* Mobile search icon */}
          <button
            onClick={() => { setMobileSearchOpen((v) => !v); setTimeout(() => mobileInputRef.current?.focus(), 50) }}
            className={`flex sm:hidden h-7 w-7 items-center justify-center rounded-none border-2 transition-colors ${
              mobileSearchOpen || searchQuery
                ? "border-[#0d0d0f] bg-primary text-[#0d0d0f]"
                : "border-(--border-pixel) bg-(--bg-raised) text-(--cream-dark)"
            }`}
            aria-label="Search"
          >
            <Search className="size-3.5" />
          </button>

          <button
            onClick={toggleLeftPanel}
            aria-label={leftPanelCollapsed ? "Show file tree" : "Hide file tree"}
            className={`flex h-7 w-7 items-center justify-center rounded-none border-2 transition-colors ${
              leftPanelCollapsed
                ? "border-(--border-pixel) bg-(--bg-raised) text-(--cream-dark) hover:border-(--border-light) hover:text-(--cream)"
                : "border-[#0d0d0f] bg-primary text-[#0d0d0f]"
            }`}
          >
            <PanelLeft className="size-3.5" />
          </button>
        </div>
      </div>

      {/* Mobile search bar */}
      {(mobileSearchOpen || searchQuery) && (
        <div className="sm:hidden border-t-2 border-dashed border-(--border-pixel) px-3 py-2">
          <div className="relative group">
            <Search className="pointer-events-none absolute left-2 top-1/2 size-3 -translate-y-1/2 text-(--muted) transition-colors group-focus-within:text-primary" />
            <input
              ref={mobileInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearch(e.target.value)}
              onBlur={() => { if (!searchQuery) setMobileSearchOpen(false) }}
              placeholder="search files…"
              aria-label="Search files"
              className="w-full rounded-none border-2 border-(--border-pixel) bg-(--bg-card) py-1.5 pl-7 pr-7 font-mono text-[11px] text-(--cream) outline-none placeholder:text-(--dim) transition-colors focus:border-primary"
            />
            {searchQuery && (
              <button onClick={() => { setSearch(""); setMobileSearchOpen(false) }} className="absolute right-2 top-1/2 -translate-y-1/2 text-(--muted) transition-colors hover:text-(--cream)">
                <X className="size-2.5" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
