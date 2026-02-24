"use client"

import { Search } from "lucide-react"
import { useCityStore } from "./use-city-store"

export function SearchBar() {
  const { searchQuery, setSearch } = useCityStore()

  return (
    <div className="relative bg-card/60 backdrop-blur-xl rounded-lg border border-border/30">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30 pointer-events-none" />
      <input
        type="text"
        data-city-search
        value={searchQuery}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search files, functions, types... ( / )"
        className="w-full bg-transparent pl-9 pr-3 py-2 font-mono text-xs text-white
          placeholder:text-white/30 outline-none"
      />
    </div>
  )
}
