"use client"

import { useEffect, use } from "react"
import { useRouter } from "next/navigation"

/**
 * Legacy analyze page — now that analysis is synchronous,
 * this page just redirects to the project view.
 */
export default function AnalyzePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()

  useEffect(() => {
    // Analysis is now synchronous — redirect to project view
    router.replace(`/project/${id}`)
  }, [id, router])

  return (
    <div className="flex min-h-screen items-center justify-center px-4 font-mono bg-[#07070c]">
      <div className="pointer-events-none fixed inset-0 bg-grid opacity-30" />
      <div className="relative w-full max-w-lg">
        <div className="rounded-xl border border-white/[0.06] bg-[rgba(10,10,16,0.7)] p-8 backdrop-blur-xl text-center">
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-[10px] bg-primary text-sm font-bold text-white shadow-[0_0_30px_rgba(255,64,64,0.35)]">
            CC
          </div>
          <h1 className="mt-4 text-lg font-semibold tracking-tight text-foreground">
            Redirecting...
          </h1>
          <p className="mt-1 text-xs text-muted-foreground/70">
            Loading your city visualization
          </p>
        </div>
      </div>
    </div>
  )
}
