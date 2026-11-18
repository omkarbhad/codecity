import type { AppIconType } from "./icons"

/**
 * The app's icon (Phosphor, from ./icons). One size scale, so icons line up across screens:
 *   14px  size-3.5    beside text (labels, chips, tree rows)
 *   16px  size-4      inside buttons and toolbars (the default)
 *   18px  size-[18px] navigation (rails, sidebar rows)
 *   20px+ size-5/6    empty and error states
 * Regular weight everywhere; `active` fills the icon for the current item of a navigation.
 */
export function AppIcon({
  icon: Icon,
  className,
  size = 16,
  active = false,
}: {
  icon: AppIconType
  className?: string
  size?: number
  active?: boolean
}) {
  return <Icon size={size} className={className} weight={active ? "fill" : "regular"} aria-hidden />
}
