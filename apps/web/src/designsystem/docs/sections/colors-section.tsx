import { primitive, semantic, roles, district, status } from "@/designsystem"
import { Swatch } from "../components/swatch"
import { SectionTitle } from "../components/section-title"
import { SubTitle } from "../components/sub-title"

export function ColorsSection() {
  return (
    <>
      <SectionTitle id="colors">Color System</SectionTitle>
      <p className="text-sm text-muted-foreground mb-6">
        Built on a primitive → semantic → role hierarchy. The dark theme is the default.
      </p>

      <SubTitle>Primitive Palette</SubTitle>
      <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-4">
        {Object.entries(primitive).map(([name, hex]) => (
          <Swatch key={name} color={hex} label={name} sub={hex} />
        ))}
      </div>

      <SubTitle>Semantic Colors</SubTitle>
      <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-4">
        {Object.entries(semantic).map(([name, hex]) => (
          <Swatch key={name} color={hex} label={name} sub={hex} />
        ))}
      </div>

      <SubTitle>Role-Based Colors</SubTitle>
      <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-4">
        {Object.entries(roles).map(([name, value]) => {
          if (typeof value !== "string") return null
          return <Swatch key={name} color={value} label={name} sub={value} />
        })}
      </div>

      <SubTitle>District Palette</SubTitle>
      <p className="text-sm text-muted-foreground mb-4">
        12 vibrant colors used for code district visualization.
      </p>
      <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-12 gap-4">
        {Object.entries(district).map(([name, hex]) => (
          <Swatch key={name} color={hex} label={name} sub={hex} />
        ))}
      </div>

      <SubTitle>Status Colors</SubTitle>
      <div className="flex flex-wrap gap-4">
        {Object.entries(status).map(([name, s]) => (
          <div
            key={name}
            className="flex items-center gap-3 rounded-lg px-4 py-2"
            style={{
              background: s.background,
              color: s.text,
              border: `1px solid ${s.border}`,
            }}
          >
            <div className="h-2.5 w-2.5 rounded-full" style={{ background: s.text }} />
            <span className="text-sm font-medium capitalize">{name}</span>
          </div>
        ))}
      </div>

      <SubTitle>Background / Text Combinations</SubTitle>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { bg: roles.background, fg: roles.foreground, label: "Background / Foreground" },
          { bg: roles.card, fg: roles.cardForeground, label: "Card / Card Foreground" },
          { bg: roles.muted, fg: roles.mutedForeground, label: "Muted / Muted Foreground" },
          { bg: roles.accent, fg: roles.accentForeground, label: "Accent / Accent Foreground" },
          { bg: semantic.primary, fg: semantic.primaryForeground, label: "Primary / Primary Foreground" },
          { bg: semantic.destructive, fg: semantic.destructiveForeground, label: "Destructive / Destructive FG" },
        ].map((combo) => (
          <div
            key={combo.label}
            className="rounded-xl p-5 border border-white/5"
            style={{ background: combo.bg, color: combo.fg }}
          >
            <p className="text-sm font-semibold mb-1">{combo.label}</p>
            <p className="text-xs opacity-80">
              The quick brown fox jumps over the lazy dog.
            </p>
            <div className="mt-2 flex gap-2 text-[10px] font-mono opacity-60">
              <span>bg: {combo.bg}</span>
              <span>fg: {combo.fg}</span>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
