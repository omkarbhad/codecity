import Link from "next/link"
import { Code2, ExternalLink, FileCode, GitBranch } from "lucide-react"

interface DemoProject {
  name: string
  repoUrl: string
  fileCount: number
  lineCount: number
  description: string
}

const demoProjects: DemoProject[] = [
  {
    name: "vercel/next.js",
    repoUrl: "https://github.com/vercel/next.js",
    fileCount: 4200,
    lineCount: 312000,
    description: "The React framework",
  },
  {
    name: "facebook/react",
    repoUrl: "https://github.com/facebook/react",
    fileCount: 1840,
    lineCount: 248000,
    description: "A JavaScript library for building UIs",
  },
  {
    name: "microsoft/vscode",
    repoUrl: "https://github.com/microsoft/vscode",
    fileCount: 8900,
    lineCount: 1_200_000,
    description: "Visual Studio Code",
  },
  {
    name: "tailwindlabs/tailwindcss",
    repoUrl: "https://github.com/tailwindlabs/tailwindcss",
    fileCount: 610,
    lineCount: 84000,
    description: "Utility-first CSS framework",
  },
  {
    name: "supabase/supabase",
    repoUrl: "https://github.com/supabase/supabase",
    fileCount: 3100,
    lineCount: 420000,
    description: "Open source Firebase alternative",
  },
  {
    name: "trpc/trpc",
    repoUrl: "https://github.com/trpc/trpc",
    fileCount: 720,
    lineCount: 96000,
    description: "End-to-end typesafe APIs",
  },
]

function formatNumber(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}k`
  return value.toString()
}

function ProjectCard({ project }: { project: DemoProject }) {
  const [owner, repo] = project.name.split("/")

  return (
    <article className="rounded-lg border border-white/[0.08] bg-[#0f0f10] p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="font-mono text-xs text-zinc-600">{owner}/</p>
          <h3 className="mt-1 truncate text-base font-semibold text-zinc-100">{repo}</h3>
          <p className="mt-1 text-sm text-zinc-500">{project.description}</p>
        </div>
        <a
          href={project.repoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 rounded-md p-1 text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-300"
          aria-label={`Open ${project.name} on GitHub`}
        >
          <GitBranch className="size-4" />
        </a>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 border-t border-white/[0.08] pt-4">
        <div className="flex items-center gap-2">
          <FileCode className="size-4 text-zinc-600" />
          <span className="font-mono text-sm text-zinc-300">{formatNumber(project.fileCount)}</span>
          <span className="text-xs text-zinc-600">files</span>
        </div>
        <div className="flex items-center gap-2">
          <Code2 className="size-4 text-zinc-600" />
          <span className="font-mono text-sm text-zinc-300">{formatNumber(project.lineCount)}</span>
          <span className="text-xs text-zinc-600">lines</span>
        </div>
      </div>

      <Link
        href="/dashboard"
        className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-zinc-300 hover:text-white"
      >
        Visualize a repo
        <ExternalLink className="size-3.5" />
      </Link>
    </article>
  )
}

export function ExploreSection() {
  return (
    <section id="explore" className="border-b border-white/[0.08] px-4 py-16 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <h2 className="text-2xl font-semibold text-zinc-50">Repositories Worth Mapping</h2>
            <p className="mt-3 text-sm leading-6 text-zinc-400">
              These public repositories show the kind of scale where a spatial map becomes useful.
            </p>
          </div>
          <Link href="/dashboard" className="text-sm font-medium text-zinc-400 hover:text-zinc-200">
            Open CodeCity
          </Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {demoProjects.map((project) => (
            <ProjectCard key={project.name} project={project} />
          ))}
        </div>
      </div>
    </section>
  )
}
