import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@codecity/ui/lib/utils"

// One button for the whole app, on the Ghostly-style tokens in globals.css:
// pill shape, 13px Instrument Sans, neutral focus ring, a 1px press on click.
// `default` is the lime brand action; use it once per view at most.
const buttonVariants = cva(
  "inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-full font-medium outline-none transition-[background-color,color,border-color,transform,filter] duration-150 active:translate-y-px disabled:pointer-events-none disabled:opacity-45 focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--cream)_55%,transparent)] focus-visible:ring-offset-0 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:brightness-105",
        secondary: "bg-(--bg-card) text-(--cream) hover:bg-(--bg-raised)",
        outline: "border border-(--border-light) bg-transparent text-(--cream) hover:bg-(--bg-card)",
        ghost: "text-(--cream-dark) hover:bg-(--bg-raised) hover:text-(--cream)",
        destructive:
          "bg-[color-mix(in_srgb,var(--sev-high)_14%,transparent)] text-(--sev-high) hover:bg-[color-mix(in_srgb,var(--sev-high)_22%,transparent)]",
        link: "rounded-none text-(--cream) underline decoration-(--dim) underline-offset-[3px] hover:decoration-(--cream)",
      },
      size: {
        default: "h-8 px-3.5 text-[13px] has-[>svg]:px-3",
        xs: "h-6 gap-1 px-2.5 text-[12px] [&_svg:not([class*='size-'])]:size-3.5",
        sm: "h-7 gap-1.5 px-3 text-[12px]",
        lg: "h-9 px-4 text-[14px]",
        icon: "size-8 rounded-[10px]",
        "icon-xs": "size-6 rounded-[6px] [&_svg:not([class*='size-'])]:size-3.5",
        "icon-sm": "size-7 rounded-[6px]",
        "icon-lg": "size-9 rounded-[10px]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
