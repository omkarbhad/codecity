import { Building2, Zap, Eye, GitBranch, Layers, BarChart3 } from "lucide-react"

const features = [
  {
    icon: Building2,
    title: "3D City Visualization",
    description: "Each file becomes a building, directories become districts. Navigate your codebase like exploring a real city."
  },
  {
    icon: Zap,
    title: "Instant Analysis",
    description: "Paste any GitHub URL and get a complete visualization in seconds. No setup, no configuration needed."
  },
  {
    icon: Eye,
    title: "Code Insights",
    description: "Spot patterns, identify complexity hotspots, and understand architecture at a glance."
  },
  {
    icon: GitBranch,
    title: "Git Integration",
    description: "Connect with GitHub to analyze any public or private repository with full branch support."
  },
  {
    icon: Layers,
    title: "Layered Views",
    description: "Toggle between different perspectives: file types, complexity, change frequency, and more."
  },
  {
    icon: BarChart3,
    title: "Metrics Dashboard",
    description: "Track code health with built-in metrics: LOC, complexity scores, and dependency graphs."
  }
]

export function Features() {
  return (
    <section className="relative py-24 sm:py-32 bg-zinc-950">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* Section header */}
        <div className="text-center mb-16">
          <p className="text-cyan-500 font-mono text-sm uppercase tracking-[0.2em] mb-4">
            Features
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Everything You Need to Understand Code
          </h2>
          <p className="text-zinc-400 max-w-2xl mx-auto">
            Powerful tools to visualize, analyze, and navigate complex codebases with ease.
          </p>
        </div>

        {/* Feature grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="group p-6 rounded-xl border border-zinc-800 bg-zinc-900/50 backdrop-blur-sm transition-all duration-300 hover:border-cyan-500/30 hover:bg-zinc-900/80"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-zinc-800 text-cyan-500 mb-4 transition-all duration-300 group-hover:bg-cyan-500/10 group-hover:shadow-[0_0_20px_rgba(6,182,212,0.2)]">
                <feature.icon className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">
                {feature.title}
              </h3>
              <p className="text-zinc-400 text-sm leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
