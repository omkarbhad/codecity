"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { PageLoader } from "@/components/ui/loader"

export default function DashboardRedirect() {
  const router = useRouter()

  useEffect(() => {
    async function resolveUser() {
      try {
        const res = await fetch("/api/me")
        if (res.ok) {
          const data = await res.json()
          const slug = data.githubUsername
            ?? data.name?.toLowerCase().replace(/\s+/g, "-")
            ?? "user"
          router.replace(`/dashboard/${slug}`)
        } else if (res.status === 401) {
          const redirect = encodeURIComponent(window.location.href)
          const authUrl = process.env.NEXT_PUBLIC_AUTH_URL ?? "https://auth.magnova.ai/codecity"
          window.location.href = `${authUrl}?redirect=${redirect}`
        } else {
          router.replace("/dashboard/user")
        }
      } catch {
        router.replace("/dashboard/user")
      }
    }
    resolveUser()
  }, [router])

  return <PageLoader text="Loading dashboard..." />
}
