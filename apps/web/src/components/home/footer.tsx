import Link from "next/link"
import { Github, Twitter } from "lucide-react"

export function Footer() {
  return (
    <footer className="border-t border-white/[0.06]">
      <div className="max-w-5xl mx-auto px-5 sm:px-8 md:px-10 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
          {/* Brand + copyright */}
          <div className="flex items-center gap-3 justify-center md:justify-start">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-indigo-500 text-[10px] font-bold text-white">
              CC
            </div>
            <div>
              <span className="text-sm font-semibold text-zinc-50 tracking-wide">
                CodeCity
              </span>
              <p className="text-xs text-zinc-500">
                Built by Omkar · © {new Date().getFullYear()}
              </p>
            </div>
          </div>

          {/* Navigation links */}
          <nav className="flex items-center justify-center gap-6">
            {[
              { href: "/dashboard", label: "Dashboard" },
              { href: "/explore", label: "Explore" },
              { href: "https://github.com/omkarbhad/codecity", label: "GitHub" },
            ].map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="text-sm text-zinc-400 hover:text-white transition-colors duration-200"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Social links */}
          <div className="flex items-center justify-center md:justify-end gap-2">
            <Link
              href="https://github.com/omkarbhad/codecity"
              className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-500 hover:text-white hover:bg-white/[0.04] transition-all duration-200"
              aria-label="GitHub"
            >
              <Github className="h-4 w-4" />
            </Link>
            <Link
              href="https://x.com/omaborkar"
              className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-500 hover:text-white hover:bg-white/[0.04] transition-all duration-200"
              aria-label="Twitter"
            >
              <Twitter className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
