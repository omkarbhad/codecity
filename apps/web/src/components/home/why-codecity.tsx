"use client"

import { motion } from "framer-motion"

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
}

const useCases = [
  {
    title: "Onboard New Developers",
    description:
      "Help new team members understand a codebase in minutes instead of days. The city view reveals architecture, module boundaries, and where the important code lives.",
  },
  {
    title: "Spot Technical Debt",
    description:
      "Towering buildings signal large, complex files. Sprawling districts indicate directories that need refactoring. Identify code smells visually before they become problems.",
  },
  {
    title: "Architecture Reviews",
    description:
      "Present codebase structure to stakeholders without drowning in file trees. The 3D city makes architecture tangible — perfect for design reviews and tech talks.",
  },
  {
    title: "Compare Repositories",
    description:
      "Analyze multiple repos to compare structure and complexity. See how microservices stack up, or compare your fork to upstream at a glance.",
  },
]

const techStack = [
  { label: "TypeScript", color: "bg-blue-400" },
  { label: "JavaScript", color: "bg-yellow-400" },
  { label: "Python", color: "bg-emerald-400" },
  { label: "Go", color: "bg-cyan-400" },
  { label: "Rust", color: "bg-orange-400" },
  { label: "Java", color: "bg-red-400" },
  { label: "CSS/HTML", color: "bg-purple-400" },
  { label: "JSON/YAML", color: "bg-zinc-400" },
]

export function WhyCodeCity() {
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
            Why CodeCity?
          </h2>
          <div className="mx-auto mb-4 h-[3px] w-12 rounded-full bg-primary" />
          <p className="text-sm sm:text-base text-zinc-400 max-w-2xl mx-auto leading-relaxed">
            Reading code is hard. Understanding how thousands of files fit together is harder.
            CodeCity turns abstract file trees into something your brain already understands — a city.
          </p>
        </motion.div>

        {/* Use cases grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-16">
          {useCases.map((uc, i) => (
            <motion.div
              key={uc.title}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 320, damping: 30, delay: 0.06 + i * 0.06 }}
              className="group rounded-xl border border-white/[0.06] bg-white/[0.02] p-6 transition-all duration-300 hover:border-red-500/20 hover:bg-white/[0.03]"
            >
              <h3 className="text-[15px] font-semibold text-zinc-50 tracking-tight mb-2">
                {uc.title}
              </h3>
              <p className="text-sm text-zinc-400 leading-relaxed">
                {uc.description}
              </p>
            </motion.div>
          ))}
        </div>

        {/* Supported languages */}
        <motion.div
          {...fadeUp}
          transition={{ type: "spring", stiffness: 300, damping: 30, delay: 0.3 }}
          className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6 sm:p-8 text-center"
        >
          <h3 className="text-[15px] font-semibold text-zinc-50 mb-2">
            Supports 10+ Languages
          </h3>
          <p className="text-sm text-zinc-400 mb-5">
            Every language gets its own color in the city — instantly spot the tech stack.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {techStack.map((lang) => (
              <span
                key={lang.label}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.06] bg-white/[0.04] px-3 py-1 text-xs font-medium text-zinc-300"
              >
                <span className={`h-2 w-2 rounded-full ${lang.color}`} />
                {lang.label}
              </span>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  )
}
