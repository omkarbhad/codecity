import {
  Building2,
  Zap,
  Search,
  GitBranch,
  MousePointerClick,
  Map,
} from "lucide-react"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@codecity/ui/components/card"

const features = [
  {
    icon: Building2,
    title: "3D City Visualization",
    description:
      "Files become buildings, directories become districts. Navigate your codebase like exploring a real city.",
  },
  {
    icon: Zap,
    title: "Instant Analysis",
    description:
      "Paste a GitHub URL, get a full visualization in seconds. No setup, no configuration required.",
  },
  {
    icon: Search,
    title: "Code Insights",
    description:
      "Spot complexity hotspots, identify patterns, and understand architecture at a glance.",
  },
  {
    icon: GitBranch,
    title: "GitHub Integration",
    description:
      "Works with any public or private repository via the GitHub API. Full branch and org support.",
  },
  {
    icon: MousePointerClick,
    title: "Interactive Explorer",
    description:
      "Click buildings to view source code, hover for file metrics. Explore your codebase interactively.",
  },
  {
    icon: Map,
    title: "District Map",
    description:
      "Color-coded districts by file type with minimap navigation. See the big picture instantly.",
  },
]

export function Features() {
  return (
    <section className="relative py-24 sm:py-32 bg-zinc-950">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* Section header */}
        <div className="text-center mb-16">
          <p className="text-xs font-mono uppercase tracking-widest text-primary mb-4">
            Features
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight mb-4">
            Everything You Need to Understand Code
          </h2>
          <p className="text-base text-zinc-400 max-w-2xl mx-auto leading-relaxed">
            Powerful tools to visualize, analyze, and navigate complex codebases
            with ease.
          </p>
        </div>

        {/* Feature grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature) => (
            <Card
              key={feature.title}
              className="group min-h-[200px] rounded-2xl border border-zinc-800/50 bg-zinc-900/50 backdrop-blur-sm p-6 transition-all duration-300 hover:border-primary/30 hover:bg-zinc-900/80"
            >
              <CardHeader className="p-0">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-800 text-primary mb-4 transition-all duration-300 group-hover:bg-primary/10 group-hover:shadow-lg group-hover:shadow-primary/10">
                  <feature.icon className="h-6 w-6" />
                </div>
                <CardTitle className="text-lg font-bold text-white tracking-tight">
                  {feature.title}
                </CardTitle>
                <CardDescription className="text-base text-zinc-400 leading-relaxed mt-2">
                  {feature.description}
                </CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
