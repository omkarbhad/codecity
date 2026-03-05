"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Loader2, ArrowRight, Star, AlertCircle } from "lucide-react"
import { Button } from "@codecity/ui/components/button"

const QUICK_PICKS = [
  { repo: "mem0ai/mem0", label: "mem0", featured: true },
  { repo: "excalidraw/excalidraw", label: "excalidraw", featured: false },
  { repo: "microsoft/TypeScript", label: "TypeScript", featured: false },
  { repo: "vercel/next.js", label: "next.js", featured: false },
  { repo: "pmndrs/zustand", label: "zustand", featured: false },
  { repo: "t3-oss/create-t3-app", label: "create-t3-app", featured: false },
]

const GITHUB_URL_REGEX = /^https?:\/\/(www\.)?github\.com\/[\w.-]+\/[\w.-]+/i

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

export function RepoInput() {
  const [url, setUrl] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const { ref: sectionRef, inView } = useInView(0.1)

  const isValidUrl = url.trim() === "" || GITHUB_URL_REGEX.test(url.trim())

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!url.trim() || submitting) return

    if (!GITHUB_URL_REGEX.test(url.trim())) {
      setError("Please enter a valid GitHub repository URL (e.g. https://github.com/owner/repo)")
      return
    }

    setError(null)
    setSubmitting(true)

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoUrl: url, visibility: "PUBLIC" }),
      })

      if (res.status === 401) {
        router.push("/login")
        return
      }

      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? "Failed to start analysis")
        setSubmitting(false)
        return
      }

      const data = await res.json()
      if (data.projectId) {
        router.push(`/analyze/${data.projectId}`)
      }
    } catch {
      setError("Network error. Please try again.")
      setSubmitting(false)
    }
  }

  return (
    <section className="relative py-16" ref={sectionRef as React.RefObject<HTMLElement>}>
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-4 h-[260px] w-[600px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_center,rgba(255,84,84,0.1),transparent_72%)] blur-[120px]" />
        <div className="absolute left-[12%] top-24 h-[220px] w-[320px] rounded-full bg-[radial-gradient(circle_at_center,rgba(0,214,255,0.08),transparent_72%)] blur-[120px]" />
      </div>
      <div className={`relative mx-auto max-w-xl px-6 transition-all duration-700 ${inView ? "animate-fade-up" : "opacity-0"}`}>
        <p className="mb-5 text-center font-mono text-xs text-muted-foreground/50">
          Paste a GitHub repo URL or pick one below
        </p>

        {/* Input row */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row sm:gap-2.5">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="https://github.com/owner/repo"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value)
                if (error) setError(null)
              }}
              disabled={submitting}
              className={`w-full rounded-xl border bg-[linear-gradient(160deg,rgba(14,14,24,0.92),rgba(10,10,18,0.95))] px-4 py-3.5 font-mono text-sm text-foreground transition-all placeholder:text-muted-foreground/35 focus:outline-none focus:ring-2 disabled:opacity-50 ${
                !isValidUrl
                  ? "border-red-500/40 focus:border-red-500/60 focus:ring-red-500/10"
                  : "border-white/10 focus:border-primary/45 focus:ring-primary/10"
              }`}
            />
            {!isValidUrl && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <AlertCircle className="h-4 w-4 text-red-400/70" />
              </div>
            )}
          </div>
          <Button
            type="submit"
            disabled={submitting || !url.trim()}
            className="glow-red rounded-xl px-6 py-3.5 font-semibold text-sm h-auto"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="hidden sm:inline ml-2">Analyzing...</span>
              </>
            ) : (
              <>
                Visualize
                <ArrowRight className="h-4 w-4 ml-1.5" />
              </>
            )}
          </Button>
        </form>

        {/* Validation hint */}
        {!isValidUrl && (
          <p className="mt-2 font-mono text-[11px] text-red-400/70 text-center">
            Enter a valid GitHub URL: https://github.com/owner/repo
          </p>
        )}

        {/* Error message */}
        {error && (
          <p className="mt-3 rounded-xl border border-red-500/20 bg-[#1a0a0a] px-4 py-2.5 text-center font-mono text-xs text-red-400">
            {error}
          </p>
        )}

        {/* Quick picks */}
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          {QUICK_PICKS.map((pick) => (
            <button
              key={pick.repo}
              onClick={() => {
                setUrl(`https://github.com/${pick.repo}`)
                setError(null)
              }}
              disabled={submitting}
              className={`cursor-pointer rounded-full border px-3.5 py-1.5 font-mono text-[11px] transition-all disabled:cursor-not-allowed disabled:opacity-50 ${
                pick.featured
                  ? "border-primary/30 bg-primary/10 text-primary hover:bg-primary/15 hover:border-primary/50"
                  : "border-white/10 bg-[linear-gradient(155deg,rgba(12,12,22,0.9),rgba(9,9,16,0.9))] text-muted-foreground/65 hover:border-primary/35 hover:bg-[linear-gradient(155deg,rgba(16,16,28,0.92),rgba(10,10,18,0.95))] hover:text-foreground"
              }`}
            >
              {pick.featured && <Star className="inline h-3 w-3 mr-1 fill-current" />}
              {pick.label}
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}
