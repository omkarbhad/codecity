import { getSessionUser } from "@/lib/auth-helpers"
import { redirect } from "next/navigation"
import { Navbar } from "@/components/layout/navbar"
import { AdminSidebar } from "@/components/admin/admin-sidebar"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getSessionUser()
  if (!user) redirect("/login")
  if (user.role !== "ADMIN") redirect("/dashboard")

  return (
    <>
      <Navbar />
      <div className="page-shell flex min-h-[calc(100vh-3.75rem)]">
        <AdminSidebar />
        <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>
      </div>
    </>
  )
}
