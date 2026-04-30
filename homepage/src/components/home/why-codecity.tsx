"use client"

import { motion } from "framer-motion"

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
}

const useCases = [
  {
    title: "Onboard Faster",
    description:
      "New team members understand codebase structure in minutes — not days. The city reveals module boundaries and where the important code actually lives.",
  },
  {
    title: "Spot Technical Debt",
    description:
      "Towering buildings mean large, complex files. Sprawling districts mean over-coupled directories. See refactoring targets before opening a single file.",
  },
  {
    title: "Architecture Reviews",
    description:
      "Present codebase structure without drowning in file trees. The 3D city makes architecture tangible — perfect for design reviews, team demos, and tech talks.",
  },
  {
    title: "Compare Repos",
    description:
      "Analyze multiple repos side by side. See how microservices stack up, track growth over time, or compare your fork to upstream at a glance.",
  },
]

const techStack = [
  { label: "TypeScript", color: "bg-blue-400" },
  { label: "JavaScript", color: "bg-yellow-400" },
  { label: "Python", color: "bg-emerald-400" },
  { label: "Go", color: "bg-cyan-400" },
  { label: "Rust", color: "bg-orange-400" },
  { label: "Java", color: "bg-red-400" },
  { label: "Kotlin", color: "bg-violet-400" },
  { label: "Ruby", color: "bg-rose-400" },
  { label: "PHP", color: "bg-indigo-400" },
  { label: "Swift", color: "bg-orange-300" },
  { label: "CSS", color: "bg-purple-400" },
  { label: "SCSS", color: "bg-pink-400" },
  { label: "HTML", color: "bg-amber-400" },
  { label: "Markdown", color: "bg-slate-400" },
  { label: "JSON", color: "bg-zinc-400" },
  { label: "YAML", color: "bg-teal-400" },
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
            Code You Can Actually Navigate
          </h2>
          <div className="mx-auto mb-4 h-[3px] w-12 rounded-full bg-primary" />
          <p className="text-sm sm:text-base text-zinc-400 max-w-2xl mx-auto leading-relaxed">
            File trees scale poorly. Tens of thousands of files become impossible to reason about.
            CodeCity maps your codebase onto a 3D city — a mental model your brain already knows how to use.
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
            16 Languages. Real Parsing, Not Regex.
          </h3>
          <p className="text-sm text-zinc-400 mb-5">
            CodeCity parses actual syntax trees — functions, classes, imports, and complexity metrics.
            Every language gets its own district color in the city.
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
