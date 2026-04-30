import { Building2, Clock3, GitBranch, Map, MousePointerClick, Network, Search, Shield, Zap } from "lucide-react"

const features = [
  {
    icon: Building2,
    title: "City layout",
    description:
      "Files become buildings and directories become districts, so structure is visible before anyone opens a file tree.",
  },
  {
    icon: Search,
    title: "Size and language signals",
    description:
      "Building height reflects file size, and color separates languages across the map.",
  },
  {
    icon: MousePointerClick,
    title: "Inspectable files",
    description:
      "Select a building to inspect path, language, size, and related file details in context.",
  },
  {
    icon: GitBranch,
    title: "GitHub import",
    description:
      "Start from a repository URL and keep projects available for later review.",
  },
  {
    icon: Map,
    title: "Architecture review",
    description:
      "Use the map to explain module boundaries, dense areas, and large files during team reviews.",
  },
  {
    icon: Zap,
    title: "Fast feedback",
    description:
      "Analyze a repository, open the city, and find the files worth discussing first.",
  },
  {
    icon: Network,
    title: "Dependency paths",
    description:
      "Trace import relationships and see how files connect across districts.",
  },
  {
    icon: Clock3,
    title: "Project history",
    description:
      "Return to saved cities and compare how the codebase shifts across reviews.",
  },
  {
    icon: Shield,
    title: "Local-first desktop app",
    description:
      "The main CodeCity app runs as a Tauri desktop application with repository analysis handled in Rust.",
  },
]

export function Features() {
  return (
    <section id="features" className="border-b border-white/[0.08] px-4 py-16 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto mb-8 max-w-2xl text-center">
          <h2 className="text-2xl font-semibold text-zinc-50">What CodeCity Shows</h2>
          <p className="mt-3 text-sm leading-6 text-zinc-400">
            The homepage stays close to the product: repository structure, file scale,
            language distribution, and the places a team should inspect first.
          </p>
        </div>

        <div className="grid gap-px overflow-hidden rounded-lg border border-white/[0.08] bg-white/[0.08] sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => {
            const Icon = feature.icon
            return (
              <article key={feature.title} className="bg-[#0f0f10] p-5 text-center">
                <Icon className="mx-auto mb-4 size-5 text-zinc-400" />
                <h3 className="text-sm font-semibold text-zinc-100">{feature.title}</h3>
                <p className="mt-2 text-sm leading-6 text-zinc-500">{feature.description}</p>
              </article>
            )
          })}
        </div>
      </div>
    </section>
  )
}
