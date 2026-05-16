"use client"

import type { CityStats } from "@/lib/types/city"

interface StatsBarProps {
  stats: CityStats
}

function StatItem({
  value,
  label,
  isLast = false,
  tone = "cream",
}: {
  value: number
  label: string
  isLast?: boolean
  tone?: "cream" | "lime" | "low" | "med" | "high"
}) {
  const toneClass = {
    cream: "text-(--cream)",
    lime: "text-(--lime)",
    low: "text-(--sev-low)",
    med: "text-(--sev-med)",
    high: "text-(--sev-high)",
  }[tone]
  return (
    <div
      className={`flex flex-col items-center px-4 py-2 ${
        !isLast ? "border-r-2 border-dashed border-(--border-pixel)" : ""
      }`}
    >
      <span className={`font-mono text-[14px] font-bold tabular-nums ${toneClass}`}>
        {value.toLocaleString()}
      </span>
      <span className="font-mono text-[9px] uppercase tracking-[0.08em] text-(--muted)">
        {label}
      </span>
    </div>
  )
}

export function StatsBar({ stats }: StatsBarProps) {
  return (
    <div className="flex items-center justify-center border-t-2 border-(--border-pixel) bg-(--bg-card)">
      <div className="flex items-center">
        <StatItem value={stats.totalFiles} label="Files" tone="cream" />
        <StatItem value={stats.totalFunctions} label="Functions" tone="lime" />
        <StatItem value={stats.totalLines} label="Lines" tone="med" />
        <StatItem value={stats.totalTypes} label="Types" tone="cream" />
        <StatItem value={stats.totalImports} label="Imports" tone="low" />
        <StatItem value={stats.unusedExports} label="Unused" tone={stats.unusedExports > 0 ? "high" : "cream"} isLast />
      </div>
    </div>
  )
}
