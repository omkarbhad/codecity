"use client"

import { Suspense, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { AppSidebar } from "@/components/dashboard/app-sidebar"
import { MyProjectsTab } from "@/components/dashboard/my-projects-tab"
import { NewAnalysisDialog } from "@/components/dashboard/new-analysis-dialog"
import {
  SidebarInset,
} from "@codecity/ui/components/sidebar"

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
        {/* Page title (navigation lives in the sidebar); drags the window */}
        <header data-tauri-drag-region className="flex shrink-0 items-center px-5 pt-5">
          <h1 className="text-[20px] font-medium tracking-[-0.015em] text-(--cream)">My cities</h1>
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
