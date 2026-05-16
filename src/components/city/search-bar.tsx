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
    <div className="relative border-2 border-(--border-pixel) bg-(--bg-card) transition-colors focus-within:border-primary">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-(--muted)" />
      <input
        ref={inputRef}
        type="text"
        data-city-search
        value={searchQuery}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="search files… ( / )"
        aria-label="Search files"
        className="w-full bg-transparent py-2 pl-9 pr-3 font-mono text-[11px] text-(--cream) outline-none placeholder:text-(--dim)"
      />
    </div>
  )
}
