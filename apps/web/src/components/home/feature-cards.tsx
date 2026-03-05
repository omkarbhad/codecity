"use client"

import { Building2, GitBranch, BarChart3, ArrowRight, Code2 } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { Card, CardContent, CardHeader } from "@codecity/ui/components/card"
import { Badge } from "@codecity/ui/components/badge"
import { useRef, useState, useEffect } from "react"
import { SpotlightCard } from "@/components/ui/animated-text"

interface Feature {
  title: string
  tag: string
  color: string
  description: string
  stats: string
  icon: LucideIcon
  highlights: string[]
}

const FEATURES: Feature[] = [
  {
    title: "3D Visualization",
    tag: "SPATIAL",
    color: "#00e5ff",
    description:
      "Transform code into an interactive 3D cityscape. Files become buildings, directories become districts.",
    stats: "30+ file metrics",
    icon: Building2,
    highlights: ["Building height = lines of code", "Width = number of functions", "Color = directory affiliation"],
  },
  {
    title: "Dependency Mapping",
    tag: "GRAPH",
    color: "#00e676",
    description:
      "Visualize import relationships as flowing pipes. Trace dependencies at a glance.",
    stats: "Bidirectional flow",
    icon: GitBranch,
    highlights: ["Glowing pipe connections", "Animated particle flow", "Spot circular dependencies"],
  },
  {
    title: "Code Intelligence",
    tag: "METRICS",
    color: "#ffea00",
    description:
      "Spot complexity hotspots, unused exports, and architectural patterns instantly.",
    stats: "5 analysis modes",
    icon: BarChart3,
    highlights: ["Complexity antennas", "React component domes", "Unused export detection"],
  },
  {
    title: "Language Support",
    tag: "POLYGLOT",
    color: "#b388ff",
    description:
      "TypeScript, JavaScript, Python and more. Auto-detected language parsing with syntax-aware metrics.",
    stats: "4+ languages",
    icon: Code2,
    highlights: ["Auto language detection", "Cross-language dep maps", "Framework-aware grouping"],
  },
]

function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null)
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setInView(true) },
      { threshold }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [threshold])
  return { ref, inView }
}

export function FeatureCards() {
  const { ref: sectionRef, inView } = useInView(0.1)

  return (
    <section className="relative py-24" ref={sectionRef}>
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-16 h-[360px] w-[640px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_center,rgba(255,92,92,0.1),transparent_72%)] blur-[120px]" />
        <div className="absolute right-[4%] bottom-4 h-[280px] w-[360px] rounded-full bg-[radial-gradient(circle_at_center,rgba(0,214,255,0.08),transparent_72%)] blur-[120px]" />
      </div>

      <div className="relative mx-auto max-w-5xl px-6">
        <div className="text-center mb-16">
          <Badge variant="outline" className="border-primary/20 bg-primary/5 text-primary font-mono text-[10px] tracking-[0.3em] uppercase px-3 py-1 mb-4">
            Capabilities
          </Badge>
          <h2 className="text-3xl font-bold text-foreground sm:text-4xl tracking-tight">
            Every metric has a shape
          </h2>
          <p className="mt-3 text-sm text-muted-foreground/70 max-w-md mx-auto">
            Each code pattern maps to a distinct visual element in your city
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((feature, i) => {
            const Icon = feature.icon
            return (
              <SpotlightCard
                key={feature.title}
                spotlightColor={`${feature.color}18`}
                className={`rounded-xl ${inView ? "animate-fade-up" : "opacity-0"}`}
                style={{ animationDelay: inView ? `${(i + 1) * 120}ms` : undefined }}
              >
              <Card
                className="group relative overflow-hidden border-white/10 bg-[linear-gradient(165deg,rgba(12,12,22,0.92),rgba(8,8,14,0.94))] transition-all duration-500 hover:border-white/20 hover:bg-[linear-gradient(165deg,rgba(16,16,28,0.95),rgba(10,10,18,0.97))] hover:shadow-[0_0_55px_rgba(0,0,0,0.4)] h-full"
              >
                <div
                  aria-hidden
                  className="absolute -top-20 right-[-10%] h-44 w-44 rounded-full opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-40"
                  style={{ backgroundColor: feature.color }}
                />

                {/* Top accent line - animates from left on hover */}
                <div className="absolute top-0 left-0 right-0 h-[2px] overflow-hidden">
                  <div
                    className="h-full w-full opacity-30 transition-all duration-500 origin-left group-hover:opacity-90 scale-x-50 group-hover:scale-x-100"
                    style={{ background: `linear-gradient(90deg, ${feature.color}, ${feature.color}80, transparent)` }}
                  />
                </div>

                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="h-2.5 w-2.5 rounded-full shadow-lg transition-shadow duration-300 group-hover:shadow-xl"
                        style={{
                          backgroundColor: feature.color,
                          boxShadow: `0 0 12px ${feature.color}50`,
                        }}
                      />
                      <Badge variant="secondary" className="font-mono text-[9px] tracking-[0.15em] bg-[#090913] border-white/10 text-muted-foreground/60 px-2 py-0">
                        {feature.tag}
                      </Badge>
                    </div>
                  <div
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-[#090913] transition-all duration-300 group-hover:border-white/25 group-hover:scale-105"
                    style={{ color: feature.color }}
                  >
                    <Icon className="h-4 w-4 opacity-50 group-hover:opacity-90 transition-opacity" />
                  </div>
                </div>

                <h3 className="text-base font-semibold text-foreground tracking-tight">
                  {feature.title}
                </h3>
              </CardHeader>

              <CardContent className="pt-0">
                <p className="text-[13px] leading-relaxed text-muted-foreground/80">
                  {feature.description}
                </p>

                  <ul className="mt-5 space-y-2.5">
                    {feature.highlights.map((h) => (
                      <li key={h} className="flex items-center gap-2.5">
                        <ArrowRight
                          className="h-3 w-3 shrink-0 opacity-40 group-hover:opacity-60 transition-opacity"
                          style={{ color: feature.color }}
                        />
                        <span className="font-mono text-[11px] text-muted-foreground/70">
                          {h}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between">
                    <p className="font-mono text-[10px] text-muted-foreground/50">
                      {feature.stats}
                    </p>
                    <span
                      className="font-mono text-[10px] text-muted-foreground/35 hover:text-primary transition-colors cursor-default select-none"
                      style={{}}
                    >
                      → Learn more
                    </span>
                  </div>
                </CardContent>
              </Card>
              </SpotlightCard>
            )
          })}
        </div>
      </div>
    </section>
  )
}
