"use client"

import { useRef, useState, useEffect } from "react"
import { Link2, Cpu, Orbit } from "lucide-react"
import { Badge } from "@codecity/ui/components/badge"
import type { LucideIcon } from "lucide-react"

const STEPS: {
  number: string
  title: string
  subtitle: string
  description: string
  color: string
  dimColor: string
  icon: LucideIcon
  tags: string[]
}[] = [
  {
    number: "01",
    title: "Paste a Repo URL",
    subtitle: "Any public GitHub repository",
    description:
      "Drop in any GitHub URL and we handle the rest — cloning, parsing, and mapping your codebase structure in seconds.",
    color: "#ff3d3d",
    dimColor: "rgba(255,61,61,0.08)",
    icon: Link2,
    tags: ["GitHub", "TypeScript", "Python", "JavaScript"],
  },
  {
    number: "02",
    title: "We Analyze the Code",
    subtitle: "Deep static analysis engine",
    description:
      "Every file is parsed for functions, classes, imports, and complexity metrics. Dependency graphs are built automatically.",
    color: "#00e5ff",
    dimColor: "rgba(0,229,255,0.08)",
    icon: Cpu,
    tags: ["AST parsing", "Dep graph", "Metrics"],
  },
  {
    number: "03",
    title: "Explore Your City",
    subtitle: "Interactive 3D cityscape",
    description:
      "Navigate with orbit controls, click any building to inspect files, trace dependency pipes, and spot complexity hotspots.",
    color: "#00e676",
    dimColor: "rgba(0,230,118,0.08)",
    icon: Orbit,
    tags: ["WebGL", "3D", "Real-time"],
  },
]

function useInView(threshold = 0.1) {
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

export function HowItWorks() {
  const { ref: sectionRef, inView } = useInView(0.08)

  return (
    <section className="py-28 relative" ref={sectionRef}>
      {/* Top divider */}
      <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 h-px w-full max-w-4xl bg-gradient-to-r from-transparent via-border/50 to-transparent" />

      {/* Ambient glows */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[5%] top-20 h-[360px] w-[480px] rounded-full bg-[radial-gradient(circle_at_center,rgba(255,61,61,0.1),transparent_70%)] blur-[130px]" />
        <div className="absolute right-[8%] bottom-16 h-[320px] w-[400px] rounded-full bg-[radial-gradient(circle_at_center,rgba(0,229,255,0.08),transparent_70%)] blur-[130px]" />
        <div className="absolute left-[45%] bottom-0 h-[260px] w-[360px] rounded-full bg-[radial-gradient(circle_at_center,rgba(0,230,118,0.07),transparent_70%)] blur-[130px]" />
      </div>

      <div className="relative mx-auto max-w-6xl px-6">
        {/* Section header */}
        <div className="text-center mb-20">
          <div
            className={`transition-all duration-700 ${inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
          >
            <Badge
              variant="outline"
              className="border-primary/20 bg-primary/5 text-primary font-mono text-[10px] tracking-[0.3em] uppercase px-3 py-1 mb-5"
            >
              How It Works
            </Badge>
            <h2 className="text-4xl font-extrabold text-foreground sm:text-5xl tracking-tight leading-[1.1]">
              Three steps to your city
            </h2>
            <p className="mt-4 text-sm text-muted-foreground/60 max-w-sm mx-auto leading-relaxed">
              From repo URL to interactive 3D visualization in under 60 seconds.
            </p>
          </div>
        </div>

        {/* Steps */}
        <div className="relative">
          {/* Desktop connecting line */}
          <div className="hidden lg:block absolute top-[5.5rem] left-[calc(16.66%+2.5rem)] right-[calc(16.66%+2.5rem)] h-px z-0">
            <div
              className={`h-full transition-all duration-1200 ease-out ${inView ? "opacity-100" : "opacity-0"}`}
              style={{
                background: "linear-gradient(90deg, rgba(255,61,61,0.5) 0%, rgba(0,229,255,0.5) 50%, rgba(0,230,118,0.5) 100%)",
                boxShadow: "0 0 8px rgba(255,61,61,0.2), 0 0 8px rgba(0,229,255,0.2)",
              }}
            />
            {/* Animated travelling dot */}
            {inView && (
              <div
                className="absolute top-1/2 -translate-y-1/2 h-2 w-2 rounded-full bg-white/60 blur-[1px]"
                style={{
                  animation: "travel-dot 3s ease-in-out infinite",
                }}
              />
            )}
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {STEPS.map((step, i) => {
              const Icon = step.icon
              return (
                <div
                  key={step.number}
                  className={`group relative transition-all duration-700 ${
                    inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
                  }`}
                  style={{ transitionDelay: inView ? `${i * 180}ms` : "0ms" }}
                >
                  {/* Step number + icon header */}
                  <div className="relative flex items-center gap-4 mb-5 z-10">
                    {/* Giant glowing step number */}
                    <div
                      className="font-mono text-7xl font-black leading-none select-none transition-all duration-300 group-hover:scale-105"
                      style={{
                        color: step.color,
                        textShadow: `0 0 30px ${step.color}60, 0 0 60px ${step.color}30`,
                      }}
                    >
                      {step.number}
                    </div>
                    {/* Icon badge */}
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 transition-all duration-300 group-hover:border-white/20 group-hover:scale-110 group-hover:shadow-lg"
                      style={{
                        backgroundColor: step.dimColor,
                        boxShadow: `0 0 0 0 ${step.color}00`,
                      }}
                    >
                      <Icon className="h-5 w-5" style={{ color: step.color }} />
                    </div>
                  </div>

                  {/* Card */}
                  <div
                    className="relative rounded-2xl border border-white/[0.07] bg-[linear-gradient(160deg,rgba(12,12,22,0.95),rgba(8,8,14,0.97))] p-6 transition-all duration-300 group-hover:border-white/15 group-hover:shadow-[0_8px_40px_rgba(0,0,0,0.4)]"
                    style={{
                      borderLeft: `3px solid ${step.color}`,
                    }}
                  >
                    {/* Hover glow */}
                    <div
                      className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                      style={{
                        background: `radial-gradient(ellipse 200px 120px at 0% 50%, ${step.color}08, transparent)`,
                      }}
                    />

                    <div className="relative">
                      <p className="font-mono text-[10px] uppercase tracking-[0.2em] mb-1" style={{ color: step.color }}>
                        {step.subtitle}
                      </p>
                      <h3 className="text-lg font-bold text-foreground tracking-tight mb-3">
                        {step.title}
                      </h3>
                      <p className="text-sm leading-relaxed text-muted-foreground/75">
                        {step.description}
                      </p>

                      {/* Tags */}
                      <div className="mt-5 flex flex-wrap gap-1.5">
                        {step.tags.map((tag) => (
                          <span
                            key={tag}
                            className="font-mono text-[10px] px-2 py-0.5 rounded-full border border-white/[0.08] bg-white/[0.03] text-muted-foreground/50"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes travel-dot {
          0% { left: 0%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { left: 100%; opacity: 0; }
        }
      `}</style>
    </section>
  )
}
