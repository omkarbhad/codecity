"use client"

import { useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Loader2 } from "lucide-react"
import {
  Add01Icon,
  ArrowDown01Icon,
  Building03Icon,
  CheckmarkCircle02Icon,
  Clock03Icon,
  GithubIcon,
  GridViewIcon,
  LayoutTable01Icon,
  LockIcon,
  Search01Icon,
  UserIcon,
  GlobeIcon,
} from "@hugeicons/core-free-icons"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Input } from "@codecity/ui/components/input"
import { Button } from "@codecity/ui/components/button"
import { enqueueAnalysis, getGithubToken, isTauri, listGithubRepos, type GitHubRepoSummary } from "@/lib/tauri"
import { HugeIcon } from "@/components/ui/huge-icon"
import { EmptyState } from "@/components/ui/empty-state"

type SortMode = "updated" | "name" | "owner"
type OwnerFilter = "all" | "user" | "org"
type VisibilityFilter = "all" | "public" | "private"
type QueueState = Record<number, "queued" | "queueing" | "failed">

const SORT_OPTIONS = [
  { value: "updated" as const, label: "Updated", icon: Clock03Icon },
  { value: "name" as const, label: "A-Z", icon: ArrowDown01Icon },
  { value: "owner" as const, label: "Owner", icon: UserIcon },
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
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState(() => searchParams.get("search") ?? "")
  const [sort, setSort] = useState<SortMode>("updated")
  const [ownerFilter, setOwnerFilter] = useState<OwnerFilter>("all")
  const [visibilityFilter, setVisibilityFilter] = useState<VisibilityFilter>("all")
  const [view, setView] = useState<"grid" | "list">("grid")
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
      <EmptyState
        icon={<HugeIcon icon={GithubIcon} />}
        title="Desktop app needed"
        description="GitHub repositories load through the CodeCity desktop app. Open it to browse and build your repos."
      />
    )
  }

  if (isError) {
    return (
      <EmptyState
        icon={<HugeIcon icon={GithubIcon} />}
        title="GitHub not connected"
        description="Connect GitHub from the sidebar, then load your repositories again."
        action={
          <button
            type="button"
            onClick={() => refetch()}
            className="pixel-shadow-sm btn-press flex h-9 items-center gap-2 border-2 border-(--border-light) bg-(--bg-raised) px-4 font-mono text-[11px] uppercase tracking-[0.05em] text-(--cream) transition-colors hover:border-primary"
          >
            Load repositories
          </button>
        }
      />
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="h-3 w-44 animate-pulse rounded-none bg-(--bg-raised)" />
          <div className="h-8 w-72 animate-pulse rounded-md bg-(--bg-raised)" />
        </div>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-lg border border-(--border-pixel) bg-(--bg-raised) p-4" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-medium text-(--muted)">
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

          <div className="cc-seg">
            {SORT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setSort(opt.value)}
                aria-pressed={sort === opt.value}
                title={`Sort by ${opt.label === "A-Z" ? "name" : opt.label.toLowerCase()}`}
                className="cc-seg-btn"
              >
                <HugeIcon icon={opt.icon} className="size-3" />
                {opt.label}
              </button>
            ))}
          </div>

          <div className="relative sm:w-56">
            <HugeIcon icon={Search01Icon} className="pointer-events-none absolute left-2.5 top-1/2 size-3 -translate-y-1/2 text-(--muted)" />
            <Input
              type="text"
              placeholder="search repos, orgs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search repositories"
              className="h-8 rounded-none border-2 border-(--border-pixel) bg-(--bg-raised) pl-7 text-[12px] font-mono text-(--cream) placeholder:text-(--muted) focus-visible:border-primary focus-visible:ring-0"
            />
          </div>

          <div className="cc-seg">
            <button
              type="button"
              onClick={() => setView("grid")}
              aria-pressed={view === "grid"}
              aria-label="Grid view"
              title="Grid view"
              className="cc-seg-btn"
            >
              <HugeIcon icon={GridViewIcon} className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setView("list")}
              aria-pressed={view === "list"}
              aria-label="List view"
              title="List view"
              className="cc-seg-btn"
            >
              <HugeIcon icon={LayoutTable01Icon} className="size-3.5" />
            </button>
          </div>
        </div>
      </div>

      {filteredRepos.length === 0 ? (
        <EmptyState
          icon={<HugeIcon icon={Search01Icon} />}
          title="No matching repositories"
          description="Try another search, owner or visibility filter."
        />
      ) : (
        view === "grid" ? (
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
            {filteredRepos.map((repo) => (
              <RepoCard key={repo.id} repo={repo} queueState={queueState[repo.id]} view={view} onQueue={() => queueRepo(repo)} />
            ))}
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-(--border-pixel) bg-(--bg-raised)">
            <div className="grid grid-cols-[minmax(0,1.6fr)_110px_90px_92px_40px] gap-3 border-b border-(--border-pixel) px-3 py-2 text-[10px] font-medium uppercase tracking-wide text-(--muted)">
              <span>Repository</span>
              <span>Owner</span>
              <span>Access</span>
              <span>Updated</span>
              <span />
            </div>
            {filteredRepos.map((repo) => (
              <RepoCard key={repo.id} repo={repo} queueState={queueState[repo.id]} view={view} onQueue={() => queueRepo(repo)} />
            ))}
          </div>
        )
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
    <div className="cc-seg">
      {options.map((filter) => (
        <button
          key={filter.value}
          type="button"
          onClick={() => onChange(filter.value)}
          aria-pressed={value === filter.value}
          className="cc-seg-btn"
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
  const options = [
    { value: "user" as const, label: "User repos", icon: UserIcon },
    { value: "org" as const, label: "Organization repos", icon: Building03Icon },
  ]

  return (
    <div className="cc-seg">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          title={option.label}
          aria-label={option.label}
          aria-pressed={value === option.value}
          onClick={() => onChange(value === option.value ? "all" : option.value)}
          className="cc-seg-btn"
        >
          <HugeIcon icon={option.icon} className="size-3.5" />
        </button>
      ))}
    </div>
  )
}

function RepoCard({
  repo,
  queueState,
  view,
  onQueue,
}: {
  repo: GitHubRepoSummary
  queueState?: "queued" | "queueing" | "failed"
  view: "grid" | "list"
  onQueue: () => void
}) {
  const ownerKind = repo.owner_type === "Organization" ? "org" : "user"
  const repoName = repo.full_name.split("/")[1] ?? repo.full_name
  const isQueued = queueState === "queued"
  const isQueueing = queueState === "queueing"

  if (view === "list") {
    return (
      <div className="grid min-h-11 grid-cols-[minmax(0,1.6fr)_110px_90px_92px_40px] items-center gap-3 border-b border-(--border-pixel) px-3 py-2.5 transition-colors hover:bg-(--bg-raised)">
        <div className="min-w-0">
          <p className="truncate text-[10px] font-mono text-(--muted)">{repo.owner_login}/</p>
          <h3 className="truncate text-[12px] font-medium leading-tight text-(--cream)">{repoName}</h3>
        </div>
        <span className="font-mono text-[10px] text-(--muted)">{ownerKind}</span>
        <span className="inline-flex w-fit items-center gap-1.5 rounded-none border border-(--border-pixel) bg-(--bg-raised) px-1.5 py-0.5 font-mono text-[10px] text-(--muted)">
          {repo.private ? <HugeIcon icon={LockIcon} className="size-3" /> : <HugeIcon icon={GlobeIcon} className="size-3" />}
          {repo.private ? "private" : "public"}
        </span>
        <span className="truncate font-mono text-[10px] text-(--muted)">{timeAgo(repo.updated_at)}</span>
        <Button
          type="button"
          onClick={onQueue}
          disabled={isQueueing || isQueued}
          title={isQueued ? "Queued" : "Queue new city"}
          aria-label={isQueued ? "Queued" : "Queue new city"}
          className="size-7 rounded-md border border-(--border-pixel) bg-(--bg-raised) p-0 text-(--cream-dark) hover:border-(--border-light) hover:bg-(--bg-card) hover:text-(--cream) disabled:opacity-70"
        >
          {isQueueing ? <Loader2 className="size-3.5 animate-spin" /> : isQueued ? <HugeIcon icon={CheckmarkCircle02Icon} className="size-3.5" /> : <HugeIcon icon={Add01Icon} className="size-3.5" />}
        </Button>
      </div>
    )
  }

  return (
    <div className="group rounded-lg border border-(--border-pixel) bg-(--bg-raised) p-4 transition-colors hover:border-(--border-light) hover:bg-(--bg-raised)">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[10px] font-mono text-(--muted)">{repo.owner_login}/</p>
          <h3 className="truncate text-[13px] font-semibold leading-tight text-(--cream)">{repoName}</h3>
        </div>
        <span className="flex size-7 shrink-0 items-center justify-center rounded-md border border-(--border-pixel) bg-(--bg-raised) text-(--muted)">
          {repo.private ? <HugeIcon icon={LockIcon} className="size-3.5" /> : <HugeIcon icon={GlobeIcon} className="size-3.5" />}
        </span>
      </div>

      <div className="mb-3 flex items-center gap-2 text-[10px] font-mono text-(--muted)">
        <span className="rounded-none border border-(--border-pixel) bg-(--bg-raised) px-1.5 py-0.5">{ownerKind}</span>
        <span className="rounded-none border border-(--border-pixel) bg-(--bg-raised) px-1.5 py-0.5">{repo.private ? "private" : "public"}</span>
        <span className="truncate rounded-none border border-(--border-pixel) bg-(--bg-raised) px-1.5 py-0.5">{repo.default_branch}</span>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-(--border-pixel) pt-3">
        <span className="text-[10px] font-mono text-(--muted)">updated {timeAgo(repo.updated_at)}</span>
        <Button
          type="button"
          onClick={onQueue}
          disabled={isQueueing || isQueued}
          title={isQueued ? "Queued" : "Queue new city"}
          aria-label={isQueued ? "Queued" : "Queue new city"}
          className="size-7 rounded-md border border-(--border-pixel) bg-(--bg-raised) p-0 text-(--cream-dark) hover:border-(--border-light) hover:bg-(--bg-card) hover:text-(--cream) disabled:opacity-70"
        >
          {isQueueing ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : isQueued ? (
            <HugeIcon icon={CheckmarkCircle02Icon} className="size-3.5" />
          ) : (
            <HugeIcon icon={Add01Icon} className="size-3.5" />
          )}
        </Button>
      </div>
    </div>
  )
}
