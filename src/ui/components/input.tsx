import * as React from "react"

import { cn } from "@codecity/ui/lib/utils"

/** Text field: a soft 10px-radius block on the card colour, ringed in grey when focused. */
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-8 w-full min-w-0 rounded-[10px] border border-transparent bg-(--bg-card) px-3 text-[13px] text-(--cream) outline-none transition-[border-color,background-color] placeholder:text-(--muted) focus:border-(--border-light) disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-[13px] file:font-medium",
        "aria-invalid:border-(--sev-high)",
        className
      )}
      {...props}
    />
  )
}

export { Input }
