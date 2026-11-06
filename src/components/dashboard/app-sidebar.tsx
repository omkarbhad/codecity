"use client"

import * as React from "react"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import { open } from "@tauri-apps/plugin-shell"
import {
  Loader2,
} from "lucide-react"
import {
  FolderGitTwoIcon,
  GitBranchIcon,
  UserIcon,
  Logout03Icon,
  GithubIcon,
  StarIcon,
  Clock03Icon,
} from "@hugeicons/core-free-icons"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { fetchProjects, type Project } from "@/lib/projects"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarGroup,
  SidebarRail,
} from "@codecity/ui/components/sidebar"
import { IconButton } from "@codecity/ui/components/icon-button"
import {
  enqueueAnalysis,
  getGithubToken,
  githubGetUser,
  githubImportCliSession,
  githubLoginPoll,
  githubLoginStart,
  isTauri,
  listTrendingGithubRepos,
  logoutGithub,
  setGithubSession,
} from "@/lib/tauri"
import { UpdateButton } from "@/components/dashboard/update-button"
import { HugeIcon } from "@/components/ui/huge-icon"
import { LogoMark } from "@/components/logo"

export function AppSidebar({
  user,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  user?: { name: string | null; image: string | null; email?: string } | null
}) {
  const pathname = usePathname()
  const router = useRouter()
  const queryClient = useQueryClient()
  const [isSigningIn, setIsSigningIn] = React.useState(false)
  const [authCode, setAuthCode] = React.useState<string | null>(null)
  const [authError, setAuthError] = React.useState<string | null>(null)

  const { data: githubUser = null } = useQuery({
    queryKey: ["me"],
    enabled: isTauri(),
    queryFn: async () => {
      const token = await getGithubToken()
      if (!token) return null
      const profile = await githubGetUser(token)
      return {
        name: profile.login,
        image: profile.avatar_url,
      }
    },
  })

  const activeUser = user ?? githubUser

  async function handleLogout() {
    await logoutGithub()
    await queryClient.invalidateQueries({ queryKey: ["me"] })
    router.push("/dashboard")
  }

  async function handleGithubLogin() {
    setIsSigningIn(true)
    setAuthError(null)

    try {
      let device
      try {
        device = await githubLoginStart()
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        if (!message.includes("Not Found")) throw error

        await githubImportCliSession()
        await queryClient.invalidateQueries({ queryKey: ["me"] })
        setAuthCode(null)
        router.replace("/dashboard")
        return
      }

      setAuthCode(device.user_code)
      await open(device.verification_uri)

      const startedAt = Date.now()
      const expiresAt = startedAt + device.expires_in * 1000
      let intervalMs = Math.max(device.interval, 5) * 1000

      while (Date.now() < expiresAt) {
        await new Promise((resolve) => setTimeout(resolve, intervalMs))
        const token = await githubLoginPoll(device.device_code)

        if (token.access_token) {
          const githubUser = await githubGetUser(token.access_token)
          await setGithubSession(token.access_token, githubUser.login)
          await queryClient.invalidateQueries({ queryKey: ["me"] })
          setAuthCode(null)
          router.replace("/dashboard")
          return
        }

        if (token.error === "authorization_pending") continue
        if (token.error === "slow_down") {
          intervalMs += 5000
          continue
        }

        throw new Error(token.error_description ?? token.error ?? "GitHub sign-in failed")
      }

      throw new Error("GitHub sign-in expired. Please try again.")
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : "GitHub sign-in failed")
    } finally {
      setIsSigningIn(false)
    }
  }
  const isRepos = pathname.startsWith("/repos") || pathname.startsWith("/explore")
  const isDashboard = pathname.startsWith("/dashboard")

  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["projects"],
    queryFn: fetchProjects,
  })

  const completedProjects = projects.filter((p) => p.status === "COMPLETED").slice(0, 6)
  const activeCount = projects.filter((p) => p.status === "PROCESSING").length
  const [queueingTrendingId, setQueueingTrendingId] = React.useState<number | null>(null)
  const { data: trendingRepos = [] } = useQuery({
    queryKey: ["github-trending-repos"],
    enabled: isTauri(),
    staleTime: 1000 * 60 * 30,
    queryFn: listTrendingGithubRepos,
  })

  async function handleTrendingClick(repo: { id: number; html_url: string }) {
    setQueueingTrendingId(repo.id)
    try {
      const result = await enqueueAnalysis(repo.html_url)
      await queryClient.invalidateQueries({ queryKey: ["projects"] })
      router.push(`/analyze?id=${encodeURIComponent(result.projectId)}`)
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : "Could not queue trending repo")
    } finally {
      setQueueingTrendingId(null)
    }
  }

  return (
    <Sidebar {...props}>
      {/* Header */}
      <SidebarHeader className="border-b-2 border-[var(--border-pixel)] bg-[var(--bg-deep)]">
        <div className="flex items-center justify-between px-2 py-2.5">
          <Link href="/" className="flex items-center gap-2 min-w-0">
            <LogoMark className="size-6" />
            <span className="text-[12px] font-semibold uppercase tracking-[0.05em] text-[var(--cream)] truncate">CodeCity</span>
          </Link>
          <UpdateButton />
        </div>
      </SidebarHeader>

      <SidebarContent className="gap-0 bg-[var(--bg-deep)] pt-2">
        {/* Nav */}
        <SidebarGroup className="px-2 pb-2">
          <SidebarMenu className="gap-0.5">
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={isDashboard}
                className="h-8 rounded-none border-2 border-transparent text-[11px] font-medium uppercase tracking-[0.05em] text-[var(--muted)] hover:text-[var(--cream)] hover:bg-[var(--bg-raised)] data-[active=true]:text-primary-foreground data-[active=true]:bg-primary data-[active=true]:border-(--bg) data-[active=true]:hover:bg-primary data-[active=true]:hover:text-primary-foreground transition-colors"
              >
                <Link href="/dashboard">
                  <HugeIcon icon={FolderGitTwoIcon} className="size-3.5" />
                  My Cities
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={isRepos}
                className="h-8 rounded-none border-2 border-transparent text-[11px] font-medium uppercase tracking-[0.05em] text-[var(--muted)] hover:text-[var(--cream)] hover:bg-[var(--bg-raised)] data-[active=true]:text-primary-foreground data-[active=true]:bg-primary data-[active=true]:border-(--bg) data-[active=true]:hover:bg-primary data-[active=true]:hover:text-primary-foreground transition-colors"
              >
                <Link href="/repos">
                  <HugeIcon icon={GithubIcon} className="size-3.5" />
                  GitHub Repos
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>

        {/* Divider */}
        <div className="mx-3 mb-2 border-t-2 border-dashed border-[var(--border-pixel)]" />

        {/* Recent Cities */}
        <SidebarGroup className="px-2 pb-2">
          <div className="flex items-center justify-between px-1 mb-1.5">
            <span className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--muted)]">
              <HugeIcon icon={Clock03Icon} className="size-3 text-[var(--dim)]" />
              Recent
            </span>
            {activeCount > 0 && (
              <span className="flex items-center gap-1 text-[10px] font-mono text-[var(--muted)]">
                <Loader2 className="size-3 animate-spin text-primary" />
                {activeCount} running
              </span>
            )}
          </div>
          <SidebarMenu className="gap-0.5">
            {completedProjects.map((project) => {
              const [owner, repo] = project.name.includes("/") ? project.name.split("/") : [null, project.name]
              return (
                <SidebarMenuItem key={project.id}>
                  <SidebarMenuButton
                    asChild
                    className="h-7 rounded-none text-[11px] text-[var(--cream-dark)] hover:text-[var(--cream)] hover:bg-[var(--bg-raised)] transition-colors group"
                  >
                    <Link href={`/project?id=${encodeURIComponent(project.id)}`}>
                      <HugeIcon icon={GitBranchIcon} className="size-3 shrink-0 text-[var(--muted)] group-hover:text-primary" />
                      <span className="truncate font-mono">
                        {owner && <span className="text-[var(--muted)]">{owner}/</span>}
                        <span className="text-[var(--cream)]">{repo}</span>
                      </span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )
            })}
            {completedProjects.length === 0 && (
              <div className="px-2 py-3 text-center">
                <p className="text-[10px] font-mono uppercase tracking-[0.08em] text-[var(--dim)]">no cities yet</p>
              </div>
            )}
          </SidebarMenu>
        </SidebarGroup>

        {trendingRepos.length > 0 && (
          <SidebarGroup className="px-2 pb-2">
            <div className="mb-1.5 flex items-center gap-1.5 px-1 text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--muted)]">
              <HugeIcon icon={StarIcon} className="size-3 text-[var(--sev-med)]" />
              Trending
            </div>
            <div className="space-y-0.5">
              {trendingRepos.map((repo) => {
                const [owner, name] = repo.full_name.split("/")
                const content = (
                  <>
                    <HugeIcon icon={GithubIcon} className="size-3 shrink-0 text-[var(--muted)] group-hover:text-primary" />
                    <span className="min-w-0 truncate">
                      <span className="text-[var(--muted)]">{owner}/</span>
                      <span className="text-[var(--cream-dark)] group-hover:text-[var(--cream)]">{name}</span>
                    </span>
                  </>
                )

                return (
                  <button
                    key={repo.id}
                    type="button"
                    onClick={() => handleTrendingClick(repo)}
                    disabled={queueingTrendingId === repo.id}
                    className="group flex h-7 w-full items-center gap-1.5 rounded-none px-1.5 text-left font-mono text-[11px] text-[var(--cream-dark)] transition-colors hover:bg-[var(--bg-raised)] hover:text-[var(--cream)] disabled:opacity-60"
                  >
                    {queueingTrendingId === repo.id ? <Loader2 className="size-3 shrink-0 animate-spin text-primary" /> : content}
                  </button>
                )
              })}
            </div>
          </SidebarGroup>
        )}
      </SidebarContent>

      {/* Footer */}
      <SidebarFooter className="border-t-2 border-[var(--border-pixel)] bg-[var(--bg-deep)] p-2">
        {authCode && (
          <div className="pixel-shadow-sm mb-2 rounded-none border-2 border-[var(--border-light)] bg-[var(--bg-card)] px-2 py-2">
            <p className="text-[11px] leading-4 text-[var(--cream-dark)]">Enter this code on the GitHub page that just opened:</p>
            <p className="mt-1 select-all font-mono text-[15px] font-semibold tracking-[0.2em] text-primary">{authCode}</p>
          </div>
        )}
        {authError && (
          <p className="mb-2 px-2 text-[10px] leading-4 text-[var(--sev-high)]">{authError}</p>
        )}
        {activeUser?.name ? (
          <div className="flex items-center gap-2 px-2 py-1.5">
            {activeUser.image ? (
              <img src={activeUser.image} alt="" className="size-6 shrink-0 border-2 border-[var(--border-pixel)]" />
            ) : (
              <div className="flex size-6 shrink-0 items-center justify-center border-2 border-[var(--border-pixel)] bg-[var(--bg-raised)]">
                <HugeIcon icon={UserIcon} className="size-3 text-[var(--muted)]" />
              </div>
            )}
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="truncate text-[11px] font-medium text-[var(--cream)]">{activeUser.name}</span>
              <span className="truncate font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--muted)]">GitHub connected</span>
            </div>
            <IconButton
              onClick={handleLogout}
              title="Sign out of GitHub"
              aria-label="Sign out of GitHub"
              className="size-6 border-transparent bg-transparent text-[var(--muted)] hover:bg-[var(--bg-raised)] hover:text-[var(--cream)]"
            >
              <HugeIcon icon={Logout03Icon} />
            </IconButton>
          </div>
        ) : (
          <div className="space-y-1.5 px-1 py-1">
            <button
              type="button"
              onClick={handleGithubLogin}
              disabled={isSigningIn}
              className="pixel-shadow-sm btn-press flex h-8 w-full items-center justify-center gap-2 border-2 border-[var(--border-light)] bg-[var(--bg-raised)] font-mono text-[11px] uppercase tracking-[0.05em] text-[var(--cream)] transition-colors hover:border-primary disabled:opacity-60"
            >
              {isSigningIn ? <Loader2 className="size-3.5 animate-spin" /> : <HugeIcon icon={GithubIcon} className="size-3.5" />}
              {isSigningIn ? "Waiting for GitHub…" : "Connect GitHub"}
            </button>
            <p className="px-1 text-[11px] leading-4 text-[var(--muted)]">Lists your repositories and lets you build private ones.</p>
          </div>
        )}
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
