import Link from "next/link"
import { Button } from "@codecity/ui/components/button"
import { ArrowRight } from "lucide-react"

export function CTA() {
  return (
    <section className="relative py-24 sm:py-32 bg-zinc-950 overflow-hidden">
      {/* Background glow */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-20"
        style={{
          background: 'radial-gradient(circle, hsl(var(--primary) / 0.3) 0%, transparent 60%)'
        }}
      />

      <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/30 bg-primary/10 text-primary text-xs font-mono uppercase tracking-wider mb-6">
          <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
          Free & Open Source
        </div>

        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6">
          Ready to Explore Your Code?
        </h2>

        <p className="text-lg text-zinc-400 mb-10 max-w-xl mx-auto">
          Start visualizing your repositories today. No credit card required,
          no sign-up necessary for public repos.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button
            asChild
            className="h-12 px-8 text-base bg-primary hover:bg-primary/90 text-white font-semibold shadow-[0_0_30px_hsl(var(--primary)/0.3)] hover:shadow-[0_0_40px_hsl(var(--primary)/0.5)] transition-all duration-300"
          >
            <Link href="/dashboard" className="flex items-center gap-2">
              Start Building
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>

          <Button
            asChild
            variant="ghost"
            className="h-12 px-6 text-zinc-400 hover:text-white hover:bg-zinc-800/50"
          >
            <Link href="/dashboard?tab=explore">
              Browse Examples
            </Link>
          </Button>
        </div>

        {/* Trust badges */}
        <div className="mt-12 flex items-center justify-center gap-6 text-zinc-400 text-sm">
          <span>✓ No setup required</span>
          <span>✓ Works with any repo</span>
          <span>✓ Instant results</span>
        </div>
      </div>
    </section>
  )
}
