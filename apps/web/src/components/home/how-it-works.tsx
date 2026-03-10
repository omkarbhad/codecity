"use client"

import { motion } from "framer-motion"
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

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
}

export function HowItWorks() {
  return (
    <section className="relative py-24 sm:py-32">
      <div className="absolute top-0 left-0 right-0 h-px bg-white/[0.06]" />

      <div className="max-w-5xl mx-auto px-5 sm:px-8 md:px-10">
        {/* Section header */}
        <motion.div
          {...fadeUp}
          transition={{ type: "spring", stiffness: 340, damping: 30 }}
          className="text-center mb-16"
        >
          <h2 className="mb-3 bg-gradient-to-b from-white to-zinc-300 bg-clip-text text-2xl font-bold tracking-tight text-transparent sm:text-3xl">
            Three Steps to Your Code City
          </h2>
          <div className="mx-auto mb-4 h-[3px] w-12 rounded-full bg-primary" />
          <p className="text-sm sm:text-base text-zinc-400 max-w-xl mx-auto leading-relaxed">
            From repository to visualization in under a minute.
          </p>
        </motion.div>

        {/* Horizontal stepper — desktop */}
        <div className="hidden md:block">
          <div className="grid grid-cols-3 gap-6 relative">
            {/* Connecting line */}
            <div className="absolute top-5 left-[calc(16.67%+20px)] right-[calc(16.67%+20px)] h-px bg-white/[0.06]" />

            {steps.map((item, i) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 320, damping: 30, delay: 0.08 + i * 0.07 }}
                className="relative text-center"
              >
                {/* Number badge */}
                <div className="relative z-10 mb-6 inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white shadow-[0_0_24px_rgba(255,61,61,0.38)]">
                  <span className="text-sm font-bold">{item.step}</span>
                </div>

                {/* Card */}
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 transition-all duration-300 hover:border-red-500/35 hover:bg-white/[0.03] hover:shadow-[0_0_28px_rgba(255,61,61,0.12)]">
                  <div className="flex justify-center mb-4">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-red-400/25 bg-red-500/12 text-red-300">
                      <item.icon className="h-5 w-5" />
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold text-zinc-50 tracking-tight mb-2">
                    {item.title}
                  </h3>
                  <p className="text-sm text-zinc-400 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Vertical stepper — mobile */}
        <div className="md:hidden space-y-6">
          {steps.map((item, index) => (
            <motion.div
              key={item.step}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 320, damping: 30, delay: 0.08 + index * 0.07 }}
              className="relative flex gap-4"
            >
              {/* Vertical line + badge */}
              <div className="flex flex-col items-center">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-white shadow-[0_0_24px_rgba(255,61,61,0.38)]">
                  <span className="text-sm font-bold">{item.step}</span>
                </div>
                {index < steps.length - 1 && (
                  <div className="w-px flex-1 bg-white/[0.06] mt-2" />
                )}
              </div>

              {/* Content */}
              <div className="pb-6 flex-1">
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 transition-all duration-300 hover:border-red-500/35 hover:bg-white/[0.03] hover:shadow-[0_0_28px_rgba(255,61,61,0.12)]">
                  <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg border border-red-400/25 bg-red-500/12 text-red-300">
                    <item.icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-lg font-semibold text-zinc-50 tracking-tight mb-2">
                    {item.title}
                  </h3>
                  <p className="text-sm text-zinc-400 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
