"use client"

import { useState } from "react"

interface SwatchProps {
  color: string
  label: string
  sub?: string
}

export function Swatch({ color, label, sub }: SwatchProps) {
  const [copied, setCopied] = useState(false)

  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(color)
        setCopied(true)
        setTimeout(() => setCopied(false), 1200)
      }}
      className="group flex flex-col items-center gap-2 text-center"
    >
      <div
        className="h-16 w-16 rounded-lg border border-white/10 transition-transform group-hover:scale-110"
        style={{ background: color }}
      />
      <span className="text-xs font-medium text-foreground/80">
        {copied ? "Copied!" : label}
      </span>
      {sub && (
        <span className="text-[10px] text-muted-foreground font-mono">{sub}</span>
      )}
    </button>
  )
}
