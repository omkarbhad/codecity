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
      className={`pointer-events-none absolute bottom-4 left-1/2 z-40 w-[min(440px,calc(100%-32px))] -translate-x-1/2 border border-(--border-light) bg-(--bg-card) px-3 py-2.5 transition-all duration-300 ${
        leaving ? "translate-y-1 opacity-0" : "opacity-100"
      }`}
    >
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="grid size-5 shrink-0 grid-cols-2 gap-[2px] border border-(--border-pixel) bg-(--bg-deep) p-[2px] rounded-md">
            <span className="bg-primary" />
            <span className="bg-(--border-light)" />
            <span className="bg-(--border-light)" />
            <span className="bg-primary" />
          </span>
          <span className="truncate text-[11px] text-(--cream-dark)">{label}</span>
        </div>
        <span className="shrink-0 text-[11px] tabular-nums text-(--cream)">
          {detail ? <><span className="text-primary">{percentLabel}%</span><span className="text-(--dim)"> · </span>{detail}</> : <span className="text-primary">{percentLabel}%</span>}
        </span>
      </div>
      <div className="grid h-[8px] grid-flow-col gap-[2px]">
        {Array.from({ length: totalRectangles }).map((_, index) => (
          <span
            key={index}
            className={`transition-colors duration-200 ${
              index < loadedRectangles ? "bg-primary" : "bg-(--border-pixel)"
            }`}
          />
        ))}
      </div>
    </div>
  )
}
