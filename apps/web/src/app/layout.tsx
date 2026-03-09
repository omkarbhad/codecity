import type { Metadata } from "next"
import { Sora, IBM_Plex_Mono } from "next/font/google"
import "@codecity/ui/styles/globals.css"
import { Providers } from "./providers"

const sora = Sora({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-sora",
  display: "swap",
})

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-ibm-plex-mono",
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
    <html lang="en" className={`dark ${sora.variable} ${ibmPlexMono.variable}`}>
      <body className="min-h-screen antialiased bg-aurora noise-overlay relative">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
