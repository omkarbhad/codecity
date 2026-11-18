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
    <div className="flex min-h-72 items-center justify-center border border-(--border-light) bg-card rounded-[16px]">
      <div className="flex flex-col items-center px-6 py-10 text-center">
        <div
          aria-hidden="true"
          className={`mb-4 flex size-12 items-center justify-center border bg-(--bg-raised) [&_svg]:size-6 ${
            tone === "danger" ? "border-(--sev-high) text-(--sev-high)" : "border-(--border-light) text-primary"
          }`}
        >
          {icon}
        </div>
        <p className="text-[14px] font-semibold leading-[1.25] text-(--cream)">{title}</p>
        <p className="mt-2 max-w-sm text-[12px] leading-[1.5] text-(--cream-dark)">{description}</p>
        {action && <div className="mt-5">{action}</div>}
      </div>
    </div>
  )
}
