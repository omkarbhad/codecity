"use client"

import { Suspense, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { getProject } from "@/lib/tauri"
import { PageLoader } from "@/components/ui/loader"

export default function AnalyzePage() {
  return (
    <Suspense fallback={<PageLoader text="Preparing city..." />}>
      <AnalyzeContent />
    </Suspense>
  )
}

function AnalyzeContent() {
  const searchParams = useSearchParams()
  const id = searchParams.get("id") ?? ""
  const router = useRouter()
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        if (!id) {
          setFailed(true)
          clearInterval(interval)
          return
        }
        const project = await getProject(id)
        if (!project) {
          setFailed(true)
          clearInterval(interval)
          return
        }
        if (project.status === "COMPLETED") {
          clearInterval(interval)
          router.replace(`/project?id=${encodeURIComponent(id)}`)
          return
        }
        if (project.status === "FAILED") {
          setFailed(true)
          clearInterval(interval)
        }
      } catch {
        // Keep polling
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [id, router])

  useEffect(() => {
    if (failed) router.replace("/dashboard")
  }, [failed, router])

  return <PageLoader text="Preparing city..." />
}
