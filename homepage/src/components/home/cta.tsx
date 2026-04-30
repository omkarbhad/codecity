import Link from "next/link"
import { ArrowRight, Github } from "lucide-react"
import { Button } from "@/ui/components/button"

export function CTA() {
  return (
    <section className="border-b border-white/[0.08] px-4 py-16 sm:px-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 rounded-lg border border-white/[0.08] bg-[#0f0f10] p-6 sm:p-8 md:flex-row md:items-center md:justify-between">
        <div className="max-w-2xl">
          <h2 className="text-2xl font-semibold text-zinc-50">Map a repository in CodeCity.</h2>
          <p className="mt-3 text-sm leading-6 text-zinc-400">
            Start with a GitHub repository, or download the desktop app for macOS, Windows, and Linux.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button asChild className="h-10 rounded-md bg-primary px-5 text-sm font-medium text-white hover:bg-red-500">
            <Link href="/dashboard" className="flex items-center gap-2">
              Visualize a repo
              <ArrowRight className="size-4" />
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="h-10 rounded-md border-white/[0.12] bg-transparent px-5 text-sm font-medium text-zinc-300 hover:border-white/[0.20] hover:bg-white/[0.04] hover:text-white"
          >
            <Link
              href="https://github.com/omkarbhad/codecity"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2"
            >
              <Github className="size-4" />
              GitHub
            </Link>
          </Button>
        </div>
      </div>
    </section>
  )
}
