import type { Metadata } from "next"
import { DM_Mono, Instrument_Sans } from "next/font/google"
import "@codecity/ui/styles/globals.css"
import { Providers } from "./providers"

// Same type as Ghostly: Instrument Sans for the interface, DM Mono for code.
const instrumentSans = Instrument_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-ui",
  display: "swap",
})

const dmMono = DM_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
  display: "swap",
})

export const metadata: Metadata = {
  title: "CodeCity",
  description: "Analyze local code folders as an interactive 3D city",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning className={`dark ${instrumentSans.variable} ${dmMono.variable}`}>
      <head>
        {/* Apply the saved colour scheme before first paint (no dark→light flash). */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var a=(JSON.parse(localStorage.getItem("codecity-settings")||"{}").state||{}).appearance||"system";var l=a==="light"||(a==="system"&&matchMedia("(prefers-color-scheme: light)").matches);var r=document.documentElement;r.dataset.theme=l?"light":"dark";r.classList.toggle("dark",!l)}catch(e){}`,
          }}
        />
      </head>
      <body suppressHydrationWarning className="min-h-screen antialiased bg-background text-foreground">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
