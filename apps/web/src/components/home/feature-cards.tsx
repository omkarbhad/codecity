import { Eye, BarChart3, MessageSquare } from "lucide-react"

const FEATURES = [
  {
    icon: Eye,
    title: "3D Visualization",
    tag: "SPATIAL",
    description:
      "Navigate your codebase as a 3D city. Buildings are files, districts are folders, roads are dependencies.",
  },
  {
    icon: BarChart3,
    title: "Deep Analysis",
    tag: "METRICS",
    description:
      "Detect complexity hotspots, unused code, circular dependencies, and architectural patterns at a glance.",
  },
  {
    icon: MessageSquare,
    title: "AI Agent Chat",
    tag: "INTELLIGENCE",
    description:
      "Ask questions about your codebase with an AI agent that has full context of the city visualization.",
  },
]

export function FeatureCards() {
  return (
    <section className="border-t border-border/30 py-20">
      <div className="mx-auto max-w-5xl px-6">
        <div className="text-center mb-12 animate-fade-up delay-500">
          <p className="font-mono text-xs tracking-[0.2em] uppercase text-primary/60">
            Capabilities
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {FEATURES.map((feature, i) => (
            <div
              key={feature.title}
              className={`group relative rounded-xl border border-border/30 bg-card/30 p-6 backdrop-blur-sm transition-all duration-300 hover:border-primary/30 hover:bg-card/50 animate-fade-up delay-${(i + 5) * 100}`}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/5 border border-primary/10 transition-all group-hover:bg-primary/10 group-hover:border-primary/20">
                  <feature.icon className="h-4 w-4 text-primary" />
                </div>
                <span className="font-mono text-[10px] tracking-[0.15em] uppercase text-primary/40">
                  {feature.tag}
                </span>
              </div>
              <h3 className="mt-4 text-base font-semibold text-foreground">
                {feature.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
