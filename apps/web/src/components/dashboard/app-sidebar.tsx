"use client"

import * as React from "react"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import {
  FolderGit2,
  Compass,
  User,
  Plus,
  Building2,
  Globe,
  Lock,
  LogOut,
} from "lucide-react"
import { useQuery } from "@tanstack/react-query"
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

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" })
    router.push("/")
  }
  const isExplore = pathname.startsWith("/explore")
  const isDashboard = pathname.startsWith("/dashboard")

  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["projects"],
    queryFn: async () => {
      const res = await fetch("/api/projects")
      if (!res.ok) return []
      return res.json()
    },
  })

  const completedProjects = projects.filter((p) => p.status === "COMPLETED").slice(0, 6)
  const activeCount = projects.filter((p) => p.status === "PROCESSING").length

  return (
    <Sidebar {...props}>
      {/* Header */}
      <SidebarHeader className="border-b border-white/[0.05]">
        <div className="flex items-center justify-between px-2 py-2.5">
          <Link href="/" className="flex items-center gap-2 min-w-0">
            <img
              src="/logo.png"
              alt="CodeCity"
              className="size-6 rounded-md object-cover shrink-0"
              onError={(e) => {
                const t = e.currentTarget
                t.style.display = "none"
                const fallback = t.nextElementSibling as HTMLElement | null
                if (fallback) fallback.style.display = "flex"
              }}
            />
            <div className="hidden items-center justify-center size-6 rounded-md bg-primary/15 border border-primary/25 shrink-0">
              <Building2 className="size-3 text-primary" />
            </div>
            <span className="text-[13px] font-semibold text-zinc-100 tracking-tight truncate">CodeCity</span>
          </Link>
          {onNewCity && (
            <button
              onClick={onNewCity}
              className="flex items-center justify-center size-6 rounded-md border border-white/[0.08] bg-white/[0.03] text-zinc-500 hover:border-primary/40 hover:text-primary hover:bg-primary/10 transition-all duration-200 shrink-0"
              title="New City"
            >
              <Plus className="size-3" />
            </button>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="gap-0 pt-2">
        {/* Nav */}
        <SidebarGroup className="px-2 pb-2">
          <SidebarMenu className="gap-0.5">
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={isDashboard}
                className="h-8 rounded-lg text-[12px] font-medium text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.04] data-[active=true]:text-zinc-100 data-[active=true]:bg-white/[0.06] transition-all duration-150"
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
                className="h-8 rounded-lg text-[12px] font-medium text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.04] data-[active=true]:text-zinc-100 data-[active=true]:bg-white/[0.06] transition-all duration-150"
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
        <div className="mx-3 border-t border-white/[0.05] mb-2" />

        {/* Recent Cities */}
        <SidebarGroup className="px-2 pb-2">
          <div className="flex items-center justify-between px-1 mb-1.5">
            <span className="text-[10px] font-medium uppercase tracking-widest text-zinc-700">Recent</span>
            {activeCount > 0 && (
              <span className="flex items-center gap-1 text-[9px] font-mono text-primary/70">
                <span className="inline-block size-1.5 rounded-full bg-primary animate-pulse" />
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
                    className="h-7 rounded-md text-[11px] text-zinc-600 hover:text-zinc-300 hover:bg-white/[0.03] transition-all duration-150 group"
                  >
                    <Link href={`/project/${project.id}`}>
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
      <SidebarFooter className="border-t border-white/[0.05] p-2">
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
              {user?.email ?? "free plan"}
            </span>
          </div>
          <button
            onClick={handleLogout}
            title="Sign out"
            className="flex items-center justify-center h-6 w-6 rounded-md text-zinc-700 hover:text-zinc-300 hover:bg-white/[0.05] transition-all shrink-0"
          >
            <LogOut className="h-3 w-3" />
          </button>
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
