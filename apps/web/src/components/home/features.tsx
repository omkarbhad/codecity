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
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] as const } },
}

export function Features() {
  return (
    <section className="relative py-24 sm:py-32">
      <div className="max-w-5xl mx-auto px-5 sm:px-8 md:px-10">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="text-center mb-16"
        >
          <h2 className="text-2xl sm:text-3xl font-bold text-[#fafafa] tracking-tight mb-3">
            Everything You Need to Understand Code
          </h2>
          <div className="mx-auto w-12 h-[3px] bg-primary rounded-full mb-4" />
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
              className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-5 hover:border-primary/25 transition-all duration-300"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/[0.04] text-primary mb-4">
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
