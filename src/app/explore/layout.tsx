import { SidebarProvider } from "@codecity/ui/components/sidebar"

export default function ExploreLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SidebarProvider className="min-h-svh">
      {children}
    </SidebarProvider>
  )
}
