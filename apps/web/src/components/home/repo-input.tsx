"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"

const QUICK_PICKS = [
  { name: "zustand", url: "https://github.com/pmndrs/zustand" },
  { name: "tRPC", url: "https://github.com/trpc/trpc" },
  { name: "excalidraw", url: "https://github.com/excalidraw/excalidraw" },
  { name: "create-t3-app", url: "https://github.com/t3-oss/create-t3-app" },
]

export function RepoInput() {
  const [url, setUrl] = useState("")
  const router = useRouter()
  const { data: session } = useSession()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!url.trim()) return

    if (!session) {
      router.push("/login")
      return
    }

    router.push(`/dashboard?analyze=${encodeURIComponent(url)}`)
  }

  return (
    <section className="border-t border-border py-16">
      <div className="mx-auto max-w-2xl px-6 text-center">
        <h2 className="text-2xl font-semibold">Try it now</h2>
        <form onSubmit={handleSubmit} className="mt-6 flex gap-3">
          <input
            type="url"
            placeholder="https://github.com/owner/repo"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="flex-1 rounded-lg border border-input bg-background px-4 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            type="submit"
            className="rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Analyze
          </button>
        </form>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          <span className="text-xs text-muted-foreground">Quick picks:</span>
          {QUICK_PICKS.map((pick) => (
            <button
              key={pick.name}
              onClick={() => setUrl(pick.url)}
              className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              {pick.name}
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}
