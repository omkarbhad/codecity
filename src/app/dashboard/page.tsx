"use client"

import { Suspense, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { AppSidebar } from "@/components/dashboard/app-sidebar"
import { MyProjectsTab } from "@/components/dashboard/my-projects-tab"
import { NewAnalysisDialog } from "@/components/dashboard/new-analysis-dialog"
import { FolderGitTwoIcon } from "@hugeicons/core-free-icons"
import { HugeIcon } from "@/components/ui/huge-icon"
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
  const searchParams = useSearchParams()
  const [showNewDialog, setShowNewDialog] = useState(false)
  const [initialCityInput, setInitialCityInput] = useState<string | undefined>()

  useEffect(() => {
    const input = searchParams.get("new")
    if (input) {
      setInitialCityInput(input)
      setShowNewDialog(true)
    }
  }, [searchParams])

  function openNewCity(input?: string) {
    setInitialCityInput(input)
    setShowNewDialog(true)
  }

  return (
    <>
      <AppSidebar />
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-12 shrink-0 items-center justify-between border-b border-white/[0.07] bg-[#0b0b0c] px-4">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1 text-zinc-500 hover:text-zinc-200" />
            <Separator orientation="vertical" className="mx-1 h-4 bg-white/[0.08]" />
            <span className="flex items-center gap-1.5 text-sm font-medium text-zinc-300">
              <HugeIcon icon={FolderGitTwoIcon} className="size-3.5 text-zinc-600" />
              My cities
            </span>
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-4 p-4 sm:p-5">
          <MyProjectsTab onCreateCity={() => openNewCity()} />
        </div>
      </SidebarInset>

      <NewAnalysisDialog
        open={showNewDialog}
        onOpenChange={(open) => {
          setShowNewDialog(open)
          if (!open) setInitialCityInput(undefined)
        }}
        initialInput={initialCityInput}
      />
    </>
  )
}
