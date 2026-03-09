import Link from "next/link"
import { Github, Twitter } from "lucide-react"

export function Footer() {
  return (
    <footer className="relative bg-zinc-950 border-t border-zinc-800/50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
          {/* Brand + copyright */}
          <div className="flex items-center gap-3 justify-center md:justify-start">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary font-mono text-xs font-bold text-white">
              CC
            </div>
            <div>
              <span className="font-mono text-sm text-zinc-300 tracking-wider">
                CodeCity
              </span>
              <p className="text-xs text-zinc-500">
                Built by Omkar · © {new Date().getFullYear()}
              </p>
            </div>
          </div>

          {/* Navigation links */}
          <nav className="flex items-center justify-center gap-6">
            <Link
              href="/dashboard"
              className="min-h-[44px] min-w-[44px] flex items-center justify-center text-sm text-zinc-500 hover:text-white transition-colors"
            >
              Dashboard
            </Link>
            <Link
              href="/explore"
              className="min-h-[44px] min-w-[44px] flex items-center justify-center text-sm text-zinc-500 hover:text-white transition-colors"
            >
              Explore
            </Link>
            <Link
              href="https://github.com/omkarbhad/codecity"
              className="min-h-[44px] min-w-[44px] flex items-center justify-center text-sm text-zinc-500 hover:text-white transition-colors"
            >
              GitHub
            </Link>
          </nav>

          {/* Social links */}
          <div className="flex items-center justify-center md:justify-end gap-2">
            <Link
              href="https://github.com/omkarbhad/codecity"
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 transition-all"
              aria-label="GitHub"
            >
              <Github className="h-5 w-5" />
            </Link>
            <Link
              href="https://x.com/omaborkar"
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 transition-all"
              aria-label="Twitter"
            >
              <Twitter className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
