import type { ReactNode } from "react"

/** Pixel-theme empty / blocked state: icon tile, title, one line of help, optional action. */
export function EmptyState({
  icon,
  title,
  description,
  action,
  tone = "default",
}: {
  icon: ReactNode
  title: string
  description: ReactNode
  action?: ReactNode
  tone?: "default" | "danger"
}) {
  return (
    <div className="flex min-h-72 items-center justify-center border-2 border-dashed border-(--border-light) bg-card">
      <div className="flex flex-col items-center px-6 py-10 text-center">
        <div
          aria-hidden="true"
          className={`pixel-shadow-sm mb-4 flex size-12 items-center justify-center border-2 bg-(--bg-raised) [&_svg]:size-6 ${
            tone === "danger" ? "border-(--sev-high) text-(--sev-high)" : "border-(--border-light) text-primary"
          }`}
        >
          {icon}
        </div>
        <p className="text-[14px] font-semibold uppercase leading-[1.25] tracking-[0.05em] text-(--cream)">{title}</p>
        <p className="mt-2 max-w-sm text-[12px] leading-[1.5] text-(--cream-dark)">{description}</p>
        {action && <div className="mt-5">{action}</div>}
      </div>
    </div>
  )
}
