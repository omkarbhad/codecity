"use client"

import * as React from "react"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import { open } from "@tauri-apps/plugin-shell"
import {
  FolderGit2,
  Compass,
  User,
  Plus,
  Globe,
  Lock,
  LogOut,
  Github,
  Loader2,
} from "lucide-react"
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
  getProjects,
  githubGetUser,
  githubLoginPoll,
  githubLoginStart,
  logoutGithub,
  setGithubSession,
} from "@/lib/tauri"
import { LogoIcon } from "@/components/logo"
import { UpdateButton } from "@/components/dashboard/update-button"

interface Project {
  id: string
  name: string
  status: "COMPLETED" | "PROCESSING" | "FAILED"
  visibility: "PUBLIC" | "PRIVATE"
}

export function AppSidebar({
  onNewCity,
  user,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  onNewCity?: () => void
  user?: { name: string | null; image: string | null; email?: string } | null
}) {
  const pathname = usePathname()
  const router = useRouter()
  const queryClient = useQueryClient()
  const [isSigningIn, setIsSigningIn] = React.useState(false)
  const [authCode, setAuthCode] = React.useState<string | null>(null)
  const [authError, setAuthError] = React.useState<string | null>(null)

  async function handleLogout() {
    await logoutGithub()
    await queryClient.invalidateQueries({ queryKey: ["me"] })
    router.push("/dashboard")
  }

  async function handleGithubLogin() {
    setIsSigningIn(true)
    setAuthError(null)

    try {
      const device = await githubLoginStart()
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
  const isExplore = pathname.startsWith("/explore")
  const isDashboard = pathname.startsWith("/dashboard")

  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["projects"],
    queryFn: async () => {
      const records = await getProjects()
      return records.map((r) => ({
        id: r.id,
        name: r.name,
        status: r.status as "COMPLETED" | "PROCESSING" | "FAILED",
        visibility: r.visibility as "PUBLIC" | "PRIVATE",
      }))
    },
  })

  const completedProjects = projects.filter((p) => p.status === "COMPLETED").slice(0, 6)
  const activeCount = projects.filter((p) => p.status === "PROCESSING").length

  return (
    <Sidebar {...props}>
      {/* Header */}
      <SidebarHeader className="border-b border-white/[0.07] bg-[#0b0b0c]">
        <div className="flex items-center justify-between px-2 py-2.5">
          <Link href="/" className="flex items-center gap-2 min-w-0">
            <div className="flex size-6 shrink-0 items-center justify-center rounded-md border border-white/[0.08] bg-white/[0.04] text-primary">
              <LogoIcon className="size-4" />
            </div>
            <span className="text-[13px] font-semibold text-zinc-100 tracking-tight truncate">CodeCity</span>
          </Link>
          {onNewCity && (
            <IconButton
              onClick={onNewCity}
              title="New City"
            >
              <Plus />
            </IconButton>
          )}
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
                  <FolderGit2 className="size-3.5" />
                  My Cities
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={isExplore}
                className="h-8 rounded-md text-xs font-medium text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.04] data-[active=true]:text-zinc-100 data-[active=true]:bg-white/[0.07] transition-colors"
              >
                <Link href="/explore">
                  <Compass className="size-3.5" />
                  Explore
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
            <span className="text-[11px] font-medium text-zinc-500">Recent</span>
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
                      {project.visibility === "PUBLIC" ? (
                        <Globe className="size-3 shrink-0 text-zinc-700 group-hover:text-zinc-500" />
                      ) : (
                        <Lock className="size-3 shrink-0 text-zinc-700 group-hover:text-zinc-500" />
                      )}
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
      </SidebarContent>

      {/* Footer */}
      <SidebarFooter className="border-t border-white/[0.07] bg-[#0b0b0c] p-2">
        <UpdateButton />
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
          {user?.image ? (
            <img src={user.image} alt={user.name ?? "User avatar"} className="h-6 w-6 rounded-full ring-1 ring-white/[0.08] shrink-0" />
          ) : (
            <div className="h-6 w-6 rounded-full bg-white/[0.06] border border-white/[0.08] flex items-center justify-center shrink-0">
              <User className="h-3 w-3 text-zinc-600" />
            </div>
          )}
          <div className="flex flex-col min-w-0 flex-1 gap-0">
            <span className="text-[11px] font-medium text-zinc-400 truncate">
              {user?.name ?? (user?.email ? user.email.split("@")[0] : "—")}
            </span>
            <span className="text-[9px] font-mono text-zinc-700 truncate">
              {user?.name ? "GitHub connected" : "GitHub not connected"}
            </span>
          </div>
          {user?.name ? (
            <IconButton
              onClick={handleLogout}
              title="Sign out"
              className="size-6 border-transparent bg-transparent text-zinc-700 hover:border-white/[0.08]"
            >
              <LogOut />
            </IconButton>
          ) : (
            <IconButton
              onClick={handleGithubLogin}
              disabled={isSigningIn}
              title="Connect GitHub"
              className="size-6 border-transparent bg-transparent text-zinc-600 hover:border-white/[0.08]"
            >
              {isSigningIn ? <Loader2 className="animate-spin" /> : <Github />}
            </IconButton>
          )}
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
