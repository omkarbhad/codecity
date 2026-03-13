"use client"

import { motion } from "framer-motion"
import {
  Building2,
  Zap,
  Search,
  GitBranch,
  MousePointerClick,
  Map,
  Layers,
  Shield,
} from "lucide-react"

const features = [
  {
    icon: Building2,
    title: "3D City Visualization",
    description:
      "Files become buildings scaled by line count, directories become districts. Navigate your codebase like exploring a real city skyline.",
  },
  {
    icon: Zap,
    title: "Instant Analysis",
    description:
      "Paste a GitHub URL and get a full visualization in seconds. Background processing handles repos of any size — no setup needed.",
  },
  {
    icon: Search,
    title: "Code Insights",
    description:
      "Spot complexity hotspots, identify patterns, and understand architecture at a glance. Building height reveals file size, color shows language.",
  },
  {
    icon: GitBranch,
    title: "GitHub Integration",
    description:
      "Works with any public or private repository. Sign in with GitHub to analyze your private repos with full OAuth token support.",
  },
  {
    icon: MousePointerClick,
    title: "Interactive Explorer",
    description:
      "Click any building to view source details — file path, language, line count. Hover for quick metrics. Pan, zoom, and orbit the 3D scene.",
  },
  {
    icon: Map,
    title: "District Map",
    description:
      "Color-coded districts by file type with minimap navigation. TypeScript, Python, CSS — each gets its own neighborhood in the city.",
  },
  {
    icon: Layers,
    title: "Persistent Projects",
    description:
      "Your analyzed cities are saved to the cloud. Come back anytime to explore, or hit re-analyze to refresh with the latest changes.",
  },
  {
    icon: Shield,
    title: "Privacy First",
    description:
      "Code is analyzed on-the-fly and never stored. Only the visualization metadata is persisted — your source code stays on GitHub.",
  },
]

const container = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
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
    <section id="features" className="relative py-24 sm:py-32">
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
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          {features.map((feature) => (
            <motion.div
              key={feature.title}
              variants={item}
              className="group rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 transition-all duration-300 hover:border-red-500/25 hover:bg-white/[0.03] hover:shadow-[0_0_32px_rgba(255,61,61,0.08)] cursor-default"
            >
              <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-lg border border-red-400/20 bg-red-500/10 text-red-400 transition-colors duration-300 group-hover:border-red-400/35 group-hover:text-red-300">
                <feature.icon className="h-5 w-5" />
              </div>
              <h3 className="text-[15px] font-semibold text-zinc-50 tracking-tight">
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
