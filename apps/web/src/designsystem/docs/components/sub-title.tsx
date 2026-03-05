interface SubTitleProps {
  children: React.ReactNode
}

export function SubTitle({ children }: SubTitleProps) {
  return (
    <h3 className="text-xl font-semibold text-foreground/90 mt-10 mb-4">
      {children}
    </h3>
  )
}
