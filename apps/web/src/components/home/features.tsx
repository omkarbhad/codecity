"use client"

import { motion } from "framer-motion"
import {
  Building2,
  Zap,
  Search,
  GitBranch,
  MousePointerClick,
  Map,
} from "lucide-react"

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

const container = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
}

const item = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 320, damping: 30 } as const,
  },
}

export function Features() {
  return (
    <section className="relative py-24 sm:py-32">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/[0.06]" />
      <div className="max-w-5xl mx-auto px-5 sm:px-8 md:px-10">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 340, damping: 30 }}
          className="text-center mb-16"
        >
          <h2 className="mb-3 bg-gradient-to-b from-white to-zinc-300 bg-clip-text text-2xl font-bold tracking-tight text-transparent sm:text-3xl">
            Everything You Need to Understand Code
          </h2>
          <div className="mx-auto mb-4 h-[3px] w-12 rounded-full bg-primary" />
          <p className="text-sm sm:text-base text-zinc-400 max-w-xl mx-auto leading-relaxed">
            Powerful tools to visualize, analyze, and navigate complex codebases
            with ease.
          </p>
        </motion.div>

        {/* Feature grid */}
        <motion.div
          variants={container}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {features.map((feature) => (
            <motion.div
              key={feature.title}
              variants={item}
              className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 transition-all duration-300 hover:border-red-500/35 hover:bg-white/[0.03] hover:shadow-[0_0_32px_rgba(255,61,61,0.12)]"
            >
              <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-lg border border-red-400/25 bg-red-500/12 text-red-300">
                <feature.icon className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-semibold text-zinc-50 tracking-tight">
                {feature.title}
              </h3>
              <p className="text-sm text-zinc-400 leading-relaxed mt-2">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
