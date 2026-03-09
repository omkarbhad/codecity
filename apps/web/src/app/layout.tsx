import type { Metadata } from "next"
import { Inter, IBM_Plex_Mono } from "next/font/google"
import "@codecity/ui/styles/globals.css"
import { Providers } from "./providers"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
})

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-mono",
  display: "swap",
})

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
    <html lang="en" className={`dark ${inter.variable} ${ibmPlexMono.variable}`}>
      <body className="min-h-screen antialiased bg-background text-foreground">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
