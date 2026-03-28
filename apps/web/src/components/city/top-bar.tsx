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
    <div
      className="fixed top-0 left-0 right-0 z-[60] bg-black/40 backdrop-blur-2xl border-b border-white/[0.07] shadow-2xl shadow-black/50"
    >
      <div className="flex items-center justify-between h-10 px-3 gap-2">
        {/* Left */}
        <div className="flex items-center gap-1.5 shrink-0 min-w-0">
          <button
            onClick={() => router.back()}
            className="flex items-center justify-center w-6 h-6 rounded-md bg-white/[0.04] border border-white/[0.06] text-white/65 hover:text-white hover:bg-white/[0.08] transition-all"
          >
            <ArrowLeft className="w-3 h-3" />
          </button>
          <Link href="/dashboard" className="flex items-center gap-1.5 text-white/85 hover:text-white transition-colors">
            <img src="/logo.png" alt="CodeCity" className="w-4 h-4 rounded-sm" />
            <span className="text-[13px] font-semibold hidden sm:inline">CodeCity</span>
          </Link>
          <span className="text-white/65 hidden sm:inline">/</span>
          <span className="font-sans text-[11px] text-white/65 truncate max-w-[80px] sm:max-w-[160px]">{projectName}</span>
        </div>

        {/* Center — hidden on xs, shown on sm+ */}
        <div className="hidden sm:flex items-center gap-1 min-w-0 overflow-x-auto scrollbar-none">
          <div className="flex items-center bg-white/[0.03] rounded-md border border-white/[0.05] p-px shrink-0">
            {LAYOUTS.map((l) => {
              const Icon = l.icon
              const active = layoutMode === l.key
              return (
                <button
                  key={l.key}
                  onClick={() => setLayoutMode(l.key)}
                  className={`flex items-center gap-1 px-2 py-1 rounded-[5px] text-[11px] font-medium transition-all ${
                    active ? "bg-primary/15 text-primary" : "text-white/75 hover:text-white/85 hover:bg-white/[0.04]"
                  }`}
                >
                  <Icon className="w-3 h-3" />
                  <span className="hidden md:inline">{l.label}</span>
                </button>
              )
            })}
          </div>

          <div className="w-px h-4 bg-white/[0.06] shrink-0" />

          <div className="flex items-center bg-white/[0.03] rounded-md border border-white/[0.05] p-px shrink-0">
            {MODES.map((m) => (
              <button
                key={m.key}
                onClick={() => setMode(m.key)}
                className={`px-2 py-1 rounded-[5px] text-[11px] font-medium transition-all ${
                  visualizationMode === m.key ? "bg-primary/15 text-primary" : "text-white/75 hover:text-white/85 hover:bg-white/[0.04]"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* Mobile center — active mode pill only, tap cycles through */}
        <div className="flex sm:hidden items-center gap-1 shrink-0">
          <button
            onClick={() => {
              const idx = LAYOUTS.findIndex((l) => l.key === layoutMode)
              setLayoutMode(LAYOUTS[(idx + 1) % LAYOUTS.length].key)
            }}
            className="flex items-center gap-1 px-2 py-1 rounded-md bg-white/[0.03] border border-white/[0.05] text-[11px] font-medium text-primary"
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
            className="px-2 py-1 rounded-md bg-primary/15 border border-primary/20 text-[11px] font-medium text-primary"
          >
            {MODES.find((m) => m.key === visualizationMode)?.label}
          </button>
        </div>

        {/* Right */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Search — hidden on mobile, shown sm+ */}
          <div className="relative group hidden sm:block">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-white/45 pointer-events-none group-focus-within:text-white/65 transition-colors" />
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search /"
              aria-label="Search files"
              className="bg-white/[0.04] border border-white/[0.06] rounded-md pl-7 pr-2 py-1 text-[11px] text-white/80 placeholder:text-white/45 outline-none focus:border-white/15 focus:bg-white/[0.06] transition-all w-[100px] focus:w-[160px]"
            />
            {searchQuery && (
              <button onClick={() => setSearch("")} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-white/65 hover:text-white/75 transition-colors">
                <X className="w-2.5 h-2.5" />
              </button>
            )}
          </div>

          {/* Mobile search icon only */}
          <button
            onClick={() => { setMobileSearchOpen((v) => !v); setTimeout(() => mobileInputRef.current?.focus(), 50) }}
            className={`flex sm:hidden items-center justify-center w-7 h-7 rounded-md border border-white/[0.05] transition-all ${
              mobileSearchOpen || searchQuery ? "bg-primary/15 text-primary border-primary/20" : "bg-white/[0.03] text-white/55"
            }`}
            aria-label="Search"
          >
            <Search className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={toggleLeftPanel}
            aria-label={leftPanelCollapsed ? "Show file tree" : "Hide file tree"}
            className={`flex items-center justify-center w-7 h-7 rounded-md border border-white/[0.05] transition-all ${
              leftPanelCollapsed ? "bg-white/[0.03] text-white/55 hover:text-white/75 hover:bg-white/[0.05]" : "bg-primary/15 text-primary border-primary/20"
            }`}
          >
            <PanelLeft className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Mobile search bar — only shown when toggled */}
      {(mobileSearchOpen || searchQuery) && (
        <div className="sm:hidden px-3 pb-2 -mt-0.5">
          <div className="relative group">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-white/45 pointer-events-none group-focus-within:text-white/65 transition-colors" />
            <input
              ref={mobileInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearch(e.target.value)}
              onBlur={() => { if (!searchQuery) setMobileSearchOpen(false) }}
              placeholder="Search files..."
              aria-label="Search files"
              className="w-full bg-white/[0.04] border border-white/[0.06] rounded-md pl-7 pr-7 py-1.5 text-[11px] text-white/80 placeholder:text-white/45 outline-none focus:border-white/15 focus:bg-white/[0.06] transition-all"
            />
            {searchQuery && (
              <button onClick={() => { setSearch(""); setMobileSearchOpen(false) }} className="absolute right-2 top-1/2 -translate-y-1/2 text-white/65 hover:text-white/75 transition-colors">
                <X className="w-2.5 h-2.5" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
