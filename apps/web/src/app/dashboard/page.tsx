import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { ExploreTab } from "@/components/dashboard/explore-tab"
import { MyProjectsTab } from "@/components/dashboard/my-projects-tab"

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const params = await searchParams
  const activeTab = params.tab ?? "projects"

  return (
    <div>
      <h1 className="text-3xl font-bold">Dashboard</h1>

      <div className="mt-6 flex gap-1 border-b border-border">
        <a
          href="/dashboard?tab=projects"
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "projects"
              ? "border-b-2 border-primary text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          My Projects
        </a>
        <a
          href="/dashboard?tab=explore"
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "explore"
              ? "border-b-2 border-primary text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Explore
        </a>
      </div>

      <div className="mt-6">
        {activeTab === "explore" ? <ExploreTab /> : <MyProjectsTab />}
      </div>
    </div>
  )
}
