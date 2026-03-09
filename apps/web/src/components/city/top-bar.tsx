"use client"

import { useRef, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, FolderTree, FileCode, Brain, X } from "lucide-react"
import { useCityStore } from "./use-city-store"
import type { VisualizationMode } from "./use-city-store"
import type { LayoutMode } from "@/lib/types/city"

const MODES: { key: VisualizationMode; label: string; shortcut: string }[] = [
  { key: "dependencies", label: "Deps", shortcut: "1" },
  { key: "complexity", label: "Complexity", shortcut: "2" },
  { key: "unused", label: "Unused", shortcut: "3" },
  { key: "filesize", label: "Size", shortcut: "4" },
  { key: "types", label: "Types", shortcut: "5" },
]

const LAYOUTS: { key: LayoutMode; label: string; icon: typeof FolderTree; description: string }[] = [
  { key: "folder", label: "Folder", icon: FolderTree, description: "Group by directory" },
  { key: "extension", label: "Extension", icon: FileCode, description: "Group by file type" },
  { key: "semantic", label: "Semantic", icon: Brain, description: "Cluster by coupling" },
]

const LEGEND_ITEMS = [
  { icon: "\u25AE", label: "Building height", desc: "Lines of code", color: "#38f0ff" },
  { icon: "\u25AC", label: "Building width", desc: "Number of functions", color: "#4aeaab" },
  { icon: "\u2501", label: "Floor lines", desc: "Individual functions", color: "#ffffff" },
  { icon: "\u25AD", label: "Platform base", desc: "Large file (200+ lines)", color: "#6ab0ff" },
  { icon: "\u2502", label: "Red antenna", desc: "High complexity (20+)", color: "#ff5050" },
  { icon: "\u2312", label: "Blue dome", desc: "React component", color: "#4d94ff" },
  { icon: "\u25CB", label: "Golden ring", desc: "Rich types (3+)", color: "#ffd34e" },
  { icon: "\u25A3", label: "District ground", desc: "Top-level directory", color: "#b99eff" },
  { icon: "\u25AA", label: "Sub-district", desc: "Nested subfolder", color: "#9daeff" },
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
  const [legendOpen, setLegendOpen] = useState(false)
  const legendRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.target as HTMLElement).tagName === "INPUT") {
        if (e.key === "Escape") {
          inputRef.current?.blur()
          setSearch("")
        }
        return
      }
      if (e.key === "/") {
        e.preventDefault()
        inputRef.current?.focus()
      }
      if (e.key === "l" || e.key === "L") {
        toggleLeftPanel()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [setSearch, toggleLeftPanel])

  // Close legend on click outside
  useEffect(() => {
    if (!legendOpen) return
    function handleClick(e: MouseEvent) {
      if (legendRef.current && !legendRef.current.contains(e.target as Node)) {
        setLegendOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [legendOpen])

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-[#09090b]/92 backdrop-blur-xl border-b border-white/[0.06]">
      <div className="flex items-center justify-between px-4 py-2 gap-3">
        {/* Left: Back + Logo + Repo */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => router.push("/dashboard")}
            className="flex items-center justify-center w-7 h-7 rounded-lg bg-white/[0.05] border border-white/[0.08] text-white/50 hover:text-white hover:bg-white/[0.1] transition-all"
            title="Back to Dashboard"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
          </button>
          <Link href="/dashboard" className="flex items-center gap-1.5 text-white/80 hover:text-white transition-colors">
            <svg className="w-4 h-4 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 21h18M3 7v14M21 7v14M6 7V3h4v4M14 7V3h4v4M9 21v-4h6v4" />
            </svg>
            <span className="font-mono text-[10px] font-bold tracking-wider hidden sm:inline">CodeCity</span>
          </Link>
          <span className="text-white/10 hidden sm:inline">|</span>
          <span className="font-mono text-[10px] text-white/50 bg-white/[0.04] px-2 py-0.5 rounded border border-white/[0.06] truncate max-w-[180px]">
            {projectName}
          </span>
        </div>

        {/* Center: Layout + Divider + Mode selectors */}
        <div className="flex items-center gap-2">
          {/* Layout selector */}
          <div className="flex items-center gap-0.5 bg-white/[0.03] backdrop-blur-xl rounded-lg border border-white/[0.06] p-0.5">
            {LAYOUTS.map((l) => {
              const Icon = l.icon
              const isActive = layoutMode === l.key
              return (
                <button
                  key={l.key}
                  onClick={() => setLayoutMode(l.key)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[10px] font-mono transition-all duration-200 group relative ${
                    isActive
                      ? "bg-primary/15 text-primary border border-primary/20 shadow-sm shadow-primary/10"
                      : "text-white/50 hover:text-white/75 hover:bg-white/[0.06]"
                  }`}
                  title={l.description}
                >
                  <Icon className="w-3 h-3" />
                  <span className="hidden md:inline">{l.label}</span>
                </button>
              )
            })}
          </div>

          <div className="w-px h-5 bg-white/[0.06]" />

          {/* Visualization mode selector */}
          <div className="flex items-center gap-0.5 bg-white/[0.03] backdrop-blur-xl rounded-lg border border-white/[0.06] p-0.5">
            {MODES.map((m) => (
              <button
                key={m.key}
                onClick={() => setMode(m.key)}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[10px] font-mono transition-all duration-200 ${
                  visualizationMode === m.key
                    ? "bg-primary/15 text-primary border border-primary/20 shadow-sm shadow-primary/10"
                    : "text-white/50 hover:text-white/75 hover:bg-white/[0.06]"
                }`}
                title={`${m.label} (${m.shortcut})`}
              >
                {m.label}
                <span className={`text-[8px] ${visualizationMode === m.key ? "text-white/60" : "text-white/20"}`}>{m.shortcut}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Right: Search + Legend + Panel toggle */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="relative group">
            <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-white/25 pointer-events-none group-focus-within:text-white/50 transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search  /"
              className="search-expand bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] rounded-lg pl-8 pr-3 py-1.5 font-mono text-[10px] text-white placeholder:text-white/25 outline-none focus:border-white/15 focus:bg-white/[0.05] transition-all w-[120px] focus:w-[180px]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-0.5 bg-white/[0.03] backdrop-blur-xl rounded-lg border border-white/[0.06] p-0.5">
            {/* Legend toggle */}
            <div ref={legendRef} className="relative">
              <button
                onClick={() => setLegendOpen(!legendOpen)}
                className={`flex items-center justify-center w-7 h-7 rounded-md transition-all ${
                  legendOpen
                    ? "bg-primary/15 text-primary"
                    : "text-white/40 hover:text-white/70 hover:bg-white/[0.06]"
                }`}
                title="Legend"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 7V5a2 2 0 0 1 2-2h2" />
                  <path d="M17 3h2a2 2 0 0 1 2 2v2" />
                  <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
                  <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
                  <rect x="7" y="7" width="10" height="10" rx="1" />
                </svg>
              </button>

              {legendOpen && (
                <div className="absolute top-full right-0 mt-2 w-64 backdrop-blur-xl bg-[#09090b]/92 border border-white/[0.08] rounded-lg p-3 shadow-2xl z-50">
                  <p className="text-[10px] font-mono text-white/40 uppercase tracking-wider mb-2">
                    Visual Guide
                  </p>
                  <div className="space-y-1.5">
                    {LEGEND_ITEMS.map((item) => (
                      <div key={item.label} className="flex items-center gap-2">
                        <span
                          className="w-5 text-center text-sm font-mono shrink-0"
                          style={{ color: item.color }}
                        >
                          {item.icon}
                        </span>
                        <div className="flex-1 min-w-0">
                          <span className="text-[11px] text-white/80 font-medium">{item.label}</span>
                          <span className="text-[10px] text-white/40 ml-1.5">{item.desc}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Panel toggle */}
            <button
              onClick={toggleLeftPanel}
              className={`flex items-center justify-center w-7 h-7 rounded-md transition-all ${
                leftPanelCollapsed
                  ? "text-white/40 hover:text-white/70 hover:bg-white/[0.06]"
                  : "bg-primary/15 text-primary"
              }`}
              title={`${leftPanelCollapsed ? "Show" : "Hide"} panel (L)`}
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <path d="M9 3v18" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
