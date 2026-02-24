import { Eye, BarChart3, MessageSquare } from "lucide-react"

const FEATURES = [
  {
    icon: Eye,
    title: "3D Visualization",
    description:
      "Navigate your codebase as a 3D city with buildings, districts, and roads representing files, folders, and dependencies.",
  },
  {
    icon: BarChart3,
    title: "Deep Analysis",
    description:
      "Detect complexity hotspots, unused code, circular dependencies, and architectural patterns at a glance.",
  },
  {
    icon: MessageSquare,
    title: "AI Chat",
    description:
      "Ask questions about your codebase with an AI agent that has full context of the visualization.",
  },
]

export function FeatureCards() {
  return (
    <section className="border-t border-border py-16">
      <div className="mx-auto grid max-w-5xl gap-8 px-6 md:grid-cols-3">
        {FEATURES.map((feature) => (
          <div
            key={feature.title}
            className="rounded-xl border border-border bg-card p-6"
          >
            <feature.icon className="h-8 w-8 text-primary" />
            <h3 className="mt-4 text-lg font-semibold">{feature.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {feature.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  )
}
