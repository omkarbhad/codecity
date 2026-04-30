"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { Globe, FileCode, Code2, ExternalLink, GitBranch, ArrowRight, Lock } from "lucide-react"

interface DemoProject {
  name: string
  repoUrl: string
  fileCount: number
  lineCount: number
  accent: string
  dots: string[]
  description: string
}

const DEMO_PROJECTS: DemoProject[] = [
  {
    name: "vercel/next.js",
    repoUrl: "https://github.com/vercel/next.js",
    fileCount: 4200,
    lineCount: 312000,
    accent: "#fff",
    dots: ["#6366f1", "#ec4899", "#f59e0b", "#10b981", "#3b82f6"],
    description: "The React Framework",
  },
  {
    name: "facebook/react",
    repoUrl: "https://github.com/facebook/react",
    fileCount: 1840,
    lineCount: 248000,
    accent: "#61dafb",
    dots: ["#61dafb", "#3b82f6", "#6366f1", "#8b5cf6"],
    description: "A JavaScript library for building UIs",
  },
  {
    name: "microsoft/vscode",
    repoUrl: "https://github.com/microsoft/vscode",
    fileCount: 8900,
    lineCount: 1_200_000,
    accent: "#007acc",
    dots: ["#007acc", "#3b82f6", "#10b981", "#f59e0b", "#ec4899"],
    description: "Visual Studio Code",
  },
  {
    name: "tailwindlabs/tailwindcss",
    repoUrl: "https://github.com/tailwindlabs/tailwindcss",
    fileCount: 610,
    lineCount: 84000,
    accent: "#38bdf8",
    dots: ["#38bdf8", "#6366f1", "#10b981", "#f59e0b"],
    description: "Utility-first CSS framework",
  },
  {
    name: "supabase/supabase",
    repoUrl: "https://github.com/supabase/supabase",
    fileCount: 3100,
    lineCount: 420000,
    accent: "#3ecf8e",
    dots: ["#3ecf8e", "#6366f1", "#f59e0b", "#ec4899", "#3b82f6"],
    description: "Open source Firebase alternative",
  },
  {
    name: "trpc/trpc",
    repoUrl: "https://github.com/trpc/trpc",
    fileCount: 720,
    lineCount: 96000,
    accent: "#398ccb",
    dots: ["#398ccb", "#6366f1", "#10b981", "#f59e0b"],
    description: "End-to-end typesafe APIs",
  },
]

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`
  return n.toString()
}

function StaticCard({ project, index }: { project: DemoProject; index: number }) {
  const [owner, repo] = project.name.split("/")
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, type: "spring", stiffness: 300, damping: 30 }}
      className="group relative flex flex-col rounded-2xl border border-white/[0.07] bg-[#08080d] overflow-hidden
        hover:border-white/[0.14] hover:-translate-y-0.5 hover:shadow-[0_16px_48px_rgba(0,0,0,0.55)]
        transition-all duration-300"
    >
      {/* Static preview pane */}
      <div className="relative h-[160px] overflow-hidden bg-[#040408] flex items-center justify-center">
        {/* City grid illustration */}
        <div className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)`,
            backgroundSize: "24px 24px",
          }}
        />
        {/* Accent glow */}
        <div className="absolute inset-0" style={{
          background: `radial-gradient(ellipse 70% 60% at 50% 80%, ${project.accent}18, transparent 70%)`,
        }} />
        {/* Fake building silhouettes */}
        <div className="absolute bottom-0 inset-x-0 flex items-end justify-center gap-[3px] px-6 pb-0">
          {[18, 32, 52, 28, 44, 20, 38, 24, 56, 30, 16, 42, 26, 48, 22].map((h, i) => (
            <div
              key={i}
              className="flex-1 rounded-t-sm opacity-60"
              style={{
                height: `${h}px`,
                background: `linear-gradient(to top, ${project.accent}55, ${project.accent}22)`,
                maxWidth: "14px",
              }}
            />
          ))}
        </div>
        {/* bottom fade */}
        <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-[#08080d] to-transparent pointer-events-none" />
        <div className="absolute inset-x-0 top-0 h-6 bg-gradient-to-b from-[#08080d]/60 to-transparent pointer-events-none" />
        {/* "Login to explore" overlay */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-[#040408]/70 backdrop-blur-[2px]">
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 text-[11px] font-semibold px-3.5 py-1.5 rounded-full border border-white/10 bg-white/[0.06] text-zinc-300 hover:bg-white/[0.10] transition-colors"
          >
            <Lock className="h-3 w-3" />
            Explore this city
          </Link>
        </div>
        {/* district dots */}
        <div className="absolute top-2.5 left-3 flex gap-1 z-10 pointer-events-none">
          {project.dots.map((c, i) => (
            <span key={i} className="h-1.5 w-1.5 rounded-full opacity-80" style={{ background: c }} />
          ))}
        </div>
      </div>

      {/* Card body */}
      <div className="flex flex-col gap-3 p-4">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <Globe className="h-3 w-3 text-zinc-600 shrink-0" />
            <span className="text-[11px] text-zinc-600 font-mono truncate">{owner}/</span>
          </div>
          <h3 className="text-[15px] font-semibold text-zinc-100 truncate leading-tight">{repo}</h3>
          <p className="text-[11px] text-zinc-600 mt-0.5 truncate">{project.description}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <FileCode className="h-3 w-3 text-zinc-700" />
            <span className="text-xs font-mono text-zinc-400">{formatNumber(project.fileCount)}</span>
            <span className="text-[10px] text-zinc-700">files</span>
          </div>
          <div className="h-3 w-px bg-white/[0.06]" />
          <div className="flex items-center gap-1.5">
            <Code2 className="h-3 w-3 text-zinc-700" />
            <span className="text-xs font-mono text-zinc-400">{formatNumber(project.lineCount)}</span>
            <span className="text-[10px] text-zinc-700">lines</span>
          </div>
        </div>
        <div className="flex items-center justify-between pt-1.5 border-t border-white/[0.04]">
          <a
            href={project.repoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-zinc-700 hover:text-zinc-400 transition-colors"
            title="Open on GitHub"
          >
            <GitBranch className="h-3.5 w-3.5" />
          </a>
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 text-[10px] font-semibold px-3 py-1 rounded-md text-white bg-primary hover:bg-primary/85 transition-colors shadow-[0_0_12px_rgba(255,61,61,0.18)]"
          >
            Explore
            <ExternalLink className="h-2.5 w-2.5" />
          </Link>
        </div>
      </div>
    </motion.div>
  )
}

export function ExploreSection() {
  return (
    <section id="explore" className="relative overflow-hidden px-4 py-20 sm:px-6">
      {/* Background glow */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: "radial-gradient(ellipse 60% 40% at 50% 100%, rgba(255,61,61,0.05), transparent 65%)",
        }}
      />

      <div className="relative z-10 mx-auto max-w-6xl">
        {/* Section header */}
        <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="mb-2 inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1"
            >
              <Globe className="h-3 w-3 text-primary" />
              <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-widest">Public Cities</span>
            </motion.div>
            <motion.h2
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.04, type: "spring", stiffness: 300, damping: 30 }}
              className="text-2xl font-bold tracking-tight text-zinc-100 sm:text-3xl"
            >
              Explore Real Codebases
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.08, type: "spring", stiffness: 300, damping: 30 }}
              className="mt-2 text-sm text-zinc-500 max-w-md leading-relaxed"
            >
              Fly through open-source repos visualized as 3D cities — no login required.
            </motion.p>
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.12 }}
          >
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 text-[13px] font-medium text-zinc-400 hover:text-zinc-200 transition-colors group"
            >
              Visualize your repo
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </motion.div>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {DEMO_PROJECTS.map((project, i) => (
            <StaticCard key={project.name} project={project} index={i} />
          ))}
        </div>
      </div>
    </section>
  )
}
