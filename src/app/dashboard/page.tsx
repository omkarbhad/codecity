"use client"

import { Suspense, useState } from "react"
import { AppSidebar } from "@/components/dashboard/app-sidebar"
import { MyProjectsTab } from "@/components/dashboard/my-projects-tab"
import { NewAnalysisDialog } from "@/components/dashboard/new-analysis-dialog"
import { FolderGit2, Plus } from "lucide-react"
import { Button } from "@codecity/ui/components/button"
import {
  SidebarInset,
  SidebarTrigger,
} from "@codecity/ui/components/sidebar"
import { Separator } from "@codecity/ui/components/separator"

export default function DashboardPage() {
  return (
    <Suspense fallback={null}>
      <DashboardContent />
    </Suspense>
  )
}

function DashboardContent() {
  const [showNewDialog, setShowNewDialog] = useState(false)

  return (
    <>
      <AppSidebar onNewCity={() => setShowNewDialog(true)} />
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-12 shrink-0 items-center justify-between border-b border-white/[0.07] bg-[#0b0b0c] px-4">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1 text-zinc-500 hover:text-zinc-200" />
            <Separator orientation="vertical" className="mx-1 h-4 bg-white/[0.08]" />
            <span className="flex items-center gap-1.5 text-xs font-medium text-zinc-400">
              <FolderGit2 className="size-3.5 text-zinc-600" />
              My cities
            </span>
          </div>
          <Button
            size="sm"
            onClick={() => setShowNewDialog(true)}
            className="h-8 gap-1.5 rounded-md bg-primary px-3 text-xs font-medium text-white hover:bg-primary/90"
          >
            <Plus className="size-3.5" />
            New City
          </Button>
        </header>

        <div className="flex flex-1 flex-col gap-4 p-4 sm:p-5">
          <MyProjectsTab onCreateCity={() => setShowNewDialog(true)} />
        </div>
      </SidebarInset>

      <NewAnalysisDialog open={showNewDialog} onOpenChange={setShowNewDialog} />
    </>
  )
}
