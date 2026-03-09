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
      {/* Subtle top radial glow */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 40% at 50% -5%, rgba(99,102,241,0.05), transparent 60%)",
        }}
      />

      <div className="absolute top-0 left-0 right-0 h-px bg-white/[0.06]" />

      <div className="relative z-10 max-w-5xl mx-auto px-5 sm:px-8 md:px-10 text-center">
        <motion.h2
          {...fadeUp}
          transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="text-2xl sm:text-3xl font-bold text-[#fafafa] tracking-tight mb-3"
        >
          Ready to Explore Your Code?
        </motion.h2>

        <motion.div
          {...fadeUp}
          transition={{ duration: 0.5, delay: 0.05, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="mx-auto w-12 h-[3px] bg-indigo-500 rounded-full mb-4"
        />

        <motion.p
          {...fadeUp}
          transition={{ duration: 0.5, delay: 0.1, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="text-sm sm:text-base text-zinc-400 mb-10 max-w-xl mx-auto leading-relaxed"
        >
          Start visualizing your repositories today. Paste a URL and see your
          codebase come alive as an interactive city.
        </motion.p>

        <motion.div
          {...fadeUp}
          transition={{ duration: 0.5, delay: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          <Button asChild className="rounded-lg px-5 py-2.5 text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition-colors duration-200">
            <Link href="/dashboard" className="flex items-center gap-2">
              Start Building Your City
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </motion.div>

        {/* Trust badges */}
        <motion.div
          {...fadeUp}
          transition={{ duration: 0.5, delay: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="mt-12 flex flex-wrap items-center justify-center gap-3"
        >
          {["Free", "Open Source", "No Sign-up Required"].map((label) => (
            <span
              key={label}
              className="rounded-full bg-white/[0.04] border border-white/[0.06] px-3 py-1 text-xs text-zinc-400 font-medium"
            >
              {label}
            </span>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
