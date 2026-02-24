import Link from "next/link"

export function Footer() {
  return (
    <footer className="border-t border-border py-8">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6">
        <p className="text-sm text-muted-foreground">CodeCity</p>
        <div className="flex gap-6">
          <Link
            href="/dashboard?tab=explore"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Explore
          </Link>
        </div>
      </div>
    </footer>
  )
}
