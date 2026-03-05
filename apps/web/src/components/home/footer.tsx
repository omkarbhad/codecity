import Link from "next/link"
import { Separator } from "@codecity/ui/components/separator"
import { Github } from "lucide-react"

export function Footer() {
  return (
    <footer className="border-t border-border/20 py-14 relative overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute left-[60%] top-[-40%] h-[300px] w-[460px] rounded-full bg-[radial-gradient(circle_at_center,rgba(255,92,92,0.08),transparent_72%)] blur-[120px]" />
        <div className="absolute left-[12%] bottom-[-45%] h-[260px] w-[360px] rounded-full bg-[radial-gradient(circle_at_center,rgba(0,212,255,0.07),transparent_72%)] blur-[120px]" />
      </div>

      <div className="relative mx-auto max-w-7xl px-6">
        <div className="flex flex-col items-center gap-8 sm:flex-row sm:justify-between">
          {/* Logo + tagline */}
          <div className="flex flex-col items-center sm:items-start gap-2.5">
            <div className="flex items-center gap-2.5">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/85 font-mono text-[8px] font-bold text-white shadow-[0_0_14px_rgba(255,61,61,0.35)]">
                CC
              </div>
              <span className="font-mono text-xs font-medium text-foreground/60">
                CodeCity
              </span>
              <span className="font-mono text-[10px] text-muted-foreground/25">
                v2.0
              </span>
            </div>
            <p className="font-mono text-[11px] text-muted-foreground/35">
              Built for developers who think in systems.
            </p>
          </div>

          {/* Navigation links */}
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:gap-8">
            <div className="flex items-center gap-6 sm:gap-8">
              <Link
                href="/"
                className="font-mono text-[11px] text-muted-foreground/40 transition-colors hover:text-foreground/70"
              >
                Home
              </Link>
              <Link
                href="/explore"
                className="font-mono text-[11px] text-muted-foreground/40 transition-colors hover:text-foreground/70"
              >
                Explore
              </Link>
              <Link
                href="/dashboard"
                className="font-mono text-[11px] text-muted-foreground/40 transition-colors hover:text-foreground/70"
              >
                Dashboard
              </Link>
            </div>
            <a
              href="https://github.com/omkarbhad/codecity"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground/40 transition-colors hover:text-foreground/70"
            >
              <Github className="h-3.5 w-3.5" />
              GitHub
            </a>
          </div>
        </div>

        <Separator className="my-8 bg-border/15" />

        <div className="flex flex-col items-center gap-2 sm:flex-row sm:justify-between">
          <p className="font-mono text-[10px] text-muted-foreground/25">
            Open source · MIT License · Built by Omkar
          </p>
          <p className="font-mono text-[10px] text-muted-foreground/15">
            © {new Date().getFullYear()} CodeCity
          </p>
        </div>
      </div>
    </footer>
  )
}
