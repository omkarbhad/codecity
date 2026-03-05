"use client"

import { useEffect, useState, useRef } from "react"
import Link from "next/link"
import DemoScene from "@/components/city/demo-scene"
import { Badge } from "@codecity/ui/components/badge"
import { ArrowRight, Play } from "lucide-react"
import { EncryptedText } from "@/components/ui/animated-text"

const STATS = [
  { value: "35", label: "FILES", color: "#00e5ff" },
  { value: "128", label: "FUNCTIONS", color: "#00e676" },
  { value: "8", label: "DISTRICTS", color: "#b388ff" },
  { value: "5.2k", label: "LINES", color: "#ffea00" },
]

const ROTATING_WORDS = ["a City", "Buildings", "Districts", "an Ecosystem"]

function RotatingWord() {
  const [index, setIndex] = useState(0)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false)
      setTimeout(() => {
        setIndex((i) => (i + 1) % ROTATING_WORDS.length)
        setVisible(true)
      }, 400)
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  return (
    <span
      className={`inline-block transition-all duration-400 ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"
      }`}
    >
      {ROTATING_WORDS[index]}
    </span>
  )
}

function AnimatedCounter({ value, delay }: { value: string; delay: number }) {
  const [show, setShow] = useState(false)
  useEffect(() => {
    const timer = setTimeout(() => setShow(true), delay)
    return () => clearTimeout(timer)
  }, [delay])

  return (
    <span
      className={`inline-block transition-all duration-500 ${
        show ? "opacity-100 scale-100" : "opacity-0 scale-50"
      }`}
    >
      {value}
    </span>
  )
}

export function HeroSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const [sceneError, setSceneError] = useState(false)

  return (
    <section ref={sectionRef} className="relative overflow-hidden pt-28 pb-24">
      {/* Grid background */}
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-grid-fine opacity-40" />

      {/* Gradient atmosphere */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -top-48 left-1/2 h-[520px] w-[900px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_center,rgba(255,90,90,0.18),transparent_72%)] blur-[120px]" />
        <div className="absolute -bottom-40 right-[-12%] h-[380px] w-[460px] rounded-full bg-[radial-gradient(circle_at_center,rgba(0,214,255,0.14),transparent_72%)] blur-[120px]" />
        <div className="absolute bottom-[-30%] left-[-10%] h-[420px] w-[520px] rounded-full bg-[radial-gradient(circle_at_center,rgba(127,96,255,0.14),transparent_72%)] blur-[130px]" />
      </div>

      {/* Floating orbs */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-[12%] h-2 w-2 rounded-full bg-[#00e5ff]/40 animate-float" style={{ animationDelay: "0s" }} />
        <div className="absolute top-44 right-[16%] h-1.5 w-1.5 rounded-full bg-[#b388ff]/40 animate-float" style={{ animationDelay: "1s" }} />
        <div className="absolute top-72 left-[30%] h-1 w-1 rounded-full bg-[#00e676]/40 animate-float" style={{ animationDelay: "2s" }} />
        <div className="absolute top-32 right-[38%] h-2.5 w-2.5 rounded-full bg-primary/30 animate-float" style={{ animationDelay: "0.5s" }} />
      </div>

      <div className="relative mx-auto max-w-6xl px-6">
        <div className="grid items-center gap-14 lg:grid-cols-[1.05fr_1.2fr]">
          {/* Copy */}
          <div className="text-center lg:text-left">
            <div className="animate-fade-up flex justify-center lg:justify-start mb-6">
              <Badge variant="outline" className="border-primary/30 bg-primary/5 text-primary font-mono text-[10px] tracking-[0.3em] uppercase px-4 py-1.5">
                Codebase Visualization Engine
              </Badge>
            </div>

            {/* Eyebrow */}
            <p className="animate-fade-up mb-3 font-mono text-xs tracking-[0.35em] uppercase text-muted-foreground/40 text-center lg:text-left">
              <EncryptedText text="YOUR CODEBASE IS A CITY" />
            </p>

            <h1 className="animate-fade-up delay-100 text-5xl font-extrabold tracking-tight sm:text-6xl lg:text-7xl leading-[1.05]">
              <span className="text-foreground">See Your Code as</span>
              <br />
              <span className="text-primary text-glow-red">
                <RotatingWord />
              </span>
            </h1>

            <p className="animate-fade-up delay-200 mx-auto mt-7 max-w-lg text-sm leading-relaxed text-muted-foreground/80 lg:mx-0">
              Transform any repository into an interactive 3D cityscape.
              Files become buildings, directories become districts, imports become
              glowing pipes.
            </p>

            {/* CTA Buttons */}
            <div className="animate-fade-up delay-300 mt-9 flex flex-wrap items-center justify-center gap-3 lg:justify-start">
              <Link
                href="/dashboard"
                className="group inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 font-mono text-[13px] font-semibold text-white tracking-wide shadow-[0_0_24px_rgba(255,61,61,0.35)] transition-all duration-200 hover:bg-primary/90 hover:shadow-[0_0_36px_rgba(255,61,61,0.5)] hover:-translate-y-0.5 active:translate-y-0"
              >
                Start Visualizing
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link
                href="/explore"
                className="group inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-6 py-3 font-mono text-[13px] font-semibold text-foreground/70 tracking-wide transition-all duration-200 hover:border-white/20 hover:bg-white/[0.07] hover:text-foreground hover:-translate-y-0.5 active:translate-y-0"
              >
                <Play className="h-3.5 w-3.5 fill-current opacity-70" />
                Explore Public Repos
              </Link>
            </div>

            {/* Proof pills */}
            <div className="animate-fade-up delay-500 mt-6 flex flex-wrap items-center justify-center gap-3 lg:justify-start">
              <div className="rounded-full border border-primary/20 bg-primary/[0.06] px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-primary/70">
                Realtime Analysis
              </div>
              <div className="rounded-full border border-cyan-400/15 bg-cyan-400/[0.05] px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-cyan-300/60">
                WebGL Rendered
              </div>
              <div className="rounded-full border border-emerald-400/15 bg-emerald-400/[0.05] px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-emerald-300/60">
                Open Source
              </div>
            </div>
          </div>

          {/* Live 3D Demo */}
          <div className="animate-fade-up delay-300 relative">
            <div className="glow-red-strong relative aspect-[16/9] overflow-hidden rounded-2xl border border-white/10 bg-[linear-gradient(160deg,rgba(14,14,24,0.95),rgba(8,8,14,0.98))] shadow-[0_0_60px_rgba(0,0,0,0.45)]">
          {sceneError ? (
            <div className="absolute inset-0 flex items-center justify-center bg-[#0a0a12]">
              <div className="text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 mb-3">
                  <span className="font-mono text-lg font-bold text-primary">CC</span>
                </div>
                <p className="font-mono text-xs text-muted-foreground/50">3D preview unavailable</p>
              </div>
            </div>
          ) : (
            <DemoSceneWrapper onError={() => setSceneError(true)} />
          )}

          {/* Top-left branding */}
          <div className="pointer-events-none absolute top-4 left-4 flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary font-mono text-[10px] font-bold text-white shadow-[0_0_16px_rgba(255,61,61,0.4)]">
              CC
            </div>
            <span className="font-mono text-[11px] text-foreground/60">
              mem0ai/mem0{" "}
              <span className="text-foreground/25">Python</span>
            </span>
          </div>

          {/* Scanline overlay */}
          <div
            className="pointer-events-none absolute inset-0 z-10 opacity-[0.04]"
            style={{
              backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.6) 2px, rgba(255,255,255,0.6) 3px)",
              backgroundSize: "100% 3px",
            }}
          />

          {/* Top-right LIVE badge */}
          <div className="pointer-events-none absolute top-4 right-4 z-20 flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
            <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-emerald-300/80">
              Live
            </span>
          </div>

          {/* Bottom stat bar */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-center gap-8 sm:gap-10 bg-gradient-to-t from-[rgba(6,6,11,0.95)] via-[rgba(6,6,11,0.6)] to-transparent py-5 px-6">
            {STATS.map((s, i) => (
              <div key={s.label} className="text-center">
                <p className="font-mono text-base sm:text-lg font-bold" style={{ color: s.color }}>
                  <AnimatedCounter value={s.value} delay={800 + i * 150} />
                </p>
                <p className="font-mono text-[9px] sm:text-[10px] uppercase tracking-[0.2em] text-foreground/35 mt-0.5">
                  {s.label}
                </p>
              </div>
            ))}
          </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

/** Wrapper that catches WebGL/R3F errors */
function DemoSceneWrapper({ onError }: { onError: () => void }) {
  useEffect(() => {
    const handleError = (e: ErrorEvent) => {
      if (e.message?.includes("WebGL") || e.message?.includes("THREE")) {
        onError()
      }
    }
    window.addEventListener("error", handleError)
    return () => window.removeEventListener("error", handleError)
  }, [onError])

  return <DemoScene />
}
