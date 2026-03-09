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
          transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="text-center mb-16"
        >
          <h2 className="text-2xl sm:text-3xl font-bold text-[#fafafa] tracking-tight mb-3">
            Three Steps to Your Code City
          </h2>
          <div className="mx-auto w-12 h-[3px] bg-primary rounded-full mb-4" />
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
                transition={{ duration: 0.4, delay: 0.1 + i * 0.1, ease: [0.25, 0.46, 0.45, 0.94] }}
                className="relative text-center"
              >
                {/* Number badge */}
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white mb-6 relative z-10">
                  <span className="text-sm font-bold">{item.step}</span>
                </div>

                {/* Card */}
                <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-5 hover:border-primary/25 transition-all duration-300">
                  <div className="flex justify-center mb-4">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/[0.04] text-primary">
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
              transition={{ duration: 0.4, delay: 0.1 + index * 0.1, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="relative flex gap-4"
            >
              {/* Vertical line + badge */}
              <div className="flex flex-col items-center">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-white">
                  <span className="text-sm font-bold">{item.step}</span>
                </div>
                {index < steps.length - 1 && (
                  <div className="w-px flex-1 bg-white/[0.06] mt-2" />
                )}
              </div>

              {/* Content */}
              <div className="pb-6 flex-1">
                <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-5 hover:border-primary/25 transition-all duration-300">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/[0.04] text-primary mb-3">
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
