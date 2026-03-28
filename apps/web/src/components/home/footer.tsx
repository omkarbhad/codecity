import Link from "next/link"
import Image from "next/image"
import { Github, Twitter } from "lucide-react"

const footerLinks = {
  product: [
    { href: "/#features", label: "Features" },
    { href: "/#how-it-works", label: "How It Works" },
    { href: "/explore", label: "Explore" },
    { href: "/dashboard", label: "Dashboard" },
  ],
  resources: [
    { href: "https://github.com/omkarbhad/codecity", label: "GitHub", external: true },
    { href: "https://github.com/omkarbhad/codecity/issues", label: "Issues", external: true },
    { href: "https://github.com/omkarbhad/codecity/discussions", label: "Discussions", external: true },
  ],
}

export function Footer() {
  return (
    <footer className="border-t border-white/[0.06]">
      <div className="max-w-5xl mx-auto px-5 sm:px-8 md:px-10 py-10">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          {/* Brand */}
          <div className="col-span-2 md:col-span-2">
            <Link href="/" className="inline-flex items-center gap-2.5 mb-3">
              <Image src="/logo.png" alt="CodeCity" width={28} height={28} className="rounded-md" />
              <span className="text-sm font-semibold text-zinc-50">CodeCity</span>
            </Link>
            <p className="text-xs text-zinc-500 max-w-xs leading-relaxed">
              Visualize GitHub repositories as interactive 3D cities. Understand architecture at a glance.
            </p>
            <div className="flex items-center gap-1.5 mt-4">
              <Link
                href="https://github.com/omkarbhad/codecity"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 transition-colors duration-200 hover:bg-white/[0.04] hover:text-zinc-300"
                aria-label="GitHub"
              >
                <Github className="h-3.5 w-3.5" />
              </Link>
              <Link
                href="https://x.com/omaborkar"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 transition-colors duration-200 hover:bg-white/[0.04] hover:text-zinc-300"
                aria-label="Twitter"
              >
                <Twitter className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>

          {/* Product */}
          <div>
            <h4 className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-3">Product</h4>
            <ul className="space-y-2">
              {footerLinks.product.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors duration-200">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-3">Resources</h4>
            <ul className="space-y-2">
              {footerLinks.resources.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    {...(link.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                    className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors duration-200"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-8 pt-6 border-t border-white/[0.04] flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs text-zinc-600">
            © {new Date().getFullYear()} CodeCity · Built by Omkar
          </p>
          <p className="text-xs text-zinc-600">
            MIT Licensed · Open Source
          </p>
        </div>
      </div>
    </footer>
  )
}
