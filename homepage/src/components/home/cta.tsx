"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { Button } from "@/ui/components/button"
import { ArrowRight, Github } from "lucide-react"

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
            "radial-gradient(ellipse 55% 45% at 50% -10%, rgba(255,61,61,0.16), transparent 60%)",
        }}
      />

      <div className="absolute top-0 left-0 right-0 h-px bg-white/[0.06]" />

      <div className="relative z-10 mx-auto max-w-5xl px-5 text-center sm:px-8 md:px-10">
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] px-6 py-12 shadow-[0_0_0_1px_rgba(255,61,61,0.06),0_0_56px_rgba(220,38,38,0.1)] backdrop-blur-xl sm:px-8">
          <motion.h2
            {...fadeUp}
            transition={{ type: "spring", stiffness: 340, damping: 30 }}
            className="mb-3 bg-gradient-to-b from-white to-zinc-300 bg-clip-text text-2xl font-bold tracking-tight text-transparent sm:text-3xl"
          >
            See Your Codebase in a New Dimension
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
            Paste any GitHub URL. In under 60 seconds you&apos;ll be flying through
            your codebase. Free, open source — no sign-up required for public repos.
          </motion.p>

          <motion.div
            {...fadeUp}
            transition={{ type: "spring", stiffness: 300, damping: 30, delay: 0.12 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-3"
          >
            <Button asChild className="rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-white shadow-[0_0_38px_rgba(255,61,61,0.3)] transition-all duration-200 hover:bg-red-500 hover:shadow-[0_0_48px_rgba(255,61,61,0.4)]">
              <Link href="/dashboard" className="flex items-center gap-2">
                Visualize a Repo Now
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="rounded-lg border border-white/[0.09] bg-white/[0.03] px-5 py-2.5 text-sm font-medium text-zinc-300 transition-all duration-200 hover:border-white/[0.14] hover:bg-white/[0.06] hover:text-white"
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

          {/* Trust badges */}
          <motion.div
            {...fadeUp}
            transition={{ type: "spring", stiffness: 300, damping: 30, delay: 0.16 }}
            className="mt-10 flex flex-wrap items-center justify-center gap-3"
          >
            {["Free to use", "MIT Licensed", "No Account for Public Repos"].map((label) => (
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
