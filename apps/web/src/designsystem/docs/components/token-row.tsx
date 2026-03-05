interface TokenRowProps {
  label: string
  value: string
}

export function TokenRow({ label, value }: TokenRowProps) {
  return (
    <div className="flex items-center justify-between py-2 px-3 border-b border-border/40">
      <span className="text-sm font-medium text-foreground/80">{label}</span>
      <code className="text-xs font-mono text-muted-foreground bg-muted/60 px-2 py-0.5 rounded">
        {value}
      </code>
    </div>
  )
}
