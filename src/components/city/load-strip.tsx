"use client"

/**
 * Bottom-center progress strip — used for any long-running background task
 * inside a project view (city geometry chunk loading, network stabilization,
 * future incremental analyses). Style is intentionally consistent so users
 * always recognise the "still loading" state regardless of which view is
 * active. Detail text is optional; pass `null` to hide it.
 */
export function LoadStrip({
  label,
  percent,
  detail,
  leaving,
}: {
  label: string
  /** 0-100. Clamped before rendering. */
  percent: number
  /** Optional right-aligned text, e.g. "1,234 / 3,000 files". */
  detail?: string | null
  /** Fade-out animation hook — pass `true` for one render before unmounting. */
  leaving?: boolean
}) {
  const totalRectangles = 28
  const clamped = Math.max(0, Math.min(100, percent))
  const loadedRectangles = Math.round((clamped / 100) * totalRectangles)
  const percentLabel = Math.round(clamped)

  return (
    <div
      className={`pointer-events-none absolute bottom-4 left-1/2 z-40 w-[min(440px,calc(100%-32px))] -translate-x-1/2 rounded-md border border-white/[0.09] bg-[#0b0b0c]/90 px-3 py-2.5 shadow-2xl shadow-black/45 backdrop-blur-xl transition-all duration-300 ${
        leaving ? "translate-y-1 opacity-0" : "opacity-100"
      }`}
    >
      <div className="mb-2.5 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="grid size-5 shrink-0 grid-cols-2 gap-[2px] rounded border border-white/[0.08] bg-white/[0.035] p-[3px]">
            <span className="rounded-[1px] bg-primary/70" />
            <span className="rounded-[1px] bg-white/[0.18]" />
            <span className="rounded-[1px] bg-white/[0.14]" />
            <span className="rounded-[1px] bg-primary/45" />
          </span>
          <span className="truncate text-[11px] font-medium text-white/62">{label}</span>
        </div>
        <span className="shrink-0 font-mono text-[10px] tabular-nums text-white/48">
          {detail ? `${percentLabel}% · ${detail}` : `${percentLabel}%`}
        </span>
      </div>
      <div className="grid h-[7px] grid-flow-col gap-[3px]">
        {Array.from({ length: totalRectangles }).map((_, index) => (
          <span
            key={index}
            className={`rounded-[2px] transition-colors duration-200 ${
              index < loadedRectangles ? "bg-primary/75 shadow-[0_0_8px_rgba(59,130,246,0.34)]" : "bg-white/[0.07]"
            }`}
          />
        ))}
      </div>
    </div>
  )
}
