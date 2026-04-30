import Link from "next/link"
import Image from "next/image"
import { Button } from "@/ui/components/button"
import { ArrowRight, Github } from "lucide-react"

const STATS = [
  { value: "16+", label: "Languages" },
  { value: "<60s", label: "Repo to City" },
  { value: "MIT", label: "Licensed" },
]

export function HeroSection() {
  return (
    <section className="border-b border-white/[0.08] px-4 pb-16 pt-28 sm:px-6 sm:pb-20">
      <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <div>
          <p className="mb-4 text-sm font-medium text-zinc-400">Open source codebase visualization</p>
          <h1 className="max-w-3xl text-4xl font-semibold leading-tight text-zinc-50 sm:text-5xl lg:text-6xl">
            Turn a GitHub repo into a map your team can inspect.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-zinc-400">
            CodeCity converts files, directories, languages, and file sizes into an
            interactive 3D city so architecture is easier to review and explain.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button
              asChild
              className="h-10 rounded-md bg-primary px-5 text-sm font-medium text-white transition-colors hover:bg-red-500"
            >
              <Link href="/dashboard" className="flex items-center gap-2">
                Visualize a repo
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>

            <Button
              asChild
              variant="outline"
              className="h-10 rounded-md border-white/[0.12] bg-transparent px-5 text-sm font-medium text-zinc-300 transition-colors hover:border-white/[0.20] hover:bg-white/[0.04] hover:text-white"
            >
              <Link
                href="https://github.com/omkarbhad/codecity"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2"
              >
                <Github className="h-4 w-4" />
                GitHub
              </Link>
            </Button>
          </div>

          <div className="mt-10 grid max-w-md grid-cols-3 border-y border-white/[0.08]">
            {STATS.map((stat, i) => (
              <div key={stat.label} className={`py-4 ${i > 0 ? "border-l border-white/[0.08] pl-4" : ""}`}>
                <p className="font-mono text-lg font-semibold text-zinc-100">{stat.value}</p>
                <p className="mt-1 text-xs text-zinc-500">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="overflow-hidden rounded-lg border border-white/[0.10] bg-[#111113]">
          <div className="border-b border-white/[0.08] px-4 py-2 text-xs font-mono text-zinc-500">
            codecity.app/project
          </div>
          <Image
            src="/demo.png"
            alt="CodeCity 3D visualization of a codebase with colorful districts representing different modules"
            width={1200}
            height={750}
            priority
            className="h-auto w-full"
          />
        </div>
      </div>
    </section>
  )
}
