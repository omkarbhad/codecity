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
    <div className="relative bg-white/[0.03] backdrop-blur-xl rounded-lg border border-white/[0.08] focus-within:border-primary/45 transition-colors">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600 pointer-events-none" />
      <input
        ref={inputRef}
        type="text"
        data-city-search
        value={searchQuery}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search files... ( / )"
        className="w-full bg-transparent pl-9 pr-3 py-2 font-sans text-xs text-zinc-200
          placeholder:text-zinc-600 outline-none"
      />
    </div>
  )
}
