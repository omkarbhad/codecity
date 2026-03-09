import { Link2, Cpu, Building } from "lucide-react"

const steps = [
  {
    step: 1,
    icon: Link2,
    title: "Paste URL",
    description:
      "Drop any GitHub repository URL into CodeCity. Public or private repos both work seamlessly.",
  },
  {
    step: 2,
    icon: Cpu,
    title: "AI Analysis",
    description:
      "Our engine analyzes file structure, complexity, and dependencies to build your city blueprint.",
  },
  {
    step: 3,
    icon: Building,
    title: "Explore City",
    description:
      "Navigate your interactive 3D cityscape. Click buildings to view code, hover for insights.",
  },
]

export function HowItWorks() {
  return (
    <section className="relative py-24 sm:py-32 bg-zinc-950">
      {/* Subtle top border */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-zinc-800 to-transparent" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* Section header */}
        <div className="text-center mb-16">
          <p className="text-xs font-mono uppercase tracking-widest text-primary mb-4">
            How It Works
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight mb-4">
            Three Steps to Your Code City
          </h2>
          <p className="text-base text-zinc-400 max-w-xl mx-auto leading-relaxed">
            From repository to visualization in under a minute.
          </p>
        </div>

        {/* Horizontal stepper — desktop */}
        <div className="hidden md:block">
          <div className="grid grid-cols-3 gap-8 relative">
            {/* Connecting line */}
            <div className="absolute top-8 left-[calc(16.67%+24px)] right-[calc(16.67%+24px)] h-px bg-zinc-800" />

            {steps.map((item) => (
              <div key={item.step} className="relative text-center">
                {/* Number badge */}
                <div className="inline-flex h-16 w-16 items-center justify-center rounded-full border border-zinc-800/50 bg-zinc-900/50 backdrop-blur-sm mb-6 relative z-10">
                  <span className="text-xl font-bold text-primary">
                    {item.step}
                  </span>
                </div>

                {/* Icon */}
                <div className="flex justify-center mb-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-800 text-primary">
                    <item.icon className="h-6 w-6" />
                  </div>
                </div>

                {/* Text */}
                <h3 className="text-xl font-bold text-white tracking-tight mb-2">
                  {item.title}
                </h3>
                <p className="text-base text-zinc-400 leading-relaxed max-w-xs mx-auto">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Vertical stepper — mobile */}
        <div className="md:hidden space-y-8">
          {steps.map((item, index) => (
            <div key={item.step} className="relative flex gap-6">
              {/* Vertical line + badge */}
              <div className="flex flex-col items-center">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-zinc-800/50 bg-zinc-900/50 backdrop-blur-sm">
                  <span className="text-lg font-bold text-primary">
                    {item.step}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div className="w-px flex-1 bg-zinc-800 mt-2" />
                )}
              </div>

              {/* Content */}
              <div className="pb-8">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-800 text-primary mb-3">
                  <item.icon className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-bold text-white tracking-tight mb-2">
                  {item.title}
                </h3>
                <p className="text-base text-zinc-400 leading-relaxed">
                  {item.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
