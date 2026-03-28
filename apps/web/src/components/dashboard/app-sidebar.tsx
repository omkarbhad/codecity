"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  FolderGit2,
  Compass,
  User,
  Plus,
  Building2,
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
  SidebarGroupLabel,
  SidebarRail,
} from "@codecity/ui/components/sidebar"

export function AppSidebar({
  onNewCity,
  user,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  onNewCity?: () => void
  user?: { name: string | null; image: string | null } | null
}) {
  const pathname = usePathname()
  const isExplore = pathname.startsWith("/explore")
  const isDashboard = pathname.startsWith("/dashboard")

  const { data: projects = [] } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const res = await fetch("/api/projects")
      if (!res.ok) return []
      return res.json()
    },
  })

  return (
    <Sidebar {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex items-center justify-between">
              <SidebarMenuButton size="lg" asChild>
                <Link href="/">
                  <img
                    src="/logo.png"
                    alt="CodeCity"
                    className="size-8 rounded-lg"
                  />
                  <div className="flex flex-col gap-0.5 leading-none">
                    <span className="font-semibold">CodeCity</span>
                    <span className="text-xs text-muted-foreground">
                      Visualize Code
                    </span>
                  </div>
                </Link>
              </SidebarMenuButton>
              {onNewCity && (
                <button
                  onClick={onNewCity}
                  className="flex items-center justify-center size-7 rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                  title="New City"
                >
                  <Plus className="size-4" />
                </button>
              )}
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={isDashboard}>
                <Link href="/dashboard">
                  <FolderGit2 className="size-4" />
                  My Projects
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={isExplore}>
                <Link href="/explore">
                  <Compass className="size-4" />
                  Explore
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>My Cities</SidebarGroupLabel>
          <SidebarMenu>
            {projects.slice(0, 5).map((project: { id: string; name: string; status: string; visibility: string }) => (
              <SidebarMenuItem key={project.id}>
                <SidebarMenuButton asChild>
                  <Link href={`/project/${project.id}`}>
                    <Building2 className="size-4" />
                    <span className="truncate">{project.name}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
            {projects.length === 0 && (
              <div className="px-3 py-2">
                <p className="text-xs text-muted-foreground">No projects yet</p>
              </div>
            )}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <div className="p-2">
          <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-sidebar-accent transition-colors">
            {user?.image ? (
              <img src={user.image} alt="" className="h-7 w-7 rounded-full ring-1 ring-white/[0.08]" />
            ) : (
              <div className="h-7 w-7 rounded-full bg-white/[0.06] border border-white/[0.08] flex items-center justify-center">
                <User className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
            )}
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-medium truncate">{user?.name ?? "Dev User"}</span>
              <span className="text-[10px] text-muted-foreground truncate">Free Plan</span>
            </div>
          </div>
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
