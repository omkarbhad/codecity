"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { Button } from "@codecity/ui/components/button"
import { ArrowRight, Github } from "lucide-react"

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
}

export function HeroSection() {
  return (
    <section className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 pb-20 pt-28 sm:px-6">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 58% 42% at 50% -8%, rgba(255,61,61,0.18), transparent 62%)",
        }}
      />
      <div className="pointer-events-none absolute -right-32 top-24 h-72 w-72 rounded-full bg-primary/15 blur-[110px]" />
      <div className="pointer-events-none absolute -left-28 bottom-16 h-72 w-72 rounded-full bg-red-800/15 blur-[120px]" />

      <div className="relative z-10 mx-auto max-w-5xl px-1 text-center sm:px-4">
        {/* Badge */}
        <motion.div
          {...fadeUp}
          transition={{ type: "spring", stiffness: 340, damping: 30 }}
          className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.04] px-3.5 py-1.5"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
          <span className="text-xs font-medium text-zinc-400">Open Source Code Visualization</span>
        </motion.div>

        <motion.h1
          {...fadeUp}
          transition={{ type: "spring", stiffness: 340, damping: 30, delay: 0.04 }}
          className="text-4xl font-bold leading-[1.04] tracking-tight sm:text-5xl md:text-6xl lg:text-7xl"
        >
          <span className="bg-gradient-to-b from-white to-zinc-300 bg-clip-text text-transparent">
            Your Codebase,
          </span>
          <br />
          <span className="bg-gradient-to-r from-red-300 via-red-400 to-red-500 bg-clip-text text-transparent">
            Reimagined as a City
          </span>
        </motion.h1>

        <motion.p
          {...fadeUp}
          transition={{ type: "spring", stiffness: 300, damping: 30, delay: 0.08 }}
          className="text-base sm:text-lg text-zinc-400 mt-6 max-w-2xl mx-auto leading-relaxed"
        >
          Transform any GitHub repository into an interactive 3D cityscape.
          Every file becomes a building, every directory a district — navigate
          and understand architecture at a glance.
        </motion.p>

        {/* CTAs */}
        <motion.div
          {...fadeUp}
          transition={{ type: "spring", stiffness: 300, damping: 30, delay: 0.12 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-10"
        >
          <Button asChild className="rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-white shadow-[0_0_38px_rgba(255,61,61,0.3)] transition-all duration-200 hover:bg-red-500 hover:shadow-[0_0_48px_rgba(255,61,61,0.4)]">
            <Link href="/dashboard" className="flex items-center gap-2">
              Get Started Free
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>

          <Button
            asChild
            variant="outline"
            className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-5 py-2.5 text-sm font-medium text-zinc-300 transition-all duration-200 hover:border-white/[0.12] hover:bg-white/[0.06] hover:text-white"
          >
            <Link
              href="https://github.com/omkarbhad/codecity"
              className="flex items-center gap-2"
            >
              <Github className="h-4 w-4" />
              View on GitHub
            </Link>
          </Button>
        </motion.div>

        {/* Terminal Preview */}
        <motion.div
          {...fadeUp}
          transition={{ type: "spring", stiffness: 300, damping: 30, delay: 0.18 }}
          className="mx-auto mt-14 max-w-xl overflow-hidden rounded-xl border border-white/[0.08] bg-[#09090b]/90 shadow-[0_0_0_1px_rgba(255,61,61,0.08),0_0_48px_rgba(220,38,38,0.12)] backdrop-blur-xl"
        >
          {/* Title bar */}
          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/[0.06]">
            <div className="h-2.5 w-2.5 rounded-full bg-red-500/50" />
            <div className="h-2.5 w-2.5 rounded-full bg-amber-500/50" />
            <div className="h-2.5 w-2.5 rounded-full bg-green-500/50" />
            <span className="ml-2 text-[11px] font-mono text-zinc-600">
              codecity
            </span>
          </div>
          {/* Terminal body */}
          <div className="px-4 py-3 font-mono text-[11px] leading-[1.9] text-left space-y-1">
            <p>
              <span className="text-red-400">$</span>{" "}
              <span className="text-zinc-400">codecity analyze vercel/next.js</span>
            </p>
            <p className="text-zinc-500">Scanning repository tree...</p>
            <p className="text-zinc-500">
              2,847 files scanned  &rarr;  City generated in 3.2s
            </p>
            <p className="text-emerald-400">
              ✓ Visualization ready — 14 districts, 2,847 buildings
            </p>
            <p className="inline-flex items-center">
              <span className="text-red-400">$</span>
              <motion.span
                animate={{ opacity: [1, 0, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
                className="ml-1 inline-block h-3.5 w-1.5 bg-red-400"
              />
            </p>
          </div>
        </motion.div>

        {/* Stats row */}
        <motion.div
          {...fadeUp}
          transition={{ type: "spring", stiffness: 300, damping: 30, delay: 0.24 }}
          className="mt-14 flex items-center justify-center gap-6 sm:gap-10"
        >
          {[
            { value: "10K+", label: "Repos Analyzed" },
            { value: "50K+", label: "Files Mapped" },
            { value: "100%", label: "Open Source" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-5 py-3 text-center transition-all duration-300 hover:border-red-400/30 hover:shadow-[0_0_28px_rgba(255,61,61,0.1)] cursor-default"
            >
              <p className="text-xl font-bold text-[#fafafa]">{stat.value}</p>
              <p className="text-[11px] text-zinc-500 font-medium uppercase tracking-wide mt-0.5">
                {stat.label}
              </p>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
