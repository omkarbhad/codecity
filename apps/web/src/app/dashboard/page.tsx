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
          const username = data.name?.toLowerCase().replace(/\s+/g, "-") ?? "user"
          router.replace(`/dashboard/${username}`)
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
