import * as React from "react"
import { cn } from "@codecity/ui/lib/utils"

interface DecorIconProps extends React.HTMLAttributes<HTMLDivElement> {
  position?: "top-left" | "top-right" | "bottom-left" | "bottom-right"
}

export function DecorIcon({
  className,
  position = "bottom-left",
  ...props
}: DecorIconProps) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute size-16 opacity-20",
        {
          "left-0 top-0": position === "top-left",
          "right-0 top-0": position === "top-right",
          "bottom-0 left-0": position === "bottom-left",
          "bottom-0 right-0": position === "bottom-right",
        },
        className
      )}
      {...props}
    >
      <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="size-full"
      >
        <circle cx="50" cy="50" r="45" stroke="currentColor" strokeWidth="2" />
        <circle cx="50" cy="50" r="30" stroke="currentColor" strokeWidth="1" />
        <circle cx="50" cy="50" r="15" stroke="currentColor" strokeWidth="1" />
      </svg>
    </div>
  )
}
