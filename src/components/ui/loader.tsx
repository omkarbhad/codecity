"use client"

import { cn } from "@codecity/ui/lib/utils"

interface LoaderProps {
  size?: "sm" | "md" | "lg"
  text?: string
  className?: string
}

const sizes = {
  sm: { svg: "w-5 h-5", text: "text-xs", gap: "gap-2" },
  md: { svg: "w-6 h-6", text: "text-sm", gap: "gap-2.5" },
  lg: { svg: "w-8 h-8", text: "text-sm", gap: "gap-3" },
}

function BuildingSVG({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={cn("text-primary", className)}
    >
      <rect x="7" y="4" width="10" height="17" rx="1" fill="currentColor" opacity="0.15" stroke="currentColor" strokeWidth="1.5" />
      <rect x="9" y="7" width="2" height="2" rx="0.5" fill="currentColor" opacity="0.6" />
      <rect x="13" y="7" width="2" height="2" rx="0.5" fill="currentColor" opacity="0.6" />
      <rect x="9" y="11" width="2" height="2" rx="0.5" fill="currentColor" opacity="0.6" />
      <rect x="13" y="11" width="2" height="2" rx="0.5" fill="currentColor" opacity="0.6" />
      <rect x="10.5" y="16" width="3" height="5" rx="0.5" fill="currentColor" opacity="0.4" />
      <rect x="2" y="10" width="5" height="11" rx="1" fill="currentColor" opacity="0.08" stroke="currentColor" strokeWidth="1" />
      <rect x="3.5" y="12" width="1.5" height="1.5" rx="0.3" fill="currentColor" opacity="0.35" />
      <rect x="3.5" y="15" width="1.5" height="1.5" rx="0.3" fill="currentColor" opacity="0.35" />
      <rect x="17" y="8" width="5" height="13" rx="1" fill="currentColor" opacity="0.08" stroke="currentColor" strokeWidth="1" />
      <rect x="19" y="10" width="1.5" height="1.5" rx="0.3" fill="currentColor" opacity="0.35" />
      <rect x="19" y="13" width="1.5" height="1.5" rx="0.3" fill="currentColor" opacity="0.35" />
      <line x1="1" y1="21" x2="23" y2="21" stroke="currentColor" strokeWidth="1.5" opacity="0.2" />
    </svg>
  )
}

export function Loader({ size = "md", text, className }: LoaderProps) {
  const s = sizes[size]

  return (
    <div className={cn("flex items-center", s.gap, className)}>
      <BuildingSVG className={cn(s.svg, "animate-pulse shrink-0")} />
      {text && (
        <span className={cn("text-zinc-400 font-medium", s.text)}>{text}</span>
      )}
    </div>
  )
}

export function PageLoader({ text = "Loading..." }: { text?: string }) {
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-background">
      <Loader size="lg" text={text} />
    </div>
  )
}

export function InlineLoader({ text }: { text?: string }) {
  return (
    <div className="flex items-center justify-center py-12">
      <Loader size="sm" text={text} />
    </div>
  )
}
