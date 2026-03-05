import { breakpoints, districtPalette, semantic } from "@/designsystem"
import { SectionTitle } from "../components/section-title"
import { SubTitle } from "../components/sub-title"
import { TokenRow } from "../components/token-row"

export function BreakpointsSection() {
  return (
    <>
      <SectionTitle id="breakpoints">Breakpoints</SectionTitle>
      <p className="text-sm text-muted-foreground mb-6">
        Aligned with Tailwind defaults and the content-container media queries.
      </p>

      <SubTitle>Breakpoint Values</SubTitle>
      <div className="panel-surface p-6 space-y-2">
        {Object.entries(breakpoints).map(([name, val]) => (
          <TokenRow key={name} label={name} value={val} />
        ))}
      </div>

      <SubTitle>Responsive Demo</SubTitle>
      <p className="text-sm text-muted-foreground mb-4">
        The bars below represent each breakpoint relative to the widest (2xl = 1536px).
      </p>
      <div className="panel-surface p-8 space-y-4">
        {Object.entries(breakpoints).map(([name, val]) => {
          const px = parseInt(val, 10)
          const pct = (px / 1536) * 100
          return (
            <div key={name} className="flex items-center gap-4">
              <span className="text-xs font-mono text-muted-foreground w-8 text-right shrink-0">
                {name}
              </span>
              <div className="flex-1 h-6 bg-muted/40 rounded-md overflow-hidden relative">
                <div
                  className="h-full rounded-md"
                  style={{
                    width: `${pct}%`,
                    background: `linear-gradient(90deg, ${semantic.primary}40, ${semantic.primary}80)`,
                  }}
                />
                <span className="absolute inset-y-0 left-2 flex items-center text-[10px] font-mono text-foreground/60">
                  {val}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      <SubTitle>Responsive Layout Grid</SubTitle>
      <p className="text-sm text-muted-foreground mb-4">
        Resize your browser to see columns adapt at each breakpoint.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
        {Array.from({ length: 12 }, (_, i) => (
          <div
            key={i}
            className="rounded-lg p-4 text-center text-xs font-mono"
            style={{
              background: `${districtPalette[i % districtPalette.length]}18`,
              border: `1px solid ${districtPalette[i % districtPalette.length]}30`,
              color: districtPalette[i % districtPalette.length],
            }}
          >
            col-{i + 1}
          </div>
        ))}
      </div>
    </>
  )
}
