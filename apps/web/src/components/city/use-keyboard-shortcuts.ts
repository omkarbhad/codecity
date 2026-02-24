"use client"

import { useEffect } from "react"
import { useCityStore, type VisualizationMode } from "./use-city-store"

const MODE_KEYS: Record<string, VisualizationMode> = {
  "1": "dependencies",
  "2": "complexity",
  "3": "filesize",
  "4": "unused",
  "5": "types",
}

export function useKeyboardShortcuts() {
  const { selectFile, setMode } = useCityStore()

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Don't capture when typing in input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return

      if (e.key === "Escape") {
        selectFile(null)
      } else if (e.key === "/") {
        e.preventDefault()
        const searchInput = document.querySelector<HTMLInputElement>(
          "[data-city-search]"
        )
        searchInput?.focus()
      } else if (MODE_KEYS[e.key]) {
        setMode(MODE_KEYS[e.key])
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [selectFile, setMode])
}
