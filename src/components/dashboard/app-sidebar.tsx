"use client"

import * as React from "react"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import { open } from "@tauri-apps/plugin-shell"
import { Building2Icon, ClockIcon, GithubIcon, LoaderCircleIcon, LogOutIcon, StarIcon, UserIcon } from "@/components/ui/icons"
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
  SidebarTrigger,
  useSidebar,
} from "@codecity/ui/components/sidebar"
import { IconButton } from "@codecity/ui/components/icon-button"
import {
  enqueueAnalysis,
  githubGetUser,
  githubImportCliSession,
  githubLoginPoll,
  githubLoginStart,
  isTauri,
  listTrendingGithubRepos,
  logoutGithub,
} from "@/lib/tauri"
import { UpdateButton } from "@/components/dashboard/update-button"
import { AppIcon } from "@/components/ui/app-icon"
import { LogoMark } from "@/components/logo"
import { SidebarFrameNav, ThemeToggle, TRAFFIC_LIGHTS_HEIGHT, useReserveTrafficLights } from "@/components/window-frame"

export function AppSidebar({
  user,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  user?: { name: string | null; image: string | null; email?: string } | null
}) {
  const pathname = usePathname()
  const router = useRouter()
  const queryClient = useQueryClient()
  const reserveLights = useReserveTrafficLights()
  const { state, isMobile } = useSidebar()
  const collapsed = state === "collapsed" && !isMobile
  const [isSigningIn, setIsSigningIn] = React.useState(false)
  const [authCode, setAuthCode] = React.useState<string | null>(null)
  const [authError, setAuthError] = React.useState<string | null>(null)

  const { data: githubUser = null } = useQuery({
    queryKey: ["me"],
    enabled: isTauri(),
    queryFn: async () => {
      const profile = await githubGetUser()
      if (!profile) return null
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
    queryClient.removeQueries({ queryKey: ["github-repos"] })
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
        await queryClient.invalidateQueries({ queryKey: ["github-repos"] })
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

        if (token.connected) {
          await queryClient.invalidateQueries({ queryKey: ["me"] })
          await queryClient.invalidateQueries({ queryKey: ["github-repos"] })
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

  // Collapsed: the same rail as the project page — room for the macOS window
  // buttons, the two pages in a card-style block, and GitHub at the bottom.
  if (collapsed) {
    const railButton = (active: boolean) =>
      `flex size-10 items-center justify-center rounded-[10px] transition-[color,background-color,transform] duration-150 active:scale-[0.97] ${
        active ? "bg-[var(--bg-raised)] text-[var(--cream)]" : "text-[var(--muted)] hover:bg-[var(--bg-raised)] hover:text-[var(--cream)]"
      }`
    const group = "flex flex-col items-center gap-1 rounded-[14px] border border-[var(--border-pixel)] bg-[var(--bg)] p-1"
    return (
      <Sidebar variant="inset" collapsible="icon" {...props}>
        <div data-tauri-drag-region className="flex h-full flex-col items-center" style={{ paddingTop: reserveLights ? TRAFFIC_LIGHTS_HEIGHT + 6 : 4 }}>
          <nav aria-label="Pages" className={group}>
            <SidebarTrigger className={railButton(false)} title="Show sidebar" />
            <span className="h-px w-6 bg-[var(--border-pixel)]" aria-hidden="true" />
            <Link href="/dashboard" title="My cities" aria-label="My cities" aria-current={isDashboard ? "page" : undefined} className={railButton(isDashboard)}>
              <AppIcon icon={Building2Icon} className="size-[18px]" />
            </Link>
            <Link href="/repos" title="GitHub repos" aria-label="GitHub repos" aria-current={isRepos ? "page" : undefined} className={railButton(isRepos)}>
              <AppIcon icon={GithubIcon} className="size-[18px]" />
            </Link>
          </nav>
          <div data-tauri-drag-region className="flex-1" />
          <div className={group}>
            <div className="flex size-10 items-center justify-center"><ThemeToggle /></div>
            {activeUser?.name ? (
              <button type="button" onClick={handleLogout} title={`${activeUser.name} — sign out of GitHub`} aria-label="Sign out of GitHub" className={railButton(false)}>
                {activeUser.image ? <img src={activeUser.image} alt="" className="size-6 rounded-full" /> : <AppIcon icon={UserIcon} className="size-[18px]" />}
              </button>
            ) : (
              <button type="button" onClick={handleGithubLogin} disabled={isSigningIn} title="Connect GitHub" aria-label="Connect GitHub" className={railButton(false)}>
                <AppIcon icon={isSigningIn ? LoaderCircleIcon : GithubIcon} className={`size-[18px] ${isSigningIn ? "animate-spin" : ""}`} />
              </button>
            )}
          </div>
        </div>
        <SidebarRail />
      </Sidebar>
    )
  }

  return (
    <Sidebar variant="inset" collapsible="icon" {...props}>
      {/* Header */}
      {/* Runs to the top of the window; on macOS the window buttons sit over its first row. */}
      <SidebarHeader className="p-0">
        {/* Window-button row: sidebar toggle, back and forward beside the macOS buttons */}
        <div data-tauri-drag-region className="-mt-1.5 flex h-[38px] items-center justify-end" style={{ paddingLeft: reserveLights ? 72 : 0 }}>
          <SidebarFrameNav />
        </div>
        <div className="flex items-center justify-between gap-1 px-2.5 pb-2 pt-1">
          <Link href="/" className="flex min-w-0 flex-1 items-center gap-2">
            <LogoMark className="size-5" />
            <span className="truncate text-[15px] font-medium tracking-[-0.01em] text-[var(--cream)]">CodeCity</span>
          </Link>
          <ThemeToggle />
          <UpdateButton />
        </div>
      </SidebarHeader>

      <SidebarContent className="gap-0 pt-1">
        {/* Nav */}
        <SidebarGroup className="px-2 pb-2">
          <SidebarMenu className="gap-0.5">
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={isDashboard}
                className="h-[34px] gap-2.5 rounded-[6px] px-2.5 text-[14px] font-medium text-[var(--cream-dark)] transition-[color,background-color,transform] duration-150 hover:bg-[var(--bg-raised)] hover:text-[var(--cream)] active:scale-[0.985] data-[active=true]:bg-[var(--bg-raised)] data-[active=true]:text-[var(--cream)] [&_svg]:text-[var(--muted)] data-[active=true]:[&_svg]:text-[var(--cream)]"
              >
                <Link href="/dashboard">
                  <AppIcon icon={Building2Icon} className="size-[18px]" />
                  My cities
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={isRepos}
                className="h-[34px] gap-2.5 rounded-[6px] px-2.5 text-[14px] font-medium text-[var(--cream-dark)] transition-[color,background-color,transform] duration-150 hover:bg-[var(--bg-raised)] hover:text-[var(--cream)] active:scale-[0.985] data-[active=true]:bg-[var(--bg-raised)] data-[active=true]:text-[var(--cream)] [&_svg]:text-[var(--muted)] data-[active=true]:[&_svg]:text-[var(--cream)]"
              >
                <Link href="/repos">
                  <AppIcon icon={GithubIcon} className="size-[18px]" />
                  GitHub repos
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>

        {/* Divider */}
        <div className="mx-2.5 my-1.5 border-t border-[var(--bg-raised)]" />

        {/* Recent Cities */}
        <SidebarGroup className="px-2 pb-2">
          <div className="flex items-center justify-between px-1 mb-1.5">
            <span className="flex items-center gap-1.5 text-[12px] font-medium text-[var(--muted)]">
              <AppIcon icon={ClockIcon} className="size-3.5 text-[var(--muted)]" />
              Recent
            </span>
            {activeCount > 0 && (
              <span className="flex items-center gap-1 text-[11px] text-[var(--muted)]">
                <AppIcon icon={LoaderCircleIcon} className="size-3.5 animate-spin text-primary" />
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
                    className="group h-[30px] rounded-[6px] text-[13px] text-[var(--cream-dark)] transition-colors hover:bg-[var(--bg-raised)] hover:text-[var(--cream)]"
                  >
                    <Link href={`/project?id=${encodeURIComponent(project.id)}`}>
                      <AppIcon icon={Building2Icon} className="size-3.5 shrink-0 text-[var(--muted)] group-hover:text-[var(--cream)]" />
                      <span className="truncate">
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
                <p className="text-[11px] text-[var(--muted)]">No cities yet</p>
              </div>
            )}
          </SidebarMenu>
        </SidebarGroup>

        {trendingRepos.length > 0 && (
          <SidebarGroup className="px-2 pb-2">
            <div className="mb-1.5 flex items-center gap-1.5 px-1 text-[12px] font-medium text-[var(--muted)]">
              <AppIcon icon={StarIcon} className="size-3.5 text-[var(--sev-med)]" />
              Trending
            </div>
            <div className="space-y-0.5">
              {trendingRepos.map((repo) => {
                const [owner, name] = repo.full_name.split("/")
                const isQueueing = queueingTrendingId === repo.id

                return (
                  <button
                    key={repo.id}
                    type="button"
                    onClick={() => handleTrendingClick(repo)}
                    disabled={isQueueing}
                    aria-busy={isQueueing}
                    title={`Build a city from ${repo.full_name}`}
                    className="group flex h-[30px] w-full items-center gap-1.5 rounded-[6px] px-2 text-left text-[13px] text-[var(--cream-dark)] transition-colors hover:bg-[var(--bg-raised)] hover:text-[var(--cream)] disabled:opacity-60"
                  >
                    {isQueueing
                      ? <AppIcon icon={LoaderCircleIcon} className="size-3.5 shrink-0 animate-spin text-primary" />
                      : <AppIcon icon={GithubIcon} className="size-3.5 shrink-0 text-[var(--muted)] group-hover:text-primary" />}
                    <span className="min-w-0 truncate">
                      <span className="text-[var(--muted)]">{owner}/</span>
                      <span className="text-[var(--cream-dark)] group-hover:text-[var(--cream)]">{name}</span>
                    </span>
                  </button>
                )
              })}
            </div>
          </SidebarGroup>
        )}
      </SidebarContent>

      {/* Footer */}
      <SidebarFooter className="p-0 pt-2">
        {authCode && (
          <div className="mb-2 border border-[var(--border-light)] bg-[var(--bg-card)] px-2 py-2 rounded-[16px]">
            <p className="text-[12px] leading-4 text-[var(--cream-dark)]">Enter this code on the GitHub page that just opened:</p>
            <p className="mt-1 select-all text-[15px] font-semibold text-primary">{authCode}</p>
          </div>
        )}
        {authError && (
          <p className="mb-2 px-2 text-[11px] leading-4 text-[var(--sev-high)]">{authError}</p>
        )}
        {activeUser?.name ? (
          <div className="flex items-center gap-2 px-2 py-1.5">
            {activeUser.image ? (
              <img src={activeUser.image} alt="" className="size-6 shrink-0 border border-[var(--border-pixel)]" />
            ) : (
              <div className="flex size-6 shrink-0 items-center justify-center border border-[var(--border-pixel)] bg-[var(--bg-raised)] rounded-md">
                <AppIcon icon={UserIcon} className="size-3.5 text-[var(--muted)]" />
              </div>
            )}
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="truncate text-[12px] font-medium text-[var(--cream)]">{activeUser.name}</span>
              <span className="truncate text-[11px] text-[var(--muted)]">GitHub connected</span>
            </div>
            <IconButton
              onClick={handleLogout}
              title="Sign out of GitHub"
              aria-label="Sign out of GitHub"
              className="size-6 border-transparent bg-transparent text-[var(--muted)] hover:bg-[var(--bg-raised)] hover:text-[var(--cream)]"
            >
              <AppIcon icon={LogOutIcon} />
            </IconButton>
          </div>
        ) : (
          <div className="space-y-1.5 px-1 py-1">
            <button
              type="button"
              onClick={handleGithubLogin}
              disabled={isSigningIn}
              className="flex h-8 w-full items-center justify-center gap-2 text-[12px] text-[var(--cream)] transition-colors disabled:opacity-60 active:translate-y-px bg-(--bg-card) hover:bg-(--bg-raised) rounded-full"
            >
              {isSigningIn ? <AppIcon icon={LoaderCircleIcon} className="size-3.5 animate-spin" /> : <AppIcon icon={GithubIcon} className="size-3.5" />}
              {isSigningIn ? "Waiting for GitHub…" : "Connect GitHub"}
            </button>
            <p className="px-1 text-[12px] leading-4 text-[var(--muted)]">Lists your repositories and lets you build private ones.</p>
          </div>
        )}
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
