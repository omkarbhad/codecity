"use client"

import { Component, type ErrorInfo, type ReactNode, useState, useEffect, useRef, useCallback } from "react"
import dynamic from "next/dynamic"
import type { CitySnapshot, LayoutMode } from "@/lib/types/city"
import { recomputeSnapshot } from "@/lib/tauri"
import { useCityStore } from "./use-city-store"
import { ProjectShell } from "./project-shell"
import { Loader } from "@/components/ui/loader"
import type { BuildingLoadProgress } from "./instanced-buildings"

const CitySceneCanvas = dynamic(
  () => import("./city-scene").then((mod) => ({ default: mod.CitySceneCanvas })),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center bg-[#040408]">
        <Loader size="md" text="Constructing city..." />
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
            <h3 className="font-sans text-sm text-white">Scene failed to render</h3>
            <p className="font-sans text-xs text-white/40">
              {this.state.error?.message ?? "An unexpected error occurred in the 3D visualization."}
            </p>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 font-sans text-xs text-white/60 hover:text-white hover:bg-white/10 transition-colors"
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
  repoUrl?: string
  navbarActions?: ReactNode
}

function BuildingLoadStrip({ progress, leaving }: { progress: BuildingLoadProgress; leaving: boolean }) {
  const totalRectangles = Math.min(28, progress.totalChunks)
  const loadedRectangles = Math.round((progress.loadedChunks / progress.totalChunks) * totalRectangles)
  const percent = Math.round((progress.loadedFiles / progress.totalFiles) * 100)

  return (
    <div
      className={`pointer-events-none absolute bottom-4 left-1/2 z-40 w-[min(440px,calc(100%-32px))] -translate-x-1/2 rounded-md border border-white/[0.09] bg-[#0b0b0c]/90 px-3 py-2.5 shadow-2xl shadow-black/45 backdrop-blur-xl transition-all duration-300 ${
        leaving ? "translate-y-1 opacity-0" : "opacity-100"
      }`}
    >
      <div className="mb-2.5 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="grid size-5 shrink-0 grid-cols-2 gap-[2px] rounded border border-white/[0.08] bg-white/[0.035] p-[3px]">
            <span className="rounded-[1px] bg-primary/70" />
            <span className="rounded-[1px] bg-white/[0.18]" />
            <span className="rounded-[1px] bg-white/[0.14]" />
            <span className="rounded-[1px] bg-primary/45" />
          </span>
          <span className="truncate text-[11px] font-medium text-white/62">Loading city geometry</span>
        </div>
        <span className="shrink-0 font-mono text-[10px] tabular-nums text-white/48">
          {percent}% · {progress.loadedFiles.toLocaleString()} / {progress.totalFiles.toLocaleString()}
        </span>
      </div>
      <div className="grid h-[7px] grid-flow-col gap-[3px]">
        {Array.from({ length: totalRectangles }).map((_, index) => (
          <span
            key={index}
            className={`rounded-[2px] transition-colors duration-200 ${
              index < loadedRectangles ? "bg-primary/75 shadow-[0_0_8px_rgba(59,130,246,0.34)]" : "bg-white/[0.07]"
            }`}
          />
        ))}
      </div>
    </div>
  )
}

function ProjectVisualizationInner({ snapshot: originalSnapshot, projectName, repoUrl, navbarActions }: Props) {
  const [currentSnapshot, setCurrentSnapshot] = useState(originalSnapshot)
  const [buildingLoadProgress, setBuildingLoadProgress] = useState<BuildingLoadProgress | null>(null)
  const [isBuildingLoadLeaving, setIsBuildingLoadLeaving] = useState(false)
  const originalRef = useRef(originalSnapshot)
  const hiddenPaths = useCityStore((s) => s.hiddenPaths)
  const hiddenExtensions = useCityStore((s) => s.hiddenExtensions)
  const layoutMode = useCityStore((s) => s.layoutMode)
  const setRepoUrl = useCityStore((s) => s.setRepoUrl)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const prevLayoutRef = useRef<LayoutMode>(layoutMode)
  const transitionStartRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const transitionEndRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const didMountFiltersRef = useRef(false)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const loadHideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Update original ref if prop changes
  useEffect(() => {
    originalRef.current = originalSnapshot
    setCurrentSnapshot(originalSnapshot)
    setBuildingLoadProgress(null)
    setIsBuildingLoadLeaving(false)
    if (loadHideTimerRef.current) clearTimeout(loadHideTimerRef.current)
  }, [originalSnapshot])

  useEffect(() => {
    if (repoUrl) setRepoUrl(repoUrl)
  }, [repoUrl, setRepoUrl])

  const recompute = useCallback(async (mode: LayoutMode) => {
    if (originalRef.current.files.length === 0) return

    const hasFilters = hiddenPaths.size > 0 || hiddenExtensions.size > 0

    if (!hasFilters && mode === "folder") {
      setCurrentSnapshot(originalRef.current)
      return
    }

    const newSnapshot = await recomputeSnapshot(
      originalRef.current,
      Array.from(hiddenPaths),
      Array.from(hiddenExtensions),
      mode
    )
    setCurrentSnapshot(newSnapshot)
  }, [hiddenPaths, hiddenExtensions])

  // Auto-recompute layout when filters change (debounced 350ms)
  useEffect(() => {
    if (!didMountFiltersRef.current) {
      didMountFiltersRef.current = true
      return
    }

    if (debounceRef.current) clearTimeout(debounceRef.current)

    debounceRef.current = setTimeout(() => {
      void recompute(layoutMode)
    }, 350)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [hiddenPaths, hiddenExtensions, recompute])

  // Immediate re-layout on layout mode change with transition
  useEffect(() => {
    if (prevLayoutRef.current !== layoutMode) {
      prevLayoutRef.current = layoutMode
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
        debounceRef.current = null
      }
      if (transitionStartRef.current) clearTimeout(transitionStartRef.current)
      if (transitionEndRef.current) clearTimeout(transitionEndRef.current)
      setIsTransitioning(true)

      // Small delay for visual feedback
      transitionStartRef.current = setTimeout(() => {
        void recompute(layoutMode)
        transitionEndRef.current = setTimeout(() => setIsTransitioning(false), 300)
      }, 50)
    }

    return () => {
      if (transitionStartRef.current) clearTimeout(transitionStartRef.current)
      if (transitionEndRef.current) clearTimeout(transitionEndRef.current)
    }
  }, [layoutMode, recompute])

  const setMode = useCityStore((s) => s.setMode)
  const toggleBuildingLabels = useCityStore((s) => s.toggleBuildingLabels)

  const handleBuildingLoadProgress = useCallback((progress: BuildingLoadProgress | null) => {
    if (loadHideTimerRef.current) {
      clearTimeout(loadHideTimerRef.current)
      loadHideTimerRef.current = null
    }

    if (!progress) {
      setIsBuildingLoadLeaving(true)
      loadHideTimerRef.current = setTimeout(() => {
        setBuildingLoadProgress(null)
        setIsBuildingLoadLeaving(false)
        loadHideTimerRef.current = null
      }, 260)
      return
    }

    setBuildingLoadProgress(progress)

    if (progress.complete) {
      loadHideTimerRef.current = setTimeout(() => {
        setIsBuildingLoadLeaving(true)
        loadHideTimerRef.current = setTimeout(() => {
          setBuildingLoadProgress(null)
          setIsBuildingLoadLeaving(false)
          loadHideTimerRef.current = null
        }, 260)
      }, 220)
      return
    }

    setIsBuildingLoadLeaving(false)
  }, [])

  useEffect(() => {
    return () => {
      if (loadHideTimerRef.current) clearTimeout(loadHideTimerRef.current)
    }
  }, [])

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
  }, [setMode, toggleBuildingLabels])

  return (
    <div role="application" aria-label={`CodeCity 3D visualization of ${projectName}`}>
      <div className="sr-only" role="status" aria-live="polite">
        Interactive 3D city visualization. Use the file tree on the left to browse files.
        Press Escape to deselect the current file. Press R to reset camera. WASD to pan.
      </div>

      <ProjectShell snapshot={currentSnapshot} projectName={projectName} repoUrl={repoUrl} navbarActions={navbarActions}>
        <div className={`absolute inset-0 transition-opacity duration-300 ${isTransitioning ? "opacity-60" : "opacity-100"}`} aria-hidden="true">
          <SceneErrorBoundary>
            <CitySceneCanvas snapshot={currentSnapshot} onBuildingLoadProgress={handleBuildingLoadProgress} />
          </SceneErrorBoundary>
        </div>

        {buildingLoadProgress && <BuildingLoadStrip progress={buildingLoadProgress} leaving={isBuildingLoadLeaving} />}

        {/* Layout transition overlay */}
        {isTransitioning && (
          <div className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none">
            <div className="bg-black/40 backdrop-blur-2xl border border-white/[0.07] rounded-lg shadow-2xl shadow-black/50 px-5 py-3">
              <Loader size="sm" text="Rebuilding layout..." />
            </div>
          </div>
        )}
      </ProjectShell>
    </div>
  )
}

export function ProjectVisualization(props: Props) {
  return <ProjectVisualizationInner {...props} />
}
