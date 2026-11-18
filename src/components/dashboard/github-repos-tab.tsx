"use client"

import { useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { PlusIcon, CircleAlertIcon, ChevronDownIcon, BuildingIcon, CircleCheckIcon, ClockIcon, GithubIcon, LayoutGridIcon, ListIcon, LoaderCircleIcon, LockIcon, RefreshCwIcon, SearchIcon, UserIcon, GlobeIcon } from "@/components/ui/icons"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Input } from "@codecity/ui/components/input"
import { Button } from "@codecity/ui/components/button"
import { enqueueAnalysis, githubStatus, isTauri, listGithubRepos, type GitHubRepoSummary } from "@/lib/tauri"
import { AppIcon } from "@/components/ui/app-icon"
import { EmptyState } from "@/components/ui/empty-state"

type SortMode = "updated" | "name" | "owner"
type OwnerFilter = "all" | "user" | "org"
type VisibilityFilter = "all" | "public" | "private"
type QueueState = Record<number, "queued" | "queueing" | "failed">

const SORT_OPTIONS = [
  { value: "updated" as const, label: "Updated", icon: ClockIcon },
  { value: "name" as const, label: "A-Z", icon: ChevronDownIcon },
  { value: "owner" as const, label: "Owner", icon: UserIcon },
]

const VISIBILITY_FILTERS: { value: VisibilityFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "public", label: "Public" },
  { value: "private", label: "Private" },
]

const MS_PER_DAY = 86_400_000

/** Thrown when no GitHub token is stored — not worth retrying, the user has to connect first. */
class GithubNotConnectedError extends Error {
  constructor() {
    super("Connect GitHub to load your repositories.")
    this.name = "GithubNotConnectedError"
  }
}

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
    error: loadError,
    isFetching,
    refetch,
  } = useQuery<GitHubRepoSummary[]>({
    queryKey: ["github-repos", "all"],
    enabled: isTauri(),
    retry: (count, err) => !(err instanceof GithubNotConnectedError) && count < 2,
    queryFn: async () => {
      const { connected } = await githubStatus()
      if (!connected) throw new GithubNotConnectedError()
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
        icon={<AppIcon icon={GithubIcon} />}
        title="Desktop app needed"
        description="GitHub repositories load through the CodeCity desktop app. Open it to browse and build your repos."
      />
    )
  }

  if (isError) {
    const notConnected = loadError instanceof GithubNotConnectedError
    return (
      <EmptyState
        icon={<AppIcon icon={notConnected ? GithubIcon : CircleAlertIcon} />}
        title={notConnected ? "GitHub not connected" : "Couldn't load repositories"}
        description={
          notConnected
            ? "Connect GitHub from the sidebar, then load your repositories again."
            : loadError instanceof Error && loadError.message
              ? loadError.message
              : "GitHub did not respond. Check your connection and try again."
        }
        action={
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex h-9 items-center gap-2 px-4 text-[12px] text-(--cream) transition-colors disabled:pointer-events-none disabled:opacity-60 active:translate-y-px bg-(--bg-card) hover:bg-(--bg-raised) rounded-full"
          >
            <AppIcon icon={isFetching ? LoaderCircleIcon : RefreshCwIcon} className={`size-3.5 ${isFetching ? "animate-spin" : ""}`} />
            {notConnected ? "Load repositories" : "Try again"}
          </button>
        }
      />
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="h-3 w-44 animate-pulse bg-(--bg-raised)" />
          <div className="h-8 w-72 animate-pulse bg-(--bg-raised)" />
        </div>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse border border-(--border-pixel) bg-(--bg-raised) p-4 rounded-md" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[12px] font-medium text-(--muted)">
            {filteredRepos.length} / {repos.length} repos
          </span>
          {error && (
            <span role="alert" className="flex items-center gap-1 text-[11px] text-(--sev-high)">
              <AppIcon icon={CircleAlertIcon} className="size-3.5 shrink-0" />
              {error}
            </span>
          )}
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
                <AppIcon icon={opt.icon} className="size-3.5" />
                {opt.label}
              </button>
            ))}
          </div>

          <div className="relative sm:w-56">
            <AppIcon icon={SearchIcon} className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-(--muted)" />
            <Input
              type="text"
              placeholder="search repos, orgs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search repositories"
              className="pl-8"
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
              <AppIcon icon={LayoutGridIcon} className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setView("list")}
              aria-pressed={view === "list"}
              aria-label="List view"
              title="List view"
              className="cc-seg-btn"
            >
              <AppIcon icon={ListIcon} className="size-3.5" />
            </button>
          </div>
        </div>
      </div>

      {filteredRepos.length === 0 ? (
        <EmptyState
          icon={<AppIcon icon={SearchIcon} />}
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
          <div className="overflow-x-auto border border-(--border-light) bg-card scroll-thin rounded-md">
            <div className="min-w-[560px]">
              <div className="grid grid-cols-[minmax(0,1.6fr)_110px_90px_92px_40px] gap-3 border-b border-(--border-pixel) bg-(--bg-raised) px-3 py-2.5 text-[11px] font-medium leading-none text-(--muted)">
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
    { value: "org" as const, label: "Organization repos", icon: BuildingIcon },
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
          <AppIcon icon={option.icon} className="size-3.5" />
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
      <div className="grid min-h-11 grid-cols-[minmax(0,1.6fr)_110px_90px_92px_40px] items-center gap-3 border-b border-(--border-pixel) px-3 py-2.5 transition-colors last:border-b-0 hover:bg-(--bg-raised)">
        <div className="min-w-0">
          <p className="truncate text-[11px] text-(--muted)">{repo.owner_login}/</p>
          <h3 className="truncate text-[12px] font-medium leading-tight text-(--cream)">{repoName}</h3>
        </div>
        <span className="text-[11px] text-(--muted)">{ownerKind}</span>
        <span className="inline-flex w-fit items-center gap-1.5 border border-(--border-pixel) bg-(--bg-raised) px-1.5 py-0.5 text-[11px] text-(--muted) rounded-md">
          {repo.private ? <AppIcon icon={LockIcon} className="size-3.5" /> : <AppIcon icon={GlobeIcon} className="size-3.5" />}
          {repo.private ? "private" : "public"}
        </span>
        <span className="truncate text-[11px] text-(--muted)">{timeAgo(repo.updated_at)}</span>
        <Button
          type="button"
          onClick={onQueue}
          disabled={isQueueing || isQueued}
          title={isQueued ? "Queued" : "Queue new city"}
          aria-label={isQueued ? "Queued" : "Queue new city"}
          className="size-7 p-0 text-(--cream-dark) hover:bg-(--bg-raised) hover:text-(--cream) disabled:opacity-70 active:translate-y-px bg-(--bg-card) rounded-[10px]"
        >
          {isQueueing ? <AppIcon icon={LoaderCircleIcon} className="size-3.5 animate-spin" /> : isQueued ? <AppIcon icon={CircleCheckIcon} className="size-3.5" /> : <AppIcon icon={PlusIcon} className="size-3.5" />}
        </Button>
      </div>
    )
  }

  return (
    <div className="group rounded-[16px] border border-(--border-pixel) bg-(--bg-card) p-4 transition-colors hover:border-(--border-light)">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[11px] text-(--muted)">{repo.owner_login}/</p>
          <h3 className="truncate text-[13px] font-semibold leading-tight text-(--cream)">{repoName}</h3>
        </div>
        <span className="flex size-7 shrink-0 items-center justify-center border border-(--border-pixel) bg-(--bg-raised) text-(--muted) rounded-md">
          {repo.private ? <AppIcon icon={LockIcon} className="size-3.5" /> : <AppIcon icon={GlobeIcon} className="size-3.5" />}
        </span>
      </div>

      <div className="mb-3 flex items-center gap-2 text-[11px] text-(--muted)">
        <span className="border border-(--border-pixel) bg-(--bg-raised) px-1.5 py-0.5 rounded-md">{ownerKind}</span>
        <span className="border border-(--border-pixel) bg-(--bg-raised) px-1.5 py-0.5 rounded-md">{repo.private ? "private" : "public"}</span>
        <span className="truncate border border-(--border-pixel) bg-(--bg-raised) px-1.5 py-0.5 rounded-md">{repo.default_branch}</span>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-(--border-pixel) pt-3">
        <span className="text-[11px] text-(--muted)">updated {timeAgo(repo.updated_at)}</span>
        <Button
          type="button"
          onClick={onQueue}
          disabled={isQueueing || isQueued}
          title={isQueued ? "Queued" : "Queue new city"}
          aria-label={isQueued ? "Queued" : "Queue new city"}
          className="size-7 p-0 text-(--cream-dark) hover:bg-(--bg-raised) hover:text-(--cream) disabled:opacity-70 active:translate-y-px bg-(--bg-card) rounded-[10px]"
        >
          {isQueueing ? (
            <AppIcon icon={LoaderCircleIcon} className="size-3.5 animate-spin" />
          ) : isQueued ? (
            <AppIcon icon={CircleCheckIcon} className="size-3.5" />
          ) : (
            <AppIcon icon={PlusIcon} className="size-3.5" />
          )}
        </Button>
      </div>
    </div>
  )
}
