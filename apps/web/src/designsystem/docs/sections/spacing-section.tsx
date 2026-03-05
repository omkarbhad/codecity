import { spacing, layout, baseUnit } from "@/designsystem"
import { SectionTitle } from "../components/section-title"
import { SubTitle } from "../components/sub-title"
import { TokenRow } from "../components/token-row"

export function SpacingSection() {
  return (
    <>
      <SectionTitle id="spacing">Spacing Scale</SectionTitle>
      <p className="text-sm text-muted-foreground mb-6">
        Based on a <strong>{baseUnit}px</strong> base grid, aligned with Tailwind conventions.
      </p>

      <SubTitle>Visual Spacing Blocks</SubTitle>
      <div className="panel-surface p-8 space-y-3">
        {Object.entries(spacing)
          .filter(([key]) => !["0", "px"].includes(key))
          .slice(0, 18)
          .map(([name, value]) => (
            <div key={name} className="flex items-center gap-4">
              <span className="text-xs font-mono text-muted-foreground w-10 text-right shrink-0">
                {name}
              </span>
              <div className="h-5 rounded-sm bg-primary/60" style={{ width: value }} />
              <span className="text-[10px] font-mono text-muted-foreground/60">{value}</span>
            </div>
          ))}
      </div>

      <SubTitle>Layout Spacing</SubTitle>
      <div className="panel-surface p-6 space-y-2">
        <TokenRow label="navbarHeight" value={layout.navbarHeight} />
        <TokenRow label="containerMaxWidth" value={layout.containerMaxWidth} />
        <TokenRow label="containerPadding.base" value={layout.containerPadding.base} />
        <TokenRow label="containerPadding.sm" value={layout.containerPadding.sm} />
        <TokenRow label="containerPadding.lg" value={layout.containerPadding.lg} />
        <TokenRow label="gridSize" value={layout.gridSize} />
        <TokenRow label="gridSizeFine" value={layout.gridSizeFine} />
        <TokenRow label="baseUnit" value={`${baseUnit}px`} />
      </div>
    </>
  )
}
