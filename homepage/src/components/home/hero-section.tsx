"use client"

import Link from "next/link"
import Image from "next/image"
import { motion } from "framer-motion"
import { Button } from "@/ui/components/button"
import { ArrowRight, Github, Sparkles } from "lucide-react"

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
}

const STATS = [
  { value: "16+", label: "Languages" },
  { value: "<60s", label: "Repo to City" },
  { value: "MIT", label: "Licensed" },
]

export function HeroSection() {
  return (
    <section className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 pb-24 pt-20 sm:px-6">
      {/* Background radial glows */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: "radial-gradient(ellipse 70% 50% at 50% -5%, rgba(255,61,61,0.16), transparent 65%)",
        }}
      />
      <div className="pointer-events-none absolute -right-40 top-20 h-80 w-80 rounded-full bg-primary/10 blur-[120px]" />
      <div className="pointer-events-none absolute -left-32 bottom-10 h-72 w-72 rounded-full bg-primary/[0.07] blur-[130px]" />

      {/* Subtle grid texture */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage: "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
          backgroundSize: "80px 80px",
        }}
      />

      <div className="relative z-10 mx-auto max-w-5xl text-center">
        {/* Badge */}
        <motion.div
          {...fadeUp}
          transition={{ type: "spring", stiffness: 340, damping: 30 }}
          className="mb-7 inline-flex items-center gap-2 rounded-full border border-white/[0.09] bg-white/[0.04] px-4 py-1.5"
        >
          <Sparkles className="h-3 w-3 text-primary" />
          <span className="text-[12px] font-medium text-zinc-400">Free &amp; Open Source Code Visualization</span>
          <span className="h-1.5 w-1.5 rounded-full bg-primary motion-safe:animate-pulse" aria-hidden="true" />
        </motion.div>

        {/* Headline */}
        <motion.h1
          {...fadeUp}
          transition={{ type: "spring", stiffness: 300, damping: 30, delay: 0.04 }}
          className="text-[2.6rem] font-black leading-[1.03] tracking-tight sm:text-5xl md:text-6xl lg:text-[4.5rem]"
        >
          <span className="bg-gradient-to-b from-white to-zinc-400 bg-clip-text text-transparent">
            Turn Any GitHub Repo
          </span>
          <br />
          <span
            className="bg-clip-text text-transparent"
            style={{ backgroundImage: "linear-gradient(90deg, #ffe4e4 0%, #fca5a5 20%, #ff3d3d 55%, #c21a1a 100%)" }}
          >
            Into a 3D City
          </span>
        </motion.h1>

        {/* Sub */}
        <motion.p
          {...fadeUp}
          transition={{ type: "spring", stiffness: 300, damping: 30, delay: 0.08 }}
          className="text-[15px] sm:text-base text-zinc-400 mt-6 max-w-xl mx-auto leading-relaxed"
        >
          Paste a GitHub URL and CodeCity maps every file as a building, every
          directory as a district — an interactive 3D cityscape you can fly through.
        </motion.p>

        {/* CTAs */}
        <motion.div
          {...fadeUp}
          transition={{ type: "spring", stiffness: 300, damping: 30, delay: 0.12 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-9"
        >
          <Button
            asChild
            className="rounded-xl bg-primary px-6 h-10 text-[13px] font-semibold text-white shadow-[0_0_32px_rgba(255,61,61,0.3)] transition-all duration-200 hover:bg-red-500 hover:shadow-[0_0_44px_rgba(255,61,61,0.4)] hover:-translate-y-0.5"
          >
            <Link href="/dashboard" className="flex items-center gap-2">
              Visualize a Repo Now
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>

          <Button
            asChild
            variant="outline"
            className="rounded-xl border border-white/[0.09] bg-white/[0.03] px-5 h-10 text-[13px] font-medium text-zinc-300 transition-all duration-200 hover:border-white/[0.14] hover:bg-white/[0.06] hover:text-white hover:-translate-y-0.5"
          >
            <Link
              href="https://github.com/omkarbhad/codecity"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2"
            >
              <Github className="h-4 w-4" />
              Star on GitHub
            </Link>
          </Button>
        </motion.div>

        {/* Stats row */}
        <motion.div
          {...fadeUp}
          transition={{ type: "spring", stiffness: 300, damping: 30, delay: 0.16 }}
          className="mt-10 flex items-center justify-center gap-2 sm:gap-3"
        >
          {STATS.map((stat, i) => (
            <div key={stat.label} className="flex items-center gap-2 sm:gap-3">
              <div className="text-center px-4 py-2">
                <p className="text-[18px] font-bold text-zinc-100 font-mono">{stat.value}</p>
                <p className="text-[10px] text-zinc-600 font-medium uppercase tracking-wider mt-0.5">{stat.label}</p>
              </div>
              {i < STATS.length - 1 && (
                <div className="h-8 w-px bg-white/[0.06]" />
              )}
            </div>
          ))}
        </motion.div>

        {/* Demo screenshot */}
        <motion.div
          {...fadeUp}
          transition={{ type: "spring", stiffness: 280, damping: 30, delay: 0.22 }}
          className="mx-auto mt-12 max-w-4xl"
        >
          <div className="relative rounded-2xl overflow-hidden border border-white/[0.08] shadow-[0_0_0_1px_rgba(255,61,61,0.07),0_0_80px_rgba(220,38,38,0.12),0_40px_100px_rgba(0,0,0,0.6)] group">
            {/* Top bar chrome */}
            <div className="flex items-center gap-1.5 px-4 py-2.5 bg-[#0c0c12] border-b border-white/[0.05]">
              <span className="h-2.5 w-2.5 rounded-full bg-red-500/60" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500/40" />
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/40" />
              <span className="ml-3 text-[11px] font-mono text-zinc-700">codecity.app/project/…</span>
            </div>
            <Image
              src="/demo.png"
              alt="CodeCity — 3D visualization of a codebase with colorful districts representing different modules"
              width={1200}
              height={750}
              priority
              className="w-full h-auto transition-transform duration-700 group-hover:scale-[1.015]"
            />
          </div>
        </motion.div>
      </div>
    </section>
  )
}
