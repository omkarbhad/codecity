import { Building, Cpu, Link2 } from "lucide-react"

const steps = [
  {
    icon: Link2,
    title: "Add a repository",
    description: "Paste a GitHub URL or open a local project from the desktop app.",
  },
  {
    icon: Cpu,
    title: "Analyze structure",
    description: "The Rust parser reads files, languages, imports, and size signals.",
  },
  {
    icon: Building,
    title: "Inspect the city",
    description: "Open the 3D map, select buildings, and review the areas that need attention.",
  },
]

export function HowItWorks() {
  return (
    <section id="how-it-works" className="border-b border-white/[0.08] px-4 py-16 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 max-w-2xl">
          <h2 className="text-2xl font-semibold text-zinc-50">How It Works</h2>
          <p className="mt-3 text-sm leading-6 text-zinc-400">
            The workflow is intentionally short. Bring in code, let CodeCity compute
            the map, then inspect the result.
          </p>
        </div>

        <ol className="grid gap-px overflow-hidden rounded-lg border border-white/[0.08] bg-white/[0.08] md:grid-cols-3">
          {steps.map((step, index) => {
            const Icon = step.icon
            return (
              <li key={step.title} className="bg-[#0f0f10] p-5">
                <div className="mb-5 flex items-center justify-between">
                  <Icon className="size-5 text-zinc-400" />
                  <span className="font-mono text-xs text-zinc-600">0{index + 1}</span>
                </div>
                <h3 className="text-sm font-semibold text-zinc-100">{step.title}</h3>
                <p className="mt-2 text-sm leading-6 text-zinc-500">{step.description}</p>
              </li>
            )
          })}
        </ol>
      </div>
    </section>
  )
}
