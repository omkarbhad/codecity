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
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Subtle indigo radial glow */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 40% at 50% -5%, rgba(99,102,241,0.05), transparent 60%)",
        }}
      />

      <div className="relative z-10 text-center px-5 sm:px-8 md:px-10 max-w-5xl mx-auto py-24">
        <motion.h1
          {...fadeUp}
          transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-[#fafafa] leading-[1.08]"
        >
          Visualize Your Code
          <br />
          <span className="text-indigo-400">As a Living City</span>
        </motion.h1>

        <motion.p
          {...fadeUp}
          transition={{ duration: 0.5, delay: 0.1, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="text-base sm:text-lg text-zinc-400 mt-6 max-w-2xl mx-auto leading-relaxed"
        >
          Transform any GitHub repository into an interactive 3D cityscape.
          Files become buildings, directories become districts — understand
          architecture at a glance.
        </motion.p>

        {/* CTAs */}
        <motion.div
          {...fadeUp}
          transition={{ duration: 0.5, delay: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-10"
        >
          <Button asChild className="rounded-lg px-5 py-2.5 text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition-colors duration-200">
            <Link href="/dashboard" className="flex items-center gap-2">
              Get Started
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>

          <Button
            asChild
            variant="outline"
            className="rounded-lg px-5 py-2.5 text-sm font-medium text-zinc-300 hover:text-white bg-white/[0.04] border border-white/[0.08] hover:border-white/[0.12] hover:bg-white/[0.06] transition-all duration-200"
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
          transition={{ duration: 0.5, delay: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="mt-14 max-w-xl mx-auto rounded-xl bg-[#09090b]/90 border border-white/[0.08] overflow-hidden"
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
              <span className="text-indigo-400">$</span>{" "}
              <span className="text-zinc-400">codecity analyze vercel/next.js</span>
            </p>
            <p className="text-zinc-500">Analyzing vercel/next.js...</p>
            <p className="text-zinc-500">
              2,847 files scanned → City generated in 3.2s
            </p>
            <p className="text-emerald-400">
              ✓ Visualization ready — 14 districts, 2,847 buildings
            </p>
            <p className="inline-flex items-center">
              <span className="text-indigo-400">$</span>
              <motion.span
                animate={{ opacity: [1, 0, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
                className="ml-1 inline-block w-1.5 h-3.5 bg-indigo-400"
              />
            </p>
          </div>
        </motion.div>

        {/* Stats row */}
        <motion.div
          {...fadeUp}
          transition={{ duration: 0.5, delay: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="mt-14 flex items-center justify-center gap-6 sm:gap-10"
        >
          {[
            { value: "10K+", label: "Repos Analyzed" },
            { value: "50K+", label: "Files Mapped" },
            { value: "100%", label: "Open Source" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl bg-white/[0.02] border border-white/[0.06] px-5 py-3 text-center"
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
