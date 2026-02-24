const FEATURES = [
  {
    title: "3D Visualization",
    tag: "SPATIAL",
    color: "#22d3ee",
    description:
      "Transform code into an interactive 3D cityscape. Files become buildings, directories become districts.",
  },
  {
    title: "Dependency Mapping",
    tag: "GRAPH",
    color: "#34d399",
    description:
      "Visualize import relationships as flowing pipes. Trace dependencies at a glance.",
  },
  {
    title: "Code Intelligence",
    tag: "METRICS",
    color: "#fbbf24",
    description:
      "Spot complexity hotspots, unused exports, and architectural patterns instantly.",
  },
]

export function FeatureCards() {
  return (
    <section className="py-20">
      <div className="mx-auto max-w-5xl px-6">
        <div className="grid gap-4 md:grid-cols-3">
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="rounded-xl border border-border/30 bg-card/20 p-6 transition-all hover:border-primary/20 hover:bg-card/30"
            >
              <div className="flex items-center gap-3">
                <div
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: feature.color }}
                />
                <span className="font-mono text-[9px] tracking-wider text-muted-foreground/30 uppercase">
                  {feature.tag}
                </span>
              </div>
              <h3 className="mt-4 font-sans font-semibold text-foreground">
                {feature.title}
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
