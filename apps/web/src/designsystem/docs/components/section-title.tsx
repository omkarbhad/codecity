interface SectionTitleProps {
  id: string
  children: React.ReactNode
}

export function SectionTitle({ id, children }: SectionTitleProps) {
  return (
    <h2
      id={id}
      className="text-3xl font-bold tracking-tight text-foreground mt-16 mb-2 scroll-mt-20"
    >
      {children}
    </h2>
  )
}
