import {
  fontFamily,
  fontSize,
  fontWeight,
  lineHeight,
  letterSpacing,
  textStyles,
} from "@/designsystem"
import type { TextStyle } from "@/designsystem"
import { SectionTitle } from "../components/section-title"
import { SubTitle } from "../components/sub-title"
import { TokenRow } from "../components/token-row"

export function TypographySection() {
  return (
    <>
      <SectionTitle id="typography">Typography System</SectionTitle>
      <p className="text-sm text-muted-foreground mb-6">
        <strong>Sora</strong> for headings and UI.{" "}
        <strong>IBM Plex Mono</strong> for code and data.
      </p>

      <SubTitle>Font Families</SubTitle>
      <div className="space-y-4">
        <div className="panel-surface p-6">
          <p className="text-xs text-muted-foreground font-mono mb-2">fontFamily.sans</p>
          <p className="text-2xl" style={{ fontFamily: fontFamily.sans }}>
            Sora — The quick brown fox jumps over the lazy dog
          </p>
          <p className="text-xs text-muted-foreground mt-2 font-mono">{fontFamily.sans}</p>
        </div>
        <div className="panel-surface p-6">
          <p className="text-xs text-muted-foreground font-mono mb-2">fontFamily.mono</p>
          <p className="text-2xl" style={{ fontFamily: fontFamily.mono }}>
            {"IBM Plex Mono — 0123456789 { } => () => null"}
          </p>
          <p className="text-xs text-muted-foreground mt-2 font-mono">{fontFamily.mono}</p>
        </div>
      </div>

      <SubTitle>Heading Scale (H1 – H6)</SubTitle>
      <div className="space-y-6 panel-surface p-8">
        {(["h1", "h2", "h3", "h4", "h5", "h6"] as const).map((key) => {
          const style = textStyles[key] as TextStyle
          return (
            <div
              key={key}
              className="flex items-baseline gap-4 border-b border-border/30 pb-4 last:border-0 last:pb-0"
            >
              <span className="text-xs font-mono text-muted-foreground w-8 shrink-0 uppercase">
                {key}
              </span>
              <p
                style={{
                  fontFamily: style.fontFamily,
                  fontSize: style.fontSize,
                  fontWeight: Number(style.fontWeight),
                  lineHeight: style.lineHeight,
                  letterSpacing: style.letterSpacing,
                }}
              >
                Visualize Your Codebase
              </p>
              <span className="text-[10px] font-mono text-muted-foreground ml-auto shrink-0">
                {style.fontSize} / {style.fontWeight}
              </span>
            </div>
          )
        })}
      </div>

      <SubTitle>Body, Caption & Overline</SubTitle>
      <div className="space-y-4 panel-surface p-8">
        {(["body", "bodySmall", "caption", "overline", "code", "monoLabel"] as const).map(
          (key) => {
            const style = textStyles[key] as TextStyle
            const sampleText =
              key === "overline"
                ? "OVERLINE LABEL TEXT"
                : key === "code" || key === "monoLabel"
                  ? "const city = analyze(repo)"
                  : "Transform any TypeScript repo into an interactive 3D city visualization."
            return (
              <div
                key={key}
                className="flex items-baseline gap-4 border-b border-border/30 pb-3 last:border-0 last:pb-0"
              >
                <span className="text-xs font-mono text-muted-foreground w-20 shrink-0">
                  {key}
                </span>
                <p
                  style={{
                    fontFamily: style.fontFamily,
                    fontSize: style.fontSize,
                    fontWeight: Number(style.fontWeight),
                    lineHeight: style.lineHeight,
                    letterSpacing: style.letterSpacing,
                  }}
                >
                  {sampleText}
                </p>
              </div>
            )
          }
        )}
      </div>

      <SubTitle>Font Weight Preview</SubTitle>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
        {Object.entries(fontWeight).map(([name, weight]) => (
          <div key={name} className="panel-surface p-4 text-center">
            <p
              className="text-3xl mb-2"
              style={{ fontWeight: Number(weight), fontFamily: fontFamily.sans }}
            >
              Aa
            </p>
            <p className="text-xs text-muted-foreground">{name}</p>
            <p className="text-[10px] font-mono text-muted-foreground/60">{weight}</p>
          </div>
        ))}
      </div>

      <SubTitle>Font Size Scale</SubTitle>
      <div className="panel-surface p-6 space-y-2">
        {Object.entries(fontSize).map(([name, size]) => (
          <TokenRow key={name} label={name} value={size} />
        ))}
      </div>

      <SubTitle>Line Height & Letter Spacing</SubTitle>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="panel-surface p-6 space-y-2">
          <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">
            Line Heights
          </p>
          {Object.entries(lineHeight).map(([name, val]) => (
            <TokenRow key={name} label={name} value={val} />
          ))}
        </div>
        <div className="panel-surface p-6 space-y-2">
          <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">
            Letter Spacing
          </p>
          {Object.entries(letterSpacing).map(([name, val]) => (
            <TokenRow key={name} label={name} value={val} />
          ))}
        </div>
      </div>
    </>
  )
}
