import Link from "next/link"
import { Apple, MonitorDown, Package, Terminal } from "lucide-react"

const releaseUrl = "https://github.com/omkarbhad/codecity/releases/latest"

const platforms = [
  {
    icon: Apple,
    name: "macOS",
    detail: "Download the .dmg for Apple Silicon or Intel Macs.",
  },
  {
    icon: MonitorDown,
    name: "Windows",
    detail: "Use the .msi or .exe installer from the latest release.",
  },
  {
    icon: Terminal,
    name: "Linux",
    detail: "Pick the .AppImage, .deb, or .rpm package when available.",
  },
]

export function Downloads() {
  return (
    <section id="download" className="border-b border-white/[0.08] px-4 py-16 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 max-w-2xl">
          <h2 className="text-2xl font-semibold text-zinc-50">Download the Desktop App</h2>
          <p className="mt-3 text-sm leading-6 text-zinc-400">
            Install CodeCity locally to analyze folders, cache projects, and review codebases without leaving your machine.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {platforms.map((platform) => {
            const Icon = platform.icon
            return (
              <Link
                key={platform.name}
                href={releaseUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg border border-white/[0.08] bg-[#0f0f10] p-5 transition-colors hover:border-white/[0.18]"
              >
                <div className="flex items-start justify-between gap-4">
                  <Icon className="size-5 text-zinc-400" />
                  <Package className="size-4 text-zinc-600" />
                </div>
                <h3 className="mt-5 text-base font-semibold text-zinc-100">{platform.name}</h3>
                <p className="mt-2 text-sm leading-6 text-zinc-500">{platform.detail}</p>
                <p className="mt-4 text-sm font-medium text-zinc-300">Open latest release</p>
              </Link>
            )
          })}
        </div>
      </div>
    </section>
  )
}
