"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { Globe, FileCode, Code2, ExternalLink, GitBranch, ArrowRight } from "lucide-react"
import { MiniCityPreview } from "@/components/city/mini-city-preview"
import type { CitySnapshot } from "@/lib/types/city"

interface PublicProject {
  id: string
  name: string
  repoUrl: string
  fileCount?: number
  lineCount?: number
  createdAt: string
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`
  return n.toString()
}

/** Lazy-loads the city snapshot for an explore card */
function useCitySnapshot(projectId: string) {
  const [snapshot, setSnapshot] = useState<CitySnapshot | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetch(`/api/projects/${projectId}/snapshot`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data) setSnapshot(data as CitySnapshot)
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [projectId])

  return { snapshot, loading }
}

function ExploreCard({ project, index }: { project: PublicProject; index: number }) {
  const { snapshot, loading } = useCitySnapshot(project.id)
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
      {/* 3D city preview — always visible, auto-orbiting */}
      <div className="relative h-[160px] overflow-hidden bg-[#040408]">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
            <div className="absolute inset-0 -translate-x-full animate-[shimmer-slide_2s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/[0.04] to-transparent" />
            <span className="text-[10px] font-mono text-zinc-700 relative z-10 animate-pulse">rendering city…</span>
          </div>
        )}
        {snapshot && (
          <>
            <div className="absolute inset-0 pointer-events-none">
              <MiniCityPreview snapshot={snapshot} speed={0.35} className="w-full h-full" />
            </div>
            {/* gradient fade at bottom for card body transition */}
            <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-[#08080d] to-transparent pointer-events-none" />
            {/* subtle top vignette */}
            <div className="absolute inset-x-0 top-0 h-6 bg-gradient-to-b from-[#08080d]/60 to-transparent pointer-events-none" />
          </>
        )}

        {/* district color dots overlay */}
        {snapshot && (
          <div className="absolute top-2.5 left-3 flex gap-1 z-10 pointer-events-none">
            {snapshot.districts.slice(0, 5).map((d) => (
              <span
                key={d.name}
                className="h-1.5 w-1.5 rounded-full opacity-80"
                style={{ background: d.color }}
                title={d.name}
              />
            ))}
            {snapshot.districts.length > 5 && (
              <span className="text-[9px] font-mono text-zinc-600">+{snapshot.districts.length - 5}</span>
            )}
          </div>
        )}
      </div>

      {/* Card body */}
      <div className="flex flex-col gap-3 p-4">
        {/* Repo info */}
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <Globe className="h-3 w-3 text-zinc-600 shrink-0" />
            <span className="text-[11px] text-zinc-600 font-mono truncate">{owner}/</span>
          </div>
          <h3 className="text-[15px] font-semibold text-zinc-100 truncate leading-tight">{repo}</h3>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <FileCode className="h-3 w-3 text-zinc-700" />
            <span className="text-xs font-mono text-zinc-400">{formatNumber(project.fileCount ?? 0)}</span>
            <span className="text-[10px] text-zinc-700">files</span>
          </div>
          <div className="h-3 w-px bg-white/[0.06]" />
          <div className="flex items-center gap-1.5">
            <Code2 className="h-3 w-3 text-zinc-700" />
            <span className="text-xs font-mono text-zinc-400">{formatNumber(project.lineCount ?? 0)}</span>
            <span className="text-[10px] text-zinc-700">lines</span>
          </div>
        </div>

        {/* Footer */}
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
            href={`/project/${project.id}`}
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

function ExploreSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-white/[0.05] bg-[#08080d] overflow-hidden">
          <div className="relative h-[160px] overflow-hidden bg-[#040408]">
              <div className="absolute inset-0 -translate-x-full animate-[shimmer-slide_2s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/[0.03] to-transparent" />
            </div>
          <div className="p-4 space-y-3">
            <div className="space-y-1.5">
              <div className="h-2 w-10 rounded-full bg-white/[0.04] animate-pulse" />
              <div className="h-4 w-28 rounded-md bg-white/[0.06] animate-pulse" />
            </div>
            <div className="flex gap-3">
              <div className="h-3 w-16 rounded bg-white/[0.04] animate-pulse" />
              <div className="h-3 w-16 rounded bg-white/[0.04] animate-pulse" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export function ExploreSection() {
  const [projects, setProjects] = useState<PublicProject[] | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/projects?tab=explore")
      .then((r) => (r.ok ? r.json() : []))
      .then((data: PublicProject[]) => setProjects(data))
      .catch(() => setProjects([]))
      .finally(() => setLoading(false))
  }, [])

  // Don't render section at all if there are no public projects yet
  if (!loading && (!projects || projects.length === 0)) return null

  return (
    <section className="relative px-4 py-20 sm:px-6 overflow-hidden">
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
        {loading ? (
          <ExploreSkeleton />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects!.slice(0, 6).map((project, i) => (
              <ExploreCard key={project.id} project={project} index={i} />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
