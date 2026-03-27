import { Navbar } from "@/components/layout/navbar"

export default function ProjectLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="h-screen w-screen overflow-hidden bg-background">
      <Navbar compact />
      {children}
    </div>
  )
}
