import Image from "next/image"
import Link from "next/link"
import { Github, Twitter } from "lucide-react"

const productLinks = [
  { href: "/#features", label: "Features" },
  { href: "/#how-it-works", label: "How it works" },
  { href: "/#explore", label: "Explore" },
  { href: "/#download", label: "Download" },
  { href: "/dashboard", label: "Dashboard" },
]

const resourceLinks = [
  { href: "https://github.com/omkarbhad/codecity", label: "GitHub" },
  { href: "https://github.com/omkarbhad/codecity/issues", label: "Issues" },
  { href: "https://github.com/omkarbhad/codecity/discussions", label: "Discussions" },
]

export function Footer() {
  return (
    <footer className="px-4 py-10 sm:px-6">
      <div className="mx-auto grid max-w-6xl gap-8 sm:grid-cols-2 lg:grid-cols-4">
        <div className="lg:col-span-2">
          <Link href="/" className="inline-flex items-center gap-2">
            <Image src="/logo.png" alt="CodeCity" width={28} height={28} className="rounded-md" />
            <span className="text-sm font-semibold text-zinc-50">CodeCity</span>
          </Link>
          <p className="mt-3 max-w-sm text-sm leading-6 text-zinc-500">
            Visual maps for repository structure, file scale, and language distribution.
          </p>
          <div className="mt-4 flex items-center gap-2">
            <Link
              href="https://github.com/omkarbhad/codecity"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex size-8 items-center justify-center rounded-md text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-300"
              aria-label="CodeCity on GitHub"
            >
              <Github className="size-4" />
            </Link>
            <Link
              href="https://x.com/omaborkar"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex size-8 items-center justify-center rounded-md text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-300"
              aria-label="Omkar on X"
            >
              <Twitter className="size-4" />
            </Link>
          </div>
        </div>

        <nav aria-label="Product">
          <h2 className="text-sm font-semibold text-zinc-300">Product</h2>
          <ul className="mt-3 space-y-2">
            {productLinks.map((link) => (
              <li key={link.label}>
                <Link href={link.href} className="text-sm text-zinc-500 hover:text-zinc-300">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label="Resources">
          <h2 className="text-sm font-semibold text-zinc-300">Resources</h2>
          <ul className="mt-3 space-y-2">
            {resourceLinks.map((link) => (
              <li key={link.label}>
                <Link
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-zinc-500 hover:text-zinc-300"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <div className="mx-auto mt-8 flex max-w-6xl flex-col gap-2 border-t border-white/[0.08] pt-6 text-xs text-zinc-600 sm:flex-row sm:items-center sm:justify-between">
        <p>© {new Date().getFullYear()} CodeCity</p>
        <p>MIT licensed. Built by Omkar.</p>
      </div>
    </footer>
  )
}
