import { Navbar } from "@/components/layout/navbar"

export default function ExploreLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <Navbar />
      <div className="page-shell">{children}</div>
    </>
  )
}
