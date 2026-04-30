import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react"

export function HugeIcon({
  icon,
  className,
  size = 16,
}: {
  icon: IconSvgElement
  className?: string
  size?: number
}) {
  return <HugeiconsIcon icon={icon} size={size} className={className} strokeWidth={1.8} />
}
