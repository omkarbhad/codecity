"use client"

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react"

export type VisualizationMode =
  | "dependencies"
  | "complexity"
  | "unused"
  | "filesize"
  | "types"

interface CityStore {
  selectedFile: string | null
  hoveredFile: string | null
  visualizationMode: VisualizationMode
  searchQuery: string
  selectFile: (path: string | null) => void
  hoverFile: (path: string | null) => void
  setMode: (mode: VisualizationMode) => void
  setSearch: (query: string) => void
}

const CityStoreContext = createContext<CityStore | null>(null)

export function CityStoreProvider({ children }: { children: ReactNode }) {
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [hoveredFile, setHoveredFile] = useState<string | null>(null)
  const [visualizationMode, setVisualizationMode] =
    useState<VisualizationMode>("dependencies")
  const [searchQuery, setSearchQuery] = useState("")

  const selectFile = useCallback(
    (path: string | null) => setSelectedFile(path),
    []
  )
  const hoverFile = useCallback(
    (path: string | null) => setHoveredFile(path),
    []
  )
  const setMode = useCallback(
    (mode: VisualizationMode) => setVisualizationMode(mode),
    []
  )
  const setSearch = useCallback((query: string) => setSearchQuery(query), [])

  return (
    <CityStoreContext.Provider value={{ selectedFile, hoveredFile, visualizationMode, searchQuery, selectFile, hoverFile, setMode, setSearch }}>
      {children}
    </CityStoreContext.Provider>
  )
}

export function useCityStore() {
  const store = useContext(CityStoreContext)
  if (!store)
    throw new Error("useCityStore must be used within CityStoreProvider")
  return store
}
