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
        "inline-flex size-7 shrink-0 cursor-pointer items-center justify-center border-2 border-(--border-pixel) bg-(--bg-raised) text-(--cream-dark) transition-colors hover:border-(--border-light) hover:text-(--cream) disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-3.5",
        className
      )}
      {...props}
    />
  )
}
