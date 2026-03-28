"use client"

import type { CityStats } from "@/lib/types/city"

interface StatsBarProps {
  stats: CityStats
}

function StatItem({
  value,
  label,
  isLast = false,
}: {
  value: number
  label: string
  isLast?: boolean
}) {
  return (
    <div
      className={`flex flex-col items-center px-4 py-2 ${
        !isLast ? "border-r border-white/[0.06]" : ""
      }`}
    >
      <span className="font-sans text-sm font-bold text-[#fafafa]">
        {value.toLocaleString()}
      </span>
      <span className="text-[10px] text-zinc-500 uppercase tracking-wider">
        {label}
      </span>
    </div>
  )
}

export function StatsBar({ stats }: StatsBarProps) {
  return (
    <div className="bg-[#09090b]/92 backdrop-blur-xl border-t border-white/[0.06] flex items-center justify-center">
      <div className="flex items-center">
        <StatItem value={stats.totalFiles} label="Files" />
        <StatItem value={stats.totalFunctions} label="Functions" />
        <StatItem value={stats.totalLines} label="Lines" />
        <StatItem value={stats.totalTypes} label="Types" />
        <StatItem value={stats.totalImports} label="Imports" />
        <StatItem value={stats.unusedExports} label="Unused" isLast />
      </div>
    </div>
  )
}
