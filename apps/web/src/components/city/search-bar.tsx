"use client"

import { useEffect, useRef } from "react"
import { Search } from "lucide-react"
import { useCityStore } from "./use-city-store"

export function SearchBar() {
  const searchQuery = useCityStore((s) => s.searchQuery)
  const setSearch = useCityStore((s) => s.setSearch)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // "/" focuses the search bar (unless user is typing in another input)
      if (
        e.key === "/" &&
        !["INPUT", "TEXTAREA", "SELECT"].includes(
          (e.target as HTMLElement).tagName
        )
      ) {
        e.preventDefault()
        inputRef.current?.focus()
      }
      // Escape blurs the search bar
      if (e.key === "Escape" && document.activeElement === inputRef.current) {
        inputRef.current?.blur()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  return (
    <div className="relative bg-card/60 backdrop-blur-xl rounded-lg border border-border/30">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30 pointer-events-none" />
      <input
        ref={inputRef}
        type="text"
        data-city-search
        value={searchQuery}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search files... ( / )"
        className="w-full bg-transparent pl-9 pr-3 py-2 font-mono text-xs text-white
          placeholder:text-white/30 outline-none"
      />
    </div>
  )
}
