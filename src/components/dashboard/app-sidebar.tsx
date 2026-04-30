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
  getProjects,
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

interface Project {
  id: string
  name: string
  status: "COMPLETED" | "PROCESSING" | "FAILED"
}

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
    queryFn: async () => {
      const records = await getProjects()
      return records.map((r) => ({
        id: r.id,
        name: r.name,
        status: r.status as "COMPLETED" | "PROCESSING" | "FAILED",
      }))
    },
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
      <SidebarHeader className="border-b border-white/[0.07] bg-[#0b0b0c]">
        <div className="flex items-center justify-between px-2 py-2.5">
          <Link href="/" className="flex items-center gap-2 min-w-0">
            <img src="/logo.png" alt="CodeCity" className="size-6 shrink-0 rounded-sm" />
            <span className="text-[13px] font-semibold text-zinc-100 tracking-tight truncate">CodeCity</span>
          </Link>
          <UpdateButton />
        </div>
      </SidebarHeader>

      <SidebarContent className="gap-0 bg-[#0b0b0c] pt-2">
        {/* Nav */}
        <SidebarGroup className="px-2 pb-2">
          <SidebarMenu className="gap-0.5">
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={isDashboard}
                className="h-8 rounded-md text-xs font-medium text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.04] data-[active=true]:text-zinc-100 data-[active=true]:bg-white/[0.07] transition-colors"
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
                className="h-8 rounded-md text-xs font-medium text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.04] data-[active=true]:text-zinc-100 data-[active=true]:bg-white/[0.07] transition-colors"
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
        <div className="mx-3 border-t border-white/[0.07] mb-2" />

        {/* Recent Cities */}
        <SidebarGroup className="px-2 pb-2">
          <div className="flex items-center justify-between px-1 mb-1.5">
            <span className="flex items-center gap-1.5 text-[11px] font-medium text-zinc-500">
              <HugeIcon icon={Clock03Icon} className="size-3 text-zinc-600" />
              Recent
            </span>
            {activeCount > 0 && (
              <span className="flex items-center gap-1 text-[10px] text-zinc-500">
                <Loader2 className="size-3 animate-spin text-primary" />
                {activeCount} running
              </span>
            )}
          </div>
          <SidebarMenu className="gap-0.5">
            {completedProjects.map((project) => {
              const parts = project.name.split("/")
              const repo = parts[1] ?? project.name
              const owner = parts[0]
              return (
                <SidebarMenuItem key={project.id}>
                  <SidebarMenuButton
                    asChild
                    className="h-7 rounded-md text-[11px] text-zinc-600 hover:text-zinc-300 hover:bg-white/[0.04] transition-colors group"
                  >
                    <Link href={`/project?id=${encodeURIComponent(project.id)}`}>
                      <HugeIcon icon={GitBranchIcon} className="size-3 shrink-0 text-zinc-700 group-hover:text-zinc-500" />
                      <span className="truncate font-mono">
                        <span className="text-zinc-700">{owner}/</span>
                        <span className="text-zinc-400 group-hover:text-zinc-200">{repo}</span>
                      </span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )
            })}
            {completedProjects.length === 0 && (
              <div className="px-2 py-3 text-center">
                <p className="text-[10px] font-mono text-zinc-700">no cities yet</p>
              </div>
            )}
          </SidebarMenu>
        </SidebarGroup>

        {trendingRepos.length > 0 && (
          <SidebarGroup className="px-2 pb-2">
            <div className="mb-1.5 flex items-center gap-1.5 px-1 text-[11px] font-medium text-zinc-500">
              <HugeIcon icon={StarIcon} className="size-3 text-amber-300/70" />
              Trending
            </div>
            <div className="space-y-0.5">
              {trendingRepos.map((repo) => {
                const [owner, name] = repo.full_name.split("/")
                const content = (
                  <>
                    <HugeIcon icon={GithubIcon} className="size-3 shrink-0 text-zinc-700 group-hover:text-zinc-500" />
                    <span className="min-w-0 truncate">
                      <span className="text-zinc-700">{owner}/</span>
                      <span className="text-zinc-500 group-hover:text-zinc-300">{name}</span>
                    </span>
                  </>
                )

                return (
                  <button
                    key={repo.id}
                    type="button"
                    onClick={() => handleTrendingClick(repo)}
                    disabled={queueingTrendingId === repo.id}
                    className="group flex h-7 w-full items-center gap-1.5 rounded px-1.5 text-left font-mono text-[11px] text-zinc-600 transition-colors hover:bg-white/[0.04] hover:text-zinc-300 disabled:opacity-60"
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
      <SidebarFooter className="border-t border-white/[0.07] bg-[#0b0b0c] p-2">
        {authCode && (
          <div className="mb-2 rounded-md border border-white/[0.08] bg-white/[0.03] px-2 py-2">
            <p className="text-[10px] text-zinc-600">GitHub code</p>
            <p className="mt-1 text-[13px] font-mono font-semibold tracking-[0.2em] text-zinc-200">{authCode}</p>
          </div>
        )}
        {authError && (
          <p className="mb-2 px-2 text-[10px] leading-4 text-primary/80">{authError}</p>
        )}
        <div className="flex items-center gap-2 px-2 py-1.5">
          {activeUser?.image ? (
            <img src={activeUser.image} alt={activeUser.name ?? "User avatar"} className="h-6 w-6 rounded-full ring-1 ring-white/[0.08] shrink-0" />
          ) : (
            <div className="h-6 w-6 rounded-full bg-white/[0.06] border border-white/[0.08] flex items-center justify-center shrink-0">
              <HugeIcon icon={UserIcon} className="h-3 w-3 text-zinc-600" />
            </div>
          )}
          <div className="flex flex-col min-w-0 flex-1 gap-0">
            <span className="text-[11px] font-medium text-zinc-400 truncate">
              {activeUser?.name ?? (user?.email ? user.email.split("@")[0] : "—")}
            </span>
            <span className="text-[9px] font-mono text-zinc-700 truncate">
              {activeUser?.name ? "GitHub connected" : "GitHub not connected"}
            </span>
          </div>
          {activeUser?.name ? (
            <IconButton
              onClick={handleLogout}
              title="Sign out"
              className="size-6 border-transparent bg-transparent text-zinc-700 hover:border-white/[0.08]"
            >
              <HugeIcon icon={Logout03Icon} />
            </IconButton>
          ) : (
            <IconButton
              onClick={handleGithubLogin}
              disabled={isSigningIn}
              title="Connect GitHub"
              className="size-6 border-transparent bg-transparent text-zinc-600 hover:border-white/[0.08]"
            >
              {isSigningIn ? <Loader2 className="animate-spin" /> : <HugeIcon icon={GithubIcon} />}
            </IconButton>
          )}
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
