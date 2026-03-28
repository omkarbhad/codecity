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
      "Buildings scale by line count — the tallest towers are your most complex files. Spot refactoring targets before reading a single line of code.",
    meta: "Core",
  },
  {
    icon: Zap,
    title: "Instant Analysis",
    description:
      "Paste a GitHub URL. No CLI, no config files, no cloning — your 3D city renders in under 60 seconds, even for monorepos.",
    meta: "Speed",
  },
  {
    icon: Search,
    title: "Code Insights",
    description:
      "Building height encodes file size. Color encodes language. Cluster density reveals coupling. Your architecture becomes self-documenting.",
    meta: "Analysis",
  },
  {
    icon: GitBranch,
    title: "GitHub Integration",
    description:
      "Works with any public repo instantly. Sign in with GitHub to unlock your private repositories — one click, no tokens to manage.",
    meta: "GitHub",
  },
  {
    icon: MousePointerClick,
    title: "Interactive Explorer",
    description:
      "Click a building to see its file path, language, and size. Hover for quick stats. Pan, zoom, orbit — explore code the way you explore Google Earth.",
    meta: "3D",
  },
  {
    icon: Map,
    title: "District Map",
    description:
      "TypeScript, Python, CSS — each language gets its own color-coded district. A bird's-eye minimap helps you orient across even the largest codebases.",
    meta: "Navigation",
  },
  {
    icon: Layers,
    title: "Persistent Projects",
    description:
      "Every city you build is saved. Come back next sprint to re-analyze and see how your codebase has grown, shrunk, or shifted.",
    meta: "Cloud",
  },
  {
    icon: Shield,
    title: "Privacy First",
    description:
      "Your source code never leaves GitHub. CodeCity only stores the structural metadata needed to render your city — no code, no secrets, no risk.",
    meta: "Security",
  },
]

const spans = [
  "md:col-span-4 md:row-span-2",
  "md:col-span-2 md:row-span-1",
  "md:col-span-2 md:row-span-1",
  "md:col-span-3 md:row-span-1",
  "md:col-span-3 md:row-span-1",
  "md:col-span-2 md:row-span-1",
  "md:col-span-2 md:row-span-1",
  "md:col-span-2 md:row-span-1",
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

function DotGrid() {
  return (
    <div
      className="pointer-events-none absolute inset-0 opacity-[0.025] [mask-image:radial-gradient(ellipse_80%_60%_at_50%_40%,black,transparent)]"
      style={{
        backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.8) 1px, transparent 1px)",
        backgroundSize: "28px 28px",
      }}
    />
  )
}

function BentoCard({
  span,
  feature,
}: {
  span: string
  feature: (typeof features)[number]
}) {
  const Icon = feature.icon
  return (
    <motion.article
      variants={item}
      className={`group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-black/40 p-5 transition-all duration-300 hover:border-white/[0.20] ${span}`}
    >
      <header className="mb-2 flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-red-400/20 bg-red-500/10 text-red-400 transition-colors duration-300 group-hover:border-red-400/35 group-hover:text-red-300">
          <Icon className="h-4 w-4" />
        </div>
        <h3 className="text-base font-semibold leading-tight text-zinc-50">
          {feature.title}
        </h3>
        {feature.meta && (
          <span className="ml-auto rounded-full border border-white/[0.08] px-2 py-0.5 text-[10px] uppercase tracking-wide text-zinc-500">
            {feature.meta}
          </span>
        )}
      </header>
      <p className="text-sm text-zinc-400 max-w-prose leading-relaxed">
        {feature.description}
      </p>

      {/* Hover glow */}
      <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-red-500/[0.04] via-transparent to-transparent" />
      </div>
    </motion.article>
  )
}

export function Features() {
  return (
    <section id="features" className="relative py-24 sm:py-32">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/[0.06]" />

      <div className="relative max-w-5xl mx-auto px-5 sm:px-8 md:px-10">
        {/* Dot grid background */}
        <DotGrid />

        {/* Section header */}
        <header className="relative mb-10 flex items-end justify-between border-b border-white/[0.10] pb-6">
          <div>
            <motion.h2
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 340, damping: 30 }}
              className="text-3xl md:text-5xl font-black tracking-tight bg-gradient-to-b from-white to-zinc-300 bg-clip-text text-transparent"
            >
              Features
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30, delay: 0.04 }}
              className="mt-2 text-sm md:text-base text-zinc-500"
            >
              Each feature maps a different dimension of your codebase into something you can see, click, and explore.
            </motion.p>
          </div>
        </header>

        {/* Bento grid */}
        <motion.div
          variants={container}
          initial="hidden"
          animate="visible"
          className="relative grid grid-cols-1 gap-3 md:grid-cols-6 auto-rows-[minmax(120px,auto)]"
        >
          {features.map((feature, i) => (
            <BentoCard key={feature.title} span={spans[i]} feature={feature} />
          ))}
        </motion.div>

        {/* Footer line */}
        <footer className="relative mt-16 border-t border-white/[0.06] pt-6 text-xs text-zinc-600">
          Built with reliability, speed, and taste.
        </footer>
      </div>
    </section>
  )
}
