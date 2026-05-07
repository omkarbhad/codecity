"use client"

import { Suspense, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { getProject, type ProjectRecord } from "@/lib/tauri"
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
  const [project, setProject] = useState<ProjectRecord | null>(null)

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        if (!id) {
          setFailed(true)
          clearInterval(interval)
          return
        }
        const next = await getProject(id)
        if (!next) {
          setFailed(true)
          clearInterval(interval)
          return
        }
        setProject(next)
        if (next.status === "COMPLETED") {
          clearInterval(interval)
          router.replace(`/project?id=${encodeURIComponent(id)}`)
          return
        }
        if (next.status === "FAILED") {
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

  // Surface what the Rust pipeline is actually doing — progress_message
  // is filled in at every stage (clone, discover, parse, persist, layout,
  // save). Falls back to the generic text on the very first poll before
  // the project record exists.
  const message = project?.progress_message?.trim() || "Preparing city..."
  const percent = Math.round(project?.progress ?? 0)
  const text =
    project && project.progress > 0 ? `${message} · ${percent}%` : message

  return <PageLoader text={text} />
}
