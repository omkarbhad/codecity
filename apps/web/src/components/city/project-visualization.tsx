"use client"

import { Component, type ErrorInfo, type ReactNode, useState, useEffect, useRef, useCallback } from "react"
import dynamic from "next/dynamic"
import type { CitySnapshot, LayoutMode } from "@/lib/types/city"
import { recomputeSnapshot } from "@/lib/analysis/layout"
import { getExtension } from "./extension-filter"
import { useCityStore, isPathHidden } from "./use-city-store"
import { TopBar } from "./top-bar"
import { LeftPanel } from "./left-panel"
import { SidePanel } from "./side-panel"
import { BottomBar } from "./bottom-bar"
import { CityTooltip } from "./city-tooltip"

const CitySceneCanvas = dynamic(
  () => import("./city-scene").then((mod) => ({ default: mod.CitySceneCanvas })),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center bg-[#040408]">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-primary" />
            <div className="absolute inset-0 h-8 w-8 animate-ping rounded-full border border-primary/20" />
          </div>
          <p className="font-mono text-xs text-white/30">Constructing city...</p>
        </div>
      </div>
    ),
  }
)

class SceneErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: ReactNode }) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("3D Scene Error:", error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-full w-full items-center justify-center bg-[#040408]">
          <div className="flex flex-col items-center gap-4 max-w-md text-center px-6">
            <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center">
              <span className="text-red-400 text-xl">!</span>
            </div>
            <h3 className="font-mono text-sm text-white">Scene failed to render</h3>
            <p className="font-mono text-xs text-white/40">
              {this.state.error?.message ?? "An unexpected error occurred in the 3D visualization."}
            </p>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 font-mono text-xs text-white/60 hover:text-white hover:bg-white/10 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

interface Props {
  snapshot: CitySnapshot
  projectName: string
}

function ProjectVisualizationInner({ snapshot: originalSnapshot, projectName }: Props) {
  const [currentSnapshot, setCurrentSnapshot] = useState(originalSnapshot)
  const originalRef = useRef(originalSnapshot)
  const hiddenPaths = useCityStore((s) => s.hiddenPaths)
  const hiddenExtensions = useCityStore((s) => s.hiddenExtensions)
  const layoutMode = useCityStore((s) => s.layoutMode)
  const leftPanelCollapsed = useCityStore((s) => s.leftPanelCollapsed)
  const showShortcutsOverlay = useCityStore((s) => s.showShortcutsOverlay)
  const toggleShortcutsOverlay = useCityStore((s) => s.toggleShortcutsOverlay)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const prevLayoutRef = useRef<LayoutMode>(layoutMode)
  const [isTransitioning, setIsTransitioning] = useState(false)

  // Update original ref if prop changes
  useEffect(() => {
    originalRef.current = originalSnapshot
    setCurrentSnapshot(originalSnapshot)
  }, [originalSnapshot])

  const recompute = useCallback((mode: LayoutMode) => {
    if (originalRef.current.files.length === 0) return

    const hasFilters = hiddenPaths.size > 0 || hiddenExtensions.size > 0

    if (!hasFilters && mode === "folder") {
      setCurrentSnapshot(originalRef.current)
      return
    }

    const newSnapshot = recomputeSnapshot(
      originalRef.current,
      hiddenPaths,
      hiddenExtensions,
      getExtension,
      isPathHidden,
      mode
    )
    setCurrentSnapshot(newSnapshot)
  }, [hiddenPaths, hiddenExtensions])

  // Auto-recompute layout when filters change (debounced 350ms)
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    debounceRef.current = setTimeout(() => {
      recompute(layoutMode)
    }, 350)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [hiddenPaths, hiddenExtensions, recompute, layoutMode])

  // Immediate re-layout on layout mode change with transition
  useEffect(() => {
    if (prevLayoutRef.current !== layoutMode) {
      prevLayoutRef.current = layoutMode
      setIsTransitioning(true)
      // Small delay for visual feedback
      setTimeout(() => {
        recompute(layoutMode)
        setTimeout(() => setIsTransitioning(false), 300)
      }, 50)
    }
  }, [layoutMode, recompute])

  const setMode = useCityStore((s) => s.setMode)
  const toggleBuildingLabels = useCityStore((s) => s.toggleBuildingLabels)

  // Global keyboard shortcuts: ?, 1-5 (viz modes), B (building labels)
  useEffect(() => {
    const MODE_KEYS: Record<string, import("./use-city-store").VisualizationMode> = {
      "1": "dependencies",
      "2": "complexity",
      "3": "unused",
      "4": "filesize",
      "5": "types",
    }

    function handleKeyDown(e: KeyboardEvent) {
      if ((e.target as HTMLElement).tagName === "INPUT") return
      if (e.key === "?") {
        e.preventDefault()
        toggleShortcutsOverlay()
        return
      }
      // Number keys 1-5: switch visualization mode
      if (MODE_KEYS[e.key]) {
        e.preventDefault()
        setMode(MODE_KEYS[e.key])
        return
      }
      // B key: toggle building labels
      if (e.key === "b" || e.key === "B") {
        e.preventDefault()
        toggleBuildingLabels()
        return
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [toggleShortcutsOverlay, setMode, toggleBuildingLabels])

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#040408]" role="application" aria-label={`CodeCity 3D visualization of ${projectName}`}>
      <div className="sr-only" role="status" aria-live="polite">
        Interactive 3D city visualization. Use the file tree on the left to browse files.
        Press Escape to deselect the current file. Press R to reset camera. WASD to pan.
      </div>

      <TopBar projectName={projectName} />

      <LeftPanel snapshot={currentSnapshot} collapsed={leftPanelCollapsed} />

      <div className={`absolute inset-0 transition-opacity duration-300 ${isTransitioning ? "opacity-60" : "opacity-100"}`} aria-hidden="true">
        <SceneErrorBoundary>
          <CitySceneCanvas snapshot={currentSnapshot} />
        </SceneErrorBoundary>
      </div>

      <SidePanel snapshot={currentSnapshot} />
      <BottomBar stats={currentSnapshot.stats} warnings={currentSnapshot.warnings} />
      <CityTooltip snapshot={currentSnapshot} />

      {/* Shortcuts overlay */}
      {showShortcutsOverlay && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={toggleShortcutsOverlay}
        >
          <div
            className="glass-panel p-6 max-w-lg w-full mx-4 animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-mono text-sm text-white font-semibold">Keyboard Shortcuts</h2>
              <button onClick={toggleShortcutsOverlay} className="text-white/40 hover:text-white transition-colors text-xs font-mono">ESC</button>
            </div>
            <div className="grid grid-cols-2 gap-x-8 gap-y-2">
              {[
                ["Left Click", "Select building"],
                ["Left Drag", "Pan camera"],
                ["Right Drag", "Orbit / Rotate"],
                ["Scroll", "Zoom in/out"],
                ["W A S D", "Pan camera"],
                ["R", "Reset camera view"],
                ["1 - 5", "Switch viz mode"],
                ["Tab", "Next file in district"],
                ["Shift+Tab", "Previous file"],
                ["/ (slash)", "Focus search"],
                ["B", "Toggle building labels"],
                ["Escape", "Deselect / close"],
                ["? (question)", "Toggle this overlay"],
                ["L", "Toggle left panel"],
              ].map(([key, desc]) => (
                <div key={key} className="flex items-center gap-3 py-1">
                  <kbd className="px-2 py-0.5 rounded bg-white/[0.08] border border-white/[0.12] font-mono text-[10px] text-white/70 min-w-[60px] text-center">{key}</kbd>
                  <span className="font-mono text-[11px] text-white/50">{desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Layout transition overlay */}
      {isTransitioning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
          <div className="flex items-center gap-3 glass-panel px-5 py-3 animate-pulse">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/10 border-t-primary" />
            <span className="font-mono text-xs text-white/50">Rebuilding layout...</span>
          </div>
        </div>
      )}
    </div>
  )
}

export function ProjectVisualization(props: Props) {
  return <ProjectVisualizationInner {...props} />
}
