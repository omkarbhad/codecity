import * as React from "react"
import { Slot } from "radix-ui"

import { cn } from "@codecity/ui/lib/utils"

interface IconButtonProps extends React.ComponentProps<"button"> {
  asChild?: boolean
}

/** The app's icon-only button: a 28px soft square that fills on hover. Always pass aria-label. */
export function IconButton({ asChild = false, className, ...props }: IconButtonProps) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      className={cn(
        "inline-flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-[6px] text-(--muted) transition-[color,background-color,transform] duration-150 hover:bg-(--bg-raised) hover:text-(--cream) active:translate-y-px aria-pressed:text-(--cream) disabled:pointer-events-none disabled:opacity-45 [&_svg]:size-4",
        className
      )}
      {...props}
    />
  )
}
