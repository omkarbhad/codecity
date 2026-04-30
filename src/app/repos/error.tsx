"use client"

import { useEffect } from "react"

export default function ReposError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error) }, [error])
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-background">
      <div className="flex max-w-sm flex-col items-center gap-4 text-center">
        <h2 className="text-lg font-semibold text-zinc-50">Something went wrong</h2>
        <p className="text-sm text-zinc-400">{error.message || "Failed to load GitHub repos."}</p>
        <button onClick={reset} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90">Try Again</button>
      </div>
    </div>
  )
}
