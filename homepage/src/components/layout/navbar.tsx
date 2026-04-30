import Link from "next/link"
import { Github } from "lucide-react"

export function Navbar() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/[0.08] bg-[#0b0b0c]/95">
      <nav className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <img src="/logo.png" alt="CodeCity" className="size-7 rounded-md" />
          <span className="text-sm font-semibold text-zinc-100">CodeCity</span>
        </Link>

        <div className="hidden items-center gap-6 text-[13px] font-medium text-zinc-400 sm:flex">
          <a href="#features" className="transition-colors hover:text-zinc-100">Features</a>
          <a href="#how-it-works" className="transition-colors hover:text-zinc-100">How it works</a>
          <a href="#explore" className="transition-colors hover:text-zinc-100">Explore</a>
          <a href="#download" className="transition-colors hover:text-zinc-100">Download</a>
        </div>

        <Link
          href="https://github.com/omkarbhad/codecity"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex size-8 items-center justify-center rounded-md border border-white/[0.10] text-zinc-300 transition-colors hover:border-white/[0.18] hover:text-white"
          aria-label="Open CodeCity on GitHub"
        >
          <Github className="size-4" />
        </Link>
      </nav>
    </header>
  )
}
