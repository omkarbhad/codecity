import { SidebarProvider } from "@codecity/ui/components/sidebar"

export default function DashboardLayout({
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
