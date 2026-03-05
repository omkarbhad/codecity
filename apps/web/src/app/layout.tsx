import type { Metadata } from "next"
import "@codecity/ui/styles/globals.css"
import { Providers } from "./providers"

export const metadata: Metadata = {
  title: "CodeCity — Visualize Your Codebase",
  description: "Transform any TypeScript repo into an interactive 3D city",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&family=IBM+Plex+Mono:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen antialiased bg-aurora noise-overlay relative">
        <Providers skipAuth={process.env.SKIP_AUTH === "true"}>{children}</Providers>
      </body>
    </html>
  )
}
