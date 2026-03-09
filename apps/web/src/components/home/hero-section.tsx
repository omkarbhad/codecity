"use client"

import Link from "next/link"
import { Button } from "@codecity/ui/components/button"
import { ArrowRight, Github } from "lucide-react"

export function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-zinc-950" />

      {/* Grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                           linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: "64px 64px",
        }}
      />

      {/* Radial primary glow */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full opacity-15"
        style={{
          background:
            "radial-gradient(circle, #ff3d3d33 0%, #ff3d3d0a 40%, transparent 70%)",
        }}
      />

      {/* Content */}
      <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
        {/* Label */}
        <p className="text-xs font-mono uppercase tracking-widest text-primary mb-6">
          Code Visualization Platform
        </p>

        {/* Main heading */}
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white mb-6 tracking-tight leading-tight">
          Visualize Your Code
          <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary/60">
            As a Living City
          </span>
        </h1>

        {/* Subtitle */}
        <p className="text-base sm:text-lg text-zinc-400 mb-10 max-w-2xl mx-auto leading-relaxed">
          Transform any GitHub repository into an interactive 3D cityscape.
          Files become buildings, directories become districts — understand
          architecture at a glance.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button
            asChild
            className="h-12 px-8 text-base bg-primary hover:bg-primary/90 text-white font-semibold shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all duration-300"
          >
            <Link href="/dashboard" className="flex items-center gap-2">
              Get Started
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>

          <Button
            asChild
            variant="outline"
            className="h-12 px-8 text-base border-zinc-800 bg-zinc-900/50 text-zinc-300 hover:bg-zinc-800 hover:text-white hover:border-zinc-700 backdrop-blur-sm transition-all duration-300"
          >
            <Link
              href="https://github.com/omkarbhad/codecity"
              className="flex items-center gap-2"
            >
              <Github className="h-4 w-4" />
              View on GitHub
            </Link>
          </Button>
        </div>

        {/* Terminal Preview Mockup */}
        <div className="mt-12 max-w-xl mx-auto rounded-2xl border border-zinc-800/50 bg-zinc-900/50 backdrop-blur-sm overflow-hidden">
          {/* Terminal header */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-800/50">
            <div className="h-3 w-3 rounded-full bg-zinc-700" />
            <div className="h-3 w-3 rounded-full bg-zinc-700" />
            <div className="h-3 w-3 rounded-full bg-zinc-700" />
            <span className="ml-2 text-xs font-mono text-zinc-500">
              codecity
            </span>
          </div>
          {/* Terminal body */}
          <div className="px-4 py-4 font-mono text-sm text-left space-y-2">
            <p className="text-zinc-500">
              <span className="text-primary">$</span> codecity analyze
              vercel/next.js
            </p>
            <p className="text-zinc-400">
              Analyzing vercel/next.js...
            </p>
            <p className="text-zinc-400">
              2,847 files scanned → City generated in 3.2s
            </p>
            <p className="text-emerald-400">
              ✓ Visualization ready — 14 districts, 2,847 buildings
            </p>
          </div>
        </div>

        {/* Stats row */}
        <div className="mt-12 flex items-center justify-center gap-8 sm:gap-12">
          {[
            { value: "10K+", label: "Repos Analyzed" },
            { value: "50K+", label: "Files Mapped" },
            { value: "100%", label: "Open Source" },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="text-2xl font-bold text-white">{stat.value}</p>
              <p className="text-sm text-zinc-500 font-mono uppercase tracking-wide mt-1">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-zinc-950 to-transparent" />
    </section>
  )
}
