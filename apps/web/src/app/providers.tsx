"use client"

import "@/lib/suppress-three-warnings"
import { SessionProvider } from "next-auth/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useState } from "react"

export function Providers({
  children,
  skipAuth = false,
}: {
  children: React.ReactNode
  skipAuth?: boolean
}) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 5 * 60 * 1000 },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      {skipAuth ? children : <SessionProvider>{children}</SessionProvider>}
    </QueryClientProvider>
  )
}
