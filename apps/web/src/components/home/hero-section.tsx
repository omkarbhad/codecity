"use client"

import DemoScene from "@/components/city/demo-scene"

export function HeroSection() {
  return (
    <section className="relative overflow-hidden pt-24 pb-16 text-center">
      {/* Radial glow behind hero */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="h-[500px] w-[800px] rounded-full bg-primary/5 blur-[120px]" />
      </div>

      <div className="relative mx-auto max-w-4xl px-6">
        <div className="animate-fade-up">
          <p className="font-mono text-xs tracking-[0.3em] uppercase text-primary/70">
            Codebase Visualization Engine
          </p>
        </div>

        <h1 className="mt-6 text-5xl font-extrabold tracking-tight sm:text-7xl animate-fade-up delay-100">
          <span className="text-foreground">See Your Code</span>
          <br />
          <span className="text-primary text-glow-red">as a City</span>
        </h1>
      </div>

      {/* Live 3D Demo */}
      <div className="relative mx-auto mt-16 max-w-5xl px-6 animate-fade-up delay-200">
        <div className="relative aspect-[16/9] overflow-hidden rounded-xl border border-border/50 bg-card/30 backdrop-blur-sm glow-red">
          <DemoScene />
        </div>
      </div>
    </section>
  )
}
