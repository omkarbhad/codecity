import type { Metadata } from "next"
import "@/ui/styles/globals.css"
import { Providers } from "./providers"

export const metadata: Metadata = {
  metadataBase: new URL("https://codecity.app"),
  title: {
    default: "CodeCity - Visual codebase maps for GitHub repositories",
    template: "%s | CodeCity",
  },
  description:
    "CodeCity turns GitHub repositories into navigable 3D maps so teams can inspect structure, file size, language districts, and architecture quickly.",
  applicationName: "CodeCity",
  authors: [{ name: "Omkar Bhad" }],
  creator: "Omkar Bhad",
  publisher: "CodeCity",
  keywords: [
    "code visualization",
    "GitHub repository visualization",
    "software architecture",
    "codebase map",
    "technical debt",
    "3D code city",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: "/",
    siteName: "CodeCity",
    title: "CodeCity - Visual codebase maps for GitHub repositories",
    description:
      "Turn a GitHub repository into a navigable 3D map of files, languages, and architecture.",
    images: [
      {
        url: "/demo.png",
        width: 1200,
        height: 750,
        alt: "CodeCity repository map preview",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    creator: "@omaborkar",
    title: "CodeCity - Visual codebase maps for GitHub repositories",
    description:
      "Turn a GitHub repository into a navigable 3D map of files, languages, and architecture.",
    images: ["/demo.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body suppressHydrationWarning className="min-h-screen bg-background text-foreground antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
