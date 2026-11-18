"use client"

import { create } from "zustand"
import type { LayoutMode } from "@/lib/types/city"

export type VisualizationMode =
  | "dependencies"
  | "complexity"
  | "unused"
  | "filesize"
  | "types"

export type ViewDimension = "2d" | "3d" | "network"

interface CodeViewerState {
  filePath: string
  functionName: string | null
}

interface CityState {
  selectedFile: string | null
  selectedIndex: number | null
  hoveredFile: string | null
  hoveredIndex: number | null
  visualizationMode: VisualizationMode
  viewDimension: ViewDimension
  layoutMode: LayoutMode
  searchQuery: string
  hiddenExtensions: Set<string>
  hiddenPaths: Set<string>
  dimUnselected: boolean
  sidePanelPinned: boolean
  leftPanelCollapsed: boolean
  showShortcutsOverlay: boolean
  showBuildingLabels: boolean
  /** Agent mode: show which coding agents are working in the project, and on what. */
  agentMode: boolean
  highlightedFiles: Set<string>
  repoUrl: string
  codeViewer: CodeViewerState | null
  setHighlightedFiles: (files: string[]) => void
  setRepoUrl: (url: string) => void
  selectFile: (path: string | null, index?: number | null) => void
  hoverFile: (path: string | null, index?: number | null) => void
  setMode: (mode: VisualizationMode) => void
  setViewDimension: (dim: ViewDimension) => void
  setLayoutMode: (mode: LayoutMode) => void
  setSearch: (query: string) => void
  toggleExtension: (ext: string) => void
  showAllExtensions: () => void
  hideAllExtensions: (allExts: string[]) => void
  togglePathVisibility: (path: string) => void
  showAllPaths: () => void
  setDimUnselected: (dim: boolean) => void
  togglePinSidePanel: () => void
  toggleLeftPanel: () => void
  toggleShortcutsOverlay: () => void
  toggleBuildingLabels: () => void
  setAgentMode: (on: boolean) => void
  openCodeViewer: (filePath: string, functionName?: string | null) => void
  closeCodeViewer: () => void
  resetProjectState: () => void
}

export const useCityStore = create<CityState>((set) => ({
  selectedFile: null,
  selectedIndex: null,
  hoveredFile: null,
  hoveredIndex: null,
  visualizationMode: "dependencies",
  viewDimension: "3d",
  layoutMode: "folder",
  searchQuery: "",
  hiddenExtensions: new Set<string>(),
  hiddenPaths: new Set<string>(),
  dimUnselected: true,
  sidePanelPinned: false,
  leftPanelCollapsed: false,
  showShortcutsOverlay: false,
  showBuildingLabels: true,
  agentMode: false,
  highlightedFiles: new Set<string>(),
  repoUrl: "",
  codeViewer: null,
  setHighlightedFiles: (files) => set({ highlightedFiles: new Set(files) }),
  setRepoUrl: (url) => set({ repoUrl: url }),
  selectFile: (path, index = null) =>
    set({ selectedFile: path, selectedIndex: index ?? null }),
  hoverFile: (path, index = null) =>
    set({ hoveredFile: path, hoveredIndex: index ?? null }),
  setMode: (mode) => set({ visualizationMode: mode }),
  setViewDimension: (dim) => set({ viewDimension: dim }),
  setLayoutMode: (mode) => set({ layoutMode: mode }),
  setSearch: (query) => set({ searchQuery: query }),
  toggleExtension: (ext) =>
    set((state) => {
      const next = new Set(state.hiddenExtensions)
      if (next.has(ext)) next.delete(ext)
      else next.add(ext)
      return { hiddenExtensions: next }
    }),
  showAllExtensions: () => set({ hiddenExtensions: new Set<string>() }),
  hideAllExtensions: (allExts) => set({ hiddenExtensions: new Set(allExts) }),
  togglePathVisibility: (path) =>
    set((state) => {
      const next = new Set(state.hiddenPaths)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return { hiddenPaths: next }
    }),
  showAllPaths: () => set({ hiddenPaths: new Set<string>() }),
  setDimUnselected: (dim) => set({ dimUnselected: dim }),
  togglePinSidePanel: () =>
    set((state) => ({ sidePanelPinned: !state.sidePanelPinned })),
  toggleLeftPanel: () =>
    set((state) => ({ leftPanelCollapsed: !state.leftPanelCollapsed })),
  toggleShortcutsOverlay: () =>
    set((state) => ({ showShortcutsOverlay: !state.showShortcutsOverlay })),
  toggleBuildingLabels: () =>
    set((state) => ({ showBuildingLabels: !state.showBuildingLabels })),
  setAgentMode: (on) => set({ agentMode: on }),
  openCodeViewer: (filePath, functionName = null) =>
    set({ codeViewer: { filePath, functionName: functionName ?? null } }),
  closeCodeViewer: () => set({ codeViewer: null }),
  resetProjectState: () =>
    set({
      selectedFile: null,
      selectedIndex: null,
      hoveredFile: null,
      hoveredIndex: null,
      searchQuery: "",
      hiddenExtensions: new Set<string>(),
      hiddenPaths: new Set<string>(),
      highlightedFiles: new Set<string>(),
      codeViewer: null,
    }),
}))

/**
 * Check if a file path is hidden — either directly or via an ancestor folder.
 */
export function isPathHidden(filePath: string, hiddenPaths: Set<string>): boolean {
  if (hiddenPaths.size === 0) return false
  if (hiddenPaths.has(filePath)) return true
  const segments = filePath.split("/")
  for (let i = 1; i < segments.length; i++) {
    if (hiddenPaths.has(segments.slice(0, i).join("/"))) return true
  }
  return false
}
