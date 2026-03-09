import Link from "next/link"
import { Button } from "@codecity/ui/components/button"
import { ArrowRight } from "lucide-react"

export function CTA() {
  return (
    <section className="relative py-24 sm:py-32 bg-zinc-950 overflow-hidden">
      {/* Subtle top border */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-zinc-800 to-transparent" />

      {/* Background glow */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-10"
        style={{
          background:
            "radial-gradient(circle, #ff3d3d40 0%, transparent 60%)",
        }}
      />

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 text-center">
        {/* Label */}
        <p className="text-xs font-mono uppercase tracking-widest text-primary mb-4">
          Get Started
        </p>

        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white tracking-tight mb-6">
          Ready to Explore Your Code?
        </h2>

        <p className="text-base text-zinc-400 mb-10 max-w-xl mx-auto leading-relaxed">
          Start visualizing your repositories today. Paste a URL and see your
          codebase come alive as an interactive city.
        </p>

        {/* CTA Button */}
        <Button
          asChild
          className="h-12 px-8 text-base bg-primary hover:bg-primary/90 text-white font-semibold shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all duration-300"
        >
          <Link href="/dashboard" className="flex items-center gap-2">
            Start Building Your City
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>

        {/* Trust badges */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-6">
          {[
            { label: "Free", emoji: "✦" },
            { label: "Open Source", emoji: "✦" },
            { label: "No Sign-up Required", emoji: "✦" },
          ].map((badge) => (
            <div
              key={badge.label}
              className="flex items-center gap-2 rounded-2xl border border-zinc-800/50 bg-zinc-900/50 backdrop-blur-sm px-4 py-2"
            >
              <span className="text-primary text-sm">{badge.emoji}</span>
              <span className="text-sm text-zinc-400">{badge.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
