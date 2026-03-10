"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { Button } from "@codecity/ui/components/button"
import { ArrowRight } from "lucide-react"

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
}

export function CTA() {
  return (
    <section className="relative py-24 sm:py-32 overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 55% 45% at 50% -10%, rgba(255,61,61,0.24), transparent 60%)",
        }}
      />

      <div className="absolute top-0 left-0 right-0 h-px bg-white/[0.06]" />

      <div className="relative z-10 mx-auto max-w-5xl px-5 text-center sm:px-8 md:px-10">
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] px-6 py-12 shadow-[0_0_0_1px_rgba(255,61,61,0.08),0_0_56px_rgba(79,70,229,0.16)] backdrop-blur-xl sm:px-8">
        <motion.h2
          {...fadeUp}
          transition={{ type: "spring", stiffness: 340, damping: 30 }}
          className="mb-3 bg-gradient-to-b from-white to-zinc-300 bg-clip-text text-2xl font-bold tracking-tight text-transparent sm:text-3xl"
        >
          Ready to Explore Your Code?
        </motion.h2>

        <motion.div
          {...fadeUp}
          transition={{ type: "spring", stiffness: 300, damping: 30, delay: 0.04 }}
          className="mx-auto mb-4 h-[3px] w-12 rounded-full bg-primary"
        />

        <motion.p
          {...fadeUp}
          transition={{ type: "spring", stiffness: 300, damping: 30, delay: 0.08 }}
          className="mx-auto mb-10 max-w-xl text-sm leading-relaxed text-zinc-400 sm:text-base"
        >
          Start visualizing your repositories today. Paste a URL and see your
          codebase come alive as an interactive city.
        </motion.p>

        <motion.div
          {...fadeUp}
          transition={{ type: "spring", stiffness: 300, damping: 30, delay: 0.12 }}
        >
          <Button asChild className="rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white shadow-[0_0_38px_rgba(255,61,61,0.35)] transition-colors duration-200 hover:bg-primary">
            <Link href="/dashboard" className="flex items-center gap-2">
              Start Building Your City
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </motion.div>

        {/* Trust badges */}
        <motion.div
          {...fadeUp}
          transition={{ type: "spring", stiffness: 300, damping: 30, delay: 0.16 }}
          className="mt-12 flex flex-wrap items-center justify-center gap-3"
        >
          {["Free", "Open Source", "No Sign-up Required"].map((label) => (
            <span
              key={label}
              className="rounded-full border border-white/[0.06] bg-white/[0.04] px-3 py-1 text-xs font-medium text-zinc-400"
            >
              {label}
            </span>
          ))}
        </motion.div>
        </div>
      </div>
    </section>
  )
}
