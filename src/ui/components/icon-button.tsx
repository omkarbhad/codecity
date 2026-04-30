import * as React from "react"
import { Slot } from "radix-ui"

import { cn } from "@codecity/ui/lib/utils"

interface IconButtonProps extends React.ComponentProps<"button"> {
  asChild?: boolean
}

export function IconButton({ asChild = false, className, ...props }: IconButtonProps) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      className={cn(
        "inline-flex size-7 shrink-0 items-center justify-center rounded-md border border-white/[0.08] bg-white/[0.03] text-zinc-500 transition-colors hover:border-white/[0.14] hover:bg-white/[0.06] hover:text-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-3.5",
        className
      )}
      {...props}
    />
  )
}
