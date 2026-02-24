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
    <div className="animate-fade-up">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-mono text-xs tracking-[0.2em] uppercase text-primary/50">Control Panel</p>
          <h1 className="mt-1 text-2xl font-bold text-foreground">Dashboard</h1>
        </div>
      </div>

      <div className="mt-8 flex gap-0 border-b border-border/30">
        <a
          href="/dashboard?tab=projects"
          className={`relative px-4 py-2.5 font-mono text-xs tracking-wider uppercase transition-colors ${
            activeTab === "projects"
              ? "text-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          My Projects
          {activeTab === "projects" && (
            <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary glow-cyan" />
          )}
        </a>
        <a
          href="/dashboard?tab=explore"
          className={`relative px-4 py-2.5 font-mono text-xs tracking-wider uppercase transition-colors ${
            activeTab === "explore"
              ? "text-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Explore
          {activeTab === "explore" && (
            <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary glow-cyan" />
          )}
        </a>
      </div>

      <div className="mt-6">
        {activeTab === "explore" ? <ExploreTab /> : <MyProjectsTab />}
      </div>
    </div>
  )
}
