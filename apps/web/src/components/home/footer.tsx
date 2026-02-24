import Link from "next/link"

export function Footer() {
  return (
    <footer className="border-t border-border/30 py-8">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6">
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-1.5 rounded-full bg-primary/40" />
          <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-muted-foreground/50">
            CodeCity v2.0
          </span>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard?tab=explore"
            className="font-mono text-[10px] tracking-wider uppercase text-muted-foreground/40 hover:text-primary transition-colors"
          >
            Explore
          </Link>
          <span className="text-border">·</span>
          <Link
            href="https://github.com"
            className="font-mono text-[10px] tracking-wider uppercase text-muted-foreground/40 hover:text-primary transition-colors"
            target="_blank"
          >
            GitHub
          </Link>
        </div>
      </div>
    </footer>
  )
}
