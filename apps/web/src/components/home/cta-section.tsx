"use client"

import Link from "next/link"
import { useRef, useState, useEffect } from "react"
import { motion } from "framer-motion"
import { ArrowRight, Rocket } from "lucide-react"

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

const PROOF_PILLS = ["Open Source", "No install", "GitHub-native"]

export function CtaSection() {
  const { ref, inView } = useInView(0.08)

  return (
    <section ref={ref} className="relative py-28 overflow-hidden">
      {/* Aurora + grid background */}
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-aurora" />
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-grid opacity-20" />

      {/* Strong center glow */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/2 h-[500px] w-[700px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle_at_center,rgba(255,61,61,0.18),transparent_65%)] blur-[100px]" />
      </div>

      <div className="relative mx-auto max-w-3xl px-6 text-center">
        {/* Decorative dots */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ duration: 0.8 }}
          className="mb-8 flex items-center justify-center gap-2"
        >
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="h-1 w-1 rounded-full bg-primary/40"
              style={{ opacity: 0.2 + i * 0.15 }}
            />
          ))}
        </motion.div>

        {/* Headline */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, delay: 0.1 }}
        >
          <h2 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl leading-[1.08]">
            <span className="text-foreground">Ready to </span>
            <span className="text-primary text-glow-red">see</span>
            <span className="text-foreground"> your codebase?</span>
          </h2>
        </motion.div>

        {/* Subtext */}
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="mt-5 text-base text-muted-foreground/60 max-w-md mx-auto leading-relaxed"
        >
          Join developers who think spatially. Turn any repo into an interactive
          3D city in under 60 seconds.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, delay: 0.3 }}
          className="mt-10 flex flex-wrap items-center justify-center gap-4"
        >
          {/* Primary — shimmer button */}
          <Link
            href="/dashboard"
            className="group relative inline-flex items-center gap-2.5 overflow-hidden rounded-xl bg-primary px-8 py-4 font-mono text-sm font-bold text-white tracking-wide shadow-[0_0_30px_rgba(255,61,61,0.4)] transition-all duration-200 hover:shadow-[0_0_50px_rgba(255,61,61,0.6)] hover:-translate-y-0.5 active:translate-y-0"
          >
            {/* Shimmer sweep */}
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 -translate-x-full skew-x-[-20deg] bg-white/10 transition-transform duration-700 group-hover:translate-x-[200%]"
            />
            <Rocket className="h-4 w-4 flex-shrink-0" />
            Start Visualizing
            <ArrowRight className="h-4 w-4 flex-shrink-0 transition-transform group-hover:translate-x-0.5" />
          </Link>

          {/* Secondary */}
          <Link
            href="/explore"
            className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/[0.04] px-8 py-4 font-mono text-sm font-semibold text-foreground/70 tracking-wide transition-all duration-200 hover:border-white/25 hover:bg-white/[0.08] hover:text-foreground hover:-translate-y-0.5 active:translate-y-0"
          >
            Explore Public Cities
          </Link>
        </motion.div>

        {/* Proof pills */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ duration: 0.7, delay: 0.45 }}
          className="mt-7 flex flex-wrap items-center justify-center gap-3"
        >
          {PROOF_PILLS.map((pill) => (
            <span
              key={pill}
              className="rounded-full border border-white/[0.08] bg-white/[0.03] px-4 py-1.5 font-mono text-[11px] text-muted-foreground/40 tracking-wider"
            >
              {pill}
            </span>
          ))}
        </motion.div>

        {/* Footer credit */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ duration: 0.7, delay: 0.6 }}
          className="mt-12 font-mono text-[10px] text-muted-foreground/20 tracking-widest"
        >
          Built by Omkar · MIT License · Powered by WebGL
        </motion.p>
      </div>
    </section>
  )
}
