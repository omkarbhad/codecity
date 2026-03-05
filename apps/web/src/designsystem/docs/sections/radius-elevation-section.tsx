import {
  radius,
  componentRadius,
  elevation,
  glowShadow,
  textShadow,
  glassmorphism,
} from "@/designsystem"
import { SectionTitle } from "../components/section-title"
import { SubTitle } from "../components/sub-title"
import { TokenRow } from "../components/token-row"

export function RadiusElevationSection() {
  return (
    <>
      <SectionTitle id="radius-elevation">Radius & Elevation</SectionTitle>

      <SubTitle>Border Radius Scale</SubTitle>
      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-4">
        {Object.entries(radius).map(([name, val]) => (
          <div key={name} className="flex flex-col items-center gap-2">
            <div
              className="h-20 w-20 bg-primary/20 border border-primary/40"
              style={{ borderRadius: val }}
            />
            <span className="text-xs font-medium text-foreground/80">{name}</span>
            <span className="text-[10px] font-mono text-muted-foreground">{val}</span>
          </div>
        ))}
      </div>

      <SubTitle>Component Radius</SubTitle>
      <div className="panel-surface p-6 space-y-2">
        {Object.entries(componentRadius).map(([name, val]) => (
          <TokenRow key={name} label={name} value={val} />
        ))}
      </div>

      <SubTitle>Elevation / Box Shadow Scale</SubTitle>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {Object.entries(elevation)
          .filter(([key]) => key !== "none")
          .map(([name, shadow]) => (
            <div
              key={name}
              className="rounded-xl p-6 bg-card border border-border/20"
              style={{ boxShadow: shadow }}
            >
              <p className="text-sm font-semibold text-foreground mb-1">{name}</p>
              <p className="text-[10px] font-mono text-muted-foreground break-all">{shadow}</p>
            </div>
          ))}
      </div>

      <SubTitle>Glow Shadows</SubTitle>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {Object.entries(glowShadow).map(([name, shadow]) => (
          <div
            key={name}
            className="rounded-xl p-6 bg-card border border-primary/20"
            style={{ boxShadow: shadow }}
          >
            <p className="text-sm font-semibold text-foreground mb-1">{name}</p>
            <p className="text-[10px] font-mono text-muted-foreground break-all">{shadow}</p>
          </div>
        ))}
      </div>

      <SubTitle>Glassmorphism Panels</SubTitle>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-xl p-6" style={glassmorphism.panel}>
          <p className="text-sm font-semibold text-foreground mb-1">glass panel</p>
          <p className="text-xs text-muted-foreground">
            Semi-transparent backdrop with 12px blur and border.
          </p>
        </div>
        <div
          className="rounded-xl p-6"
          style={{ ...glassmorphism.surface, borderRadius: "0.75rem" }}
        >
          <p className="text-sm font-semibold text-foreground mb-1">panel surface</p>
          <p className="text-xs text-muted-foreground">
            Gradient background with blur and subtle white border.
          </p>
        </div>
      </div>

      <SubTitle>Text Shadow</SubTitle>
      <div className="panel-surface p-8">
        <p
          className="text-4xl font-bold text-primary"
          style={{ textShadow: textShadow.glowRed }}
        >
          Neon Glow Heading
        </p>
        <p className="text-xs font-mono text-muted-foreground mt-3">
          textShadow.glowRed: {textShadow.glowRed}
        </p>
      </div>
    </>
  )
}
