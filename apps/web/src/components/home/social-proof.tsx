"use client"

import { useRef, useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Badge } from "@codecity/ui/components/badge"

const REPOS = [
  { name: "next.js",      lang: "JavaScript", color: "#f7df1e" },
  { name: "TypeScript",   lang: "TypeScript",  color: "#3178c6" },
  { name: "react",        lang: "TypeScript",  color: "#61dafb" },
  { name: "vite",         lang: "TypeScript",  color: "#646cff" },
  { name: "tailwindcss",  lang: "CSS",         color: "#38bdf8" },
  { name: "langchain",    lang: "Python",      color: "#3776ab" },
  { name: "fastapi",      lang: "Python",      color: "#009688" },
  { name: "prisma",       lang: "TypeScript",  color: "#5a67d8" },
]

function useInView(threshold = 0.1) {
  const ref = useRef<HTMLDivElement>(null)
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setInView(true) },
      { threshold }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [threshold])
  return { ref, inView }
}

export function SocialProof() {
  const { ref, inView } = useInView(0.08)

  return (
    <section ref={ref} className="relative py-20 overflow-hidden">
      {/* Top divider */}
      <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 h-px w-full max-w-4xl bg-gradient-to-r from-transparent via-border/40 to-transparent" />

      {/* Subtle grid + glow */}
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-grid-fine opacity-30" />
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-0 h-[300px] w-[700px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_center,rgba(255,61,61,0.08),transparent_70%)] blur-[120px]" />
      </div>

      <div className="relative mx-auto max-w-5xl px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <Badge
            variant="outline"
            className="border-primary/20 bg-primary/5 text-primary font-mono text-[10px] tracking-[0.3em] uppercase px-3 py-1 mb-4"
          >
            Works With
          </Badge>
          <h2 className="text-3xl font-extrabold text-foreground sm:text-4xl tracking-tight">
            Visualize any codebase
          </h2>
          <p className="mt-3 text-sm text-muted-foreground/60 max-w-sm mx-auto">
            Drop in any public GitHub repo — we handle language detection, parsing, and visualization automatically.
          </p>
        </motion.div>

        {/* Repo chips */}
        <div className="flex flex-wrap justify-center gap-3">
          {REPOS.map((repo, i) => (
            <motion.div
              key={repo.name}
              initial={{ opacity: 0, scale: 0.85 }}
              animate={inView ? { opacity: 1, scale: 1 } : {}}
              transition={{ duration: 0.4, delay: i * 0.06 }}
              className="group flex items-center gap-2.5 rounded-full border border-white/[0.08] bg-[#0c0c15] px-5 py-2.5 transition-all duration-200 hover:border-white/20 hover:bg-[#10101e] hover:shadow-[0_0_20px_rgba(255,61,61,0.08)] cursor-default"
            >
              {/* Language color dot */}
              <div
                className="h-2 w-2 rounded-full flex-shrink-0 transition-all duration-300 group-hover:shadow-lg"
                style={{
                  backgroundColor: repo.color,
                  boxShadow: `0 0 6px ${repo.color}60`,
                }}
              />
              <span className="font-mono text-sm font-medium text-muted-foreground/70 group-hover:text-foreground/80 transition-colors">
                {repo.name}
              </span>
              <span className="font-mono text-[10px] text-muted-foreground/30 group-hover:text-muted-foreground/50 transition-colors">
                {repo.lang}
              </span>
            </motion.div>
          ))}
        </div>

        {/* Stat line */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="mt-10 text-center font-mono text-[11px] text-muted-foreground/30 tracking-widest"
        >
          Works with any public GitHub repository · Auto-detected · Zero config
        </motion.p>
      </div>

      {/* Bottom divider */}
      <div className="pointer-events-none absolute bottom-0 left-1/2 -translate-x-1/2 h-px w-full max-w-4xl bg-gradient-to-r from-transparent via-border/30 to-transparent" />
    </section>
  )
}
