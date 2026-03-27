"use client"

import * as React from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import {
  FolderGit2,
  Compass,
  Building2,
  Plus,
} from "lucide-react"
import { Button } from "@codecity/ui/components/button"
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
  ...props
}: React.ComponentProps<typeof Sidebar> & { onNewCity?: () => void }) {
  const searchParams = useSearchParams()
  const isExplore = searchParams.get("tab") === "explore"

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
            <SidebarMenuButton size="lg" asChild>
              <Link href="/dashboard">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-[10px] font-bold text-white">
                  CC
                </div>
                <div className="flex flex-col gap-0.5 leading-none">
                  <span className="font-semibold">CodeCity</span>
                  <span className="text-xs text-muted-foreground">
                    Dashboard
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={!isExplore}>
                <Link href="/dashboard">
                  <FolderGit2 className="size-4" />
                  My Projects
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={isExplore}>
                <Link href="/dashboard?tab=explore">
                  <Compass className="size-4" />
                  Explore
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>My Cities</SidebarGroupLabel>
          <div className="px-3 py-2">
            <p className="text-xs text-muted-foreground">
              {projects.length} project{projects.length !== 1 ? "s" : ""} analyzed
            </p>
          </div>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <div className="p-2">
          <Button
            onClick={onNewCity}
            size="sm"
            className="w-full gap-1.5 text-sm font-medium rounded-lg bg-primary hover:bg-primary/90 text-white"
          >
            <Plus className="h-3.5 w-3.5" />
            New City
          </Button>
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
