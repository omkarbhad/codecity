import Link from "next/link"
import { Github, Twitter } from "lucide-react"

export function Footer() {
  return (
    <footer className="relative bg-zinc-950 border-t border-zinc-800/50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Logo & copyright */}
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500 font-mono text-[10px] font-bold text-white">
              CC
            </div>
            <div>
              <span className="font-mono text-sm text-zinc-400 tracking-wider">
                CodeCity
              </span>
              <p className="text-xs text-zinc-600">
                © {new Date().getFullYear()} All rights reserved
              </p>
            </div>
          </div>

          {/* Links */}
          <nav className="flex items-center gap-6 text-sm text-zinc-500">
            <Link
              href="/explore"
              className="hover:text-white transition-colors"
            >
              Explore
            </Link>
            <Link
              href="/dashboard"
              className="hover:text-white transition-colors"
            >
              Dashboard
            </Link>
            <Link href="/docs" className="hover:text-white transition-colors">
              Docs
            </Link>
          </nav>

          {/* Social */}
          <div className="flex items-center gap-4">
            <Link
              href="https://github.com/omkarbhad/codecity"
              className="p-2 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 transition-all"
              aria-label="GitHub"
            >
              <Github className="h-5 w-5" />
            </Link>
            <Link
              href="https://twitter.com/codecity"
              className="p-2 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 transition-all"
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
