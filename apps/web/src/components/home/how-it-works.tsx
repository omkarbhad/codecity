import { Link2, Cpu, Building } from "lucide-react"

const steps = [
  {
    step: "01",
    icon: Link2,
    title: "Paste Repository URL",
    description:
      "Drop any GitHub repository URL into CodeCity. Public or private repos both work seamlessly.",
  },
  {
    step: "02",
    icon: Cpu,
    title: "AI Analysis",
    description:
      "Our engine analyzes file structure, code complexity, and dependencies to build your city blueprint.",
  },
  {
    step: "03",
    icon: Building,
    title: "Explore Your City",
    description:
      "Navigate your interactive 3D cityscape. Click buildings to view code, hover for insights.",
  },
]

export function HowItWorks() {
  return (
    <section className="relative py-24 sm:py-32 bg-zinc-950">
      {/* Subtle top border */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-zinc-800 to-transparent" />

      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        {/* Section header */}
        <div className="text-center mb-16">
          <p className="text-primary font-mono text-sm uppercase tracking-[0.2em] mb-4">
            How It Works
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Three Steps to Your Code City
          </h2>
          <p className="text-zinc-400 max-w-xl mx-auto">
            From repository to visualization in under a minute.
          </p>
        </div>

        {/* Timeline */}
        <div className="relative">
          {/* Connecting line */}
          <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-primary/50 via-primary/20 to-transparent hidden lg:block" />

          {/* Mobile vertical line */}
          <div className="absolute left-6 top-0 bottom-0 border-l-2 border-primary/20 lg:hidden" />

          <div className="space-y-12 lg:space-y-0">
            {steps.map((item, index) => (
              <div
                key={item.step}
                className={`relative lg:flex lg:items-center lg:gap-12 ${
                  index % 2 === 0 ? "lg:flex-row" : "lg:flex-row-reverse"
                }`}
              >
                {/* Content card */}
                <div
                  className={`lg:w-1/2 ${index % 2 === 0 ? "lg:text-right lg:pr-16" : "lg:text-left lg:pl-16"} pl-14 lg:pl-0`}
                >
                  <div
                    className={`inline-block p-6 rounded-xl border border-zinc-800 bg-zinc-900/50 backdrop-blur-sm ${
                      index % 2 === 0 ? "lg:ml-auto" : "lg:mr-auto"
                    }`}
                  >
                    <div
                      className={`flex items-center gap-4 mb-4 ${index % 2 === 0 ? "lg:flex-row-reverse" : ""}`}
                    >
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
                        <item.icon className="h-6 w-6 text-primary" />
                      </div>
                      <span className="font-mono text-4xl font-bold text-zinc-500/50">
                        {item.step}
                      </span>
                    </div>
                    <h3
                      className={`text-xl font-semibold text-white mb-2 ${index % 2 === 0 ? "lg:text-right" : "lg:text-left"}`}
                    >
                      {item.title}
                    </h3>
                    <p
                      className={`text-zinc-300 text-sm leading-relaxed max-w-sm ${index % 2 === 0 ? "lg:ml-auto" : ""}`}
                    >
                      {item.description}
                    </p>
                  </div>
                </div>

                {/* Center dot (desktop only) */}
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 hidden lg:flex items-center justify-center">
                  <div className="h-5 w-5 rounded-full bg-primary shadow-[0_0_20px_hsl(var(--primary)/0.5)]" />
                </div>

                {/* Spacer for alternating layout */}
                <div className="hidden lg:block lg:w-1/2" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
