const sections = [
  { id: "colors", label: "Colors" },
  { id: "typography", label: "Typography" },
  { id: "spacing", label: "Spacing" },
  { id: "radius-elevation", label: "Radius & Elevation" },
  { id: "breakpoints", label: "Breakpoints" },
]

export function StyleGuideNav() {
  return (
    <nav className="flex flex-wrap gap-2 mb-12 sticky top-16 z-20 py-3 bg-background/80 backdrop-blur-md border-b border-border/30">
      {sections.map((s) => (
        <a
          key={s.id}
          href={`#${s.id}`}
          className="px-3 py-1.5 text-sm font-medium rounded-md bg-muted/60 text-foreground/70 hover:text-foreground hover:bg-muted transition-colors"
        >
          {s.label}
        </a>
      ))}
    </nav>
  )
}
