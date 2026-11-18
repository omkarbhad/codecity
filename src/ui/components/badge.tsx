import * as React from "react"

import { cn } from "@codecity/ui/lib/utils"

const TONES = {
  neutral: "bg-(--bg-card) text-(--cream-dark)",
  accent: "bg-[color-mix(in_srgb,var(--lime)_14%,transparent)] text-(--lime)",
  high: "bg-[color-mix(in_srgb,var(--sev-high)_14%,transparent)] text-(--sev-high)",
  med: "bg-[color-mix(in_srgb,var(--sev-med)_14%,transparent)] text-(--sev-med)",
  low: "bg-[color-mix(in_srgb,var(--sev-low)_14%,transparent)] text-(--sev-low)",
} as const

export type BadgeTone = keyof typeof TONES

/** A small pill for counts, statuses and tags. */
export function Badge({ tone = "neutral", className, ...props }: React.ComponentProps<"span"> & { tone?: BadgeTone }) {
  return (
    <span
      className={cn("inline-flex h-5 shrink-0 items-center gap-1 rounded-full px-2 text-[11px] font-medium leading-none tabular-nums", TONES[tone], className)}
      {...props}
    />
  )
}
