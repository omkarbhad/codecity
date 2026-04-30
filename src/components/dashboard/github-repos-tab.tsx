"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowDownAZ, Building2, Check, Clock, Github, Globe2, Loader2, Lock, Plus, Search, UserRound } from "lucide-react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Input } from "@codecity/ui/components/input"
import { Button } from "@codecity/ui/components/button"
import { enqueueAnalysis, getGithubToken, isTauri, listGithubRepos, type GitHubRepoSummary } from "@/lib/tauri"

type SortMode = "updated" | "name" | "owner"
type OwnerFilter = "all" | "user" | "org"
type VisibilityFilter = "all" | "public" | "private"
type QueueState = Record<number, "queued" | "queueing" | "failed">

const SORT_OPTIONS: { value: SortMode; label: string; icon: typeof Clock }[] = [
  { value: "updated", label: "Updated", icon: Clock },
  { value: "name", label: "A-Z", icon: ArrowDownAZ },
  { value: "owner", label: "Owner", icon: UserRound },
]

const VISIBILITY_FILTERS: { value: VisibilityFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "public", label: "Public" },
  { value: "private", label: "Private" },
]

const MS_PER_DAY = 86_400_000

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const days = Math.max(0, Math.floor(diff / MS_PER_DAY))
  if (days === 0) return "today"
  if (days === 1) return "1d ago"
  if (days < 7) return `${days}d ago`
  if (days < 30) return `${Math.floor(days / 7)}w ago`
  return `${Math.floor(days / 30)}mo ago`
}

function sortRepos(repos: GitHubRepoSummary[], sort: SortMode): GitHubRepoSummary[] {
  switch (sort) {
    case "name":
      return [...repos].sort((a, b) => a.full_name.localeCompare(b.full_name))
    case "owner":
      return [...repos].sort((a, b) => a.owner_login.localeCompare(b.owner_login) || a.full_name.localeCompare(b.full_name))
    case "updated":
    default:
      return [...repos].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
  }
}

function getOwnerFilter(repo: GitHubRepoSummary): OwnerFilter {
  return repo.owner_type === "Organization" ? "org" : "user"
}

function matchesSearch(repo: GitHubRepoSummary, search: string): boolean {
  const needle = search.trim().toLowerCase()
  if (!needle) return true
  return [repo.full_name, repo.owner_login, repo.default_branch].some((value) => value.toLowerCase().includes(needle))
}

export function GitHubReposTab() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState("")
  const [sort, setSort] = useState<SortMode>("updated")
  const [ownerFilter, setOwnerFilter] = useState<OwnerFilter>("all")
  const [visibilityFilter, setVisibilityFilter] = useState<VisibilityFilter>("all")
  const [queueState, setQueueState] = useState<QueueState>({})
  const [error, setError] = useState<string | null>(null)

  const {
    data: repos = [],
    isLoading,
    isError,
    refetch,
  } = useQuery<GitHubRepoSummary[]>({
    queryKey: ["github-repos", "all"],
    enabled: isTauri(),
    queryFn: async () => {
      const token = await getGithubToken()
      if (!token) throw new Error("Connect GitHub to load your repositories.")
      return listGithubRepos("all")
    },
  })

  const filteredRepos = useMemo(() => {
    const filtered = repos.filter((repo) => {
      const visibilityMatches = visibilityFilter === "all" || (visibilityFilter === "private" ? repo.private : !repo.private)
      const ownerMatches = ownerFilter === "all" || getOwnerFilter(repo) === ownerFilter
      return visibilityMatches && ownerMatches && matchesSearch(repo, search)
    })

    return sortRepos(filtered, sort)
  }, [ownerFilter, repos, search, sort, visibilityFilter])

  async function queueRepo(repo: GitHubRepoSummary) {
    setQueueState((current) => ({ ...current, [repo.id]: "queueing" }))
    setError(null)

    try {
      await enqueueAnalysis(repo.html_url)
      await queryClient.invalidateQueries({ queryKey: ["projects"] })
      setQueueState((current) => ({ ...current, [repo.id]: "queued" }))
      router.push("/dashboard")
    } catch (err) {
      setQueueState((current) => ({ ...current, [repo.id]: "failed" }))
      setError(err instanceof Error ? err.message : "Could not queue repository")
    }
  }

  if (!isTauri()) {
    return (
      <div className="flex flex-col items-center rounded-lg border border-white/[0.06] bg-white/[0.015] py-16 text-center">
        <Github className="mb-3 size-8 text-zinc-700" />
        <p className="text-[13px] font-mono text-zinc-500">open the desktop app to load GitHub repos</p>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="rounded-lg border border-white/[0.07] bg-white/[0.015] px-6 py-12 text-center">
        <Github className="mx-auto mb-3 size-8 text-zinc-700" />
        <p className="text-[13px] font-mono text-zinc-400">GitHub repositories are not available</p>
        <p className="mt-1 text-[11px] text-zinc-600">Connect GitHub from the sidebar, then refresh this list.</p>
        <Button
          type="button"
          onClick={() => refetch()}
          className="mt-4 h-8 rounded-md bg-white/[0.06] px-3 text-[11px] text-zinc-200 hover:bg-white/[0.10]"
        >
          Retry
        </Button>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="h-3 w-44 animate-pulse rounded bg-white/[0.04]" />
          <div className="h-8 w-72 animate-pulse rounded-md bg-white/[0.03]" />
        </div>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-lg border border-white/[0.05] bg-white/[0.02] p-4" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-medium text-zinc-500">
            {filteredRepos.length} / {repos.length} repos
          </span>
          {error && <span className="text-[10px] font-mono text-primary/80">{error}</span>}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <SegmentedControl
            options={VISIBILITY_FILTERS}
            value={visibilityFilter}
            onChange={setVisibilityFilter}
          />
          <OwnerIconSwitcher
            value={ownerFilter}
            onChange={setOwnerFilter}
          />

          <div className="flex items-center gap-0.5 rounded-md border border-white/[0.07] bg-white/[0.02] p-0.5">
            {SORT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setSort(opt.value)}
                className={`flex h-7 items-center gap-1.5 rounded px-2 text-[11px] font-medium transition-colors ${
                  sort === opt.value ? "bg-white/[0.08] text-zinc-100" : "text-zinc-600 hover:text-zinc-300"
                }`}
              >
                <opt.icon className="size-3" />
                {opt.label}
              </button>
            ))}
          </div>

          <div className="relative sm:w-56">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3 -translate-y-1/2 text-zinc-600" />
            <Input
              type="text"
              placeholder="search repos, orgs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 rounded-md border-white/[0.07] bg-white/[0.03] pl-7 text-[12px] font-mono text-zinc-300 placeholder:text-zinc-700 focus-visible:border-primary/35 focus-visible:ring-0"
            />
          </div>
        </div>
      </div>

      {filteredRepos.length === 0 ? (
        <div className="flex flex-col items-center rounded-lg border border-white/[0.05] bg-white/[0.01] py-16">
          <Building2 className="mb-3 size-8 text-zinc-700" />
          <p className="text-[13px] font-mono text-zinc-500">no repositories match this view</p>
          <p className="mt-1 text-[11px] text-zinc-700">Try another search, owner, or visibility filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
          {filteredRepos.map((repo) => (
            <RepoCard key={repo.id} repo={repo} queueState={queueState[repo.id]} onQueue={() => queueRepo(repo)} />
          ))}
        </div>
      )}
    </div>
  )
}

function SegmentedControl<TValue extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: TValue; label: string }[]
  value: TValue
  onChange: (value: TValue) => void
}) {
  return (
    <div className="flex items-center gap-0.5 rounded-md border border-white/[0.07] bg-white/[0.02] p-0.5">
      {options.map((filter) => (
        <button
          key={filter.value}
          type="button"
          onClick={() => onChange(filter.value)}
          className={`h-7 rounded px-2 text-[11px] font-medium transition-colors ${
            value === filter.value ? "bg-white/[0.08] text-zinc-100" : "text-zinc-600 hover:text-zinc-300"
          }`}
        >
          {filter.label}
        </button>
      ))}
    </div>
  )
}

function OwnerIconSwitcher({
  value,
  onChange,
}: {
  value: OwnerFilter
  onChange: (value: OwnerFilter) => void
}) {
  const options: { value: Exclude<OwnerFilter, "all">; label: string; icon: typeof UserRound }[] = [
    { value: "user", label: "User repos", icon: UserRound },
    { value: "org", label: "Organization repos", icon: Building2 },
  ]

  return (
    <div className="flex items-center gap-0.5 rounded-md border border-white/[0.07] bg-white/[0.02] p-0.5">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          title={option.label}
          aria-label={option.label}
          aria-pressed={value === option.value}
          onClick={() => onChange(value === option.value ? "all" : option.value)}
          className={`flex size-7 items-center justify-center rounded transition-colors ${
            value === option.value ? "bg-white/[0.08] text-zinc-100" : "text-zinc-600 hover:text-zinc-300"
          }`}
        >
          <option.icon className="size-3.5" />
        </button>
      ))}
    </div>
  )
}

function RepoCard({
  repo,
  queueState,
  onQueue,
}: {
  repo: GitHubRepoSummary
  queueState?: "queued" | "queueing" | "failed"
  onQueue: () => void
}) {
  const ownerKind = repo.owner_type === "Organization" ? "org" : "user"
  const repoName = repo.full_name.split("/")[1] ?? repo.full_name
  const isQueued = queueState === "queued"
  const isQueueing = queueState === "queueing"

  return (
    <div className="group rounded-lg border border-white/[0.07] bg-[#101012] p-4 transition-colors hover:border-white/[0.13] hover:bg-white/[0.025]">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[10px] font-mono text-zinc-700">{repo.owner_login}/</p>
          <h3 className="truncate text-[13px] font-semibold leading-tight text-zinc-100">{repoName}</h3>
        </div>
        <span className="flex size-7 shrink-0 items-center justify-center rounded-md border border-white/[0.07] bg-white/[0.025] text-zinc-600">
          {repo.private ? <Lock className="size-3.5" /> : <Globe2 className="size-3.5" />}
        </span>
      </div>

      <div className="mb-3 flex items-center gap-2 text-[10px] font-mono text-zinc-600">
        <span className="rounded border border-white/[0.06] bg-white/[0.02] px-1.5 py-0.5">{ownerKind}</span>
        <span className="rounded border border-white/[0.06] bg-white/[0.02] px-1.5 py-0.5">{repo.private ? "private" : "public"}</span>
        <span className="truncate rounded border border-white/[0.06] bg-white/[0.02] px-1.5 py-0.5">{repo.default_branch}</span>
      </div>

      <div className="flex items-center justify-between border-t border-white/[0.04] pt-3">
        <span className="text-[10px] font-mono text-zinc-700">updated {timeAgo(repo.updated_at)}</span>
        <Button
          type="button"
          onClick={onQueue}
          disabled={isQueueing || isQueued}
          title={isQueued ? "Queued" : "Queue new city"}
          aria-label={isQueued ? "Queued" : "Queue new city"}
          className="size-7 rounded-md border border-white/[0.08] bg-white/[0.035] p-0 text-zinc-300 hover:border-white/[0.14] hover:bg-white/[0.06] hover:text-zinc-100 disabled:opacity-70"
        >
          {isQueueing ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : isQueued ? (
            <Check className="size-3.5" />
          ) : (
            <Plus className="size-3.5" />
          )}
        </Button>
      </div>
    </div>
  )
}
