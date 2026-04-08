import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@codecity/ui/lib/utils"

const kbdVariants = cva(
  "inline-flex items-center justify-center rounded-md border bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/80",
  {
    variants: {
      variant: {
        default: "border-border",
        outline: "border-transparent bg-transparent hover:bg-muted/80",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface KbdProps
  extends React.HTMLAttributes<HTMLElement>,
    VariantProps<typeof kbdVariants> {}

const Kbd = React.forwardRef<HTMLElement, KbdProps>(
  ({ className, variant, ...props }, ref) => {
    return (
      <kbd
        ref={ref}
        className={cn(kbdVariants({ variant }), className)}
        {...props}
      />
    )
  }
)
Kbd.displayName = "Kbd"

const KbdGroup = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("inline-flex items-center gap-1", className)}
    {...props}
  />
))
KbdGroup.displayName = "KbdGroup"

export { Kbd, KbdGroup, kbdVariants }
