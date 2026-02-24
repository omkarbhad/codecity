export function Footer() {
  return (
    <footer className="border-t border-border/30 py-8">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-2 px-6">
        <div className="flex items-center gap-2">
          <svg className="h-4 w-4 text-muted-foreground/40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 21h18M3 7v14M21 7v14M6 7V3h4v4M14 7V3h4v4M9 21v-4h6v4" />
          </svg>
          <span className="font-mono text-xs text-muted-foreground/40">
            CodeCity v2.0
          </span>
        </div>
        <p className="font-mono text-xs text-muted-foreground/40">
          Built for developers who think in systems.
        </p>
      </div>
    </footer>
  )
}
