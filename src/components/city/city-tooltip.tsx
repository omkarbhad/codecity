"use client"

import { useEffect, useState, useMemo, useRef } from "react"
import type { CitySnapshot } from "@/lib/types/city"
import { useCityStore } from "./use-city-store"

interface CityTooltipProps {
  snapshot: CitySnapshot
}

export function CityTooltip({ snapshot }: CityTooltipProps) {
  const hoveredFile = useCityStore((s) => s.hoveredFile)
  const selectedFile = useCityStore((s) => s.selectedFile)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const tooltipRef = useRef<HTMLDivElement>(null)
  const hoveredFileRef = useRef(hoveredFile)
  hoveredFileRef.current = hoveredFile

  useEffect(() => {
    let rafId: number
    function handleMouseMove(e: MouseEvent) {
      if (!hoveredFileRef.current) return
      cancelAnimationFrame(rafId)
      rafId = requestAnimationFrame(() => {
        setMousePos({ x: e.clientX, y: e.clientY })
      })
    }
    window.addEventListener("mousemove", handleMouseMove, { passive: true })
    return () => {
      window.removeEventListener("mousemove", handleMouseMove)
      cancelAnimationFrame(rafId)
    }
  }, [])

  const file = useMemo(() => {
    if (!hoveredFile) return null
    return snapshot.files.find((f) => f.path === hoveredFile) ?? null
  }, [hoveredFile, snapshot.files])

  const districtColor = useMemo(() => {
    if (!file) return "#888"
    return snapshot.districts.find((d) => d.name === file.district)?.color ?? "#888"
  }, [file, snapshot.districts])

  if (!file || file.path === selectedFile) return null

  const offsetX = mousePos.x > window.innerWidth - 280 ? -240 : 16
  const offsetY = mousePos.y > window.innerHeight - 140 ? -120 : 16

  const cplxClass = file.complexity <= 10 ? "text-(--lime)" : file.complexity <= 25 ? "text-(--sev-med)" : "text-(--sev-high)"
  const fileName = file.path.split("/").pop() ?? file.path
  const ext = fileName.includes(".") ? fileName.slice(fileName.lastIndexOf(".")) : ""

  return (
    <div
      ref={tooltipRef}
      className="pixel-shadow pointer-events-none fixed z-[100] min-w-[220px] max-w-[280px] border-2 border-(--border-light) bg-(--bg-card) animate-fade-in"
      style={{
        left: mousePos.x + offsetX,
        top: mousePos.y + offsetY,
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 border-b-2 border-(--border-pixel) bg-(--bg-deep) px-2 py-1.5">
        <span className="size-2 shrink-0" style={{ backgroundColor: districtColor }} />
        <span className="min-w-0 flex-1 truncate font-mono text-[11px] font-semibold text-(--cream)">
          {fileName}
        </span>
        {ext && (
          <span className="shrink-0 border-2 border-(--border-pixel) bg-(--bg-raised) px-1 py-px font-mono text-[9px] uppercase tracking-[0.05em] text-(--cream-dark)">
            {ext}
          </span>
        )}
      </div>

      <div className="px-2.5 py-2">
        {/* Path */}
        <p className="mb-2 truncate font-mono text-[9px] text-(--muted)">{file.path}</p>

        {/* Stats grid */}
        <div className="grid grid-cols-4 gap-1">
          {[
            { v: file.lines, l: "Lines", c: "text-(--cream)" },
            { v: file.functions.length, l: "Fns", c: "text-(--lime)" },
            { v: file.complexity, l: "Cplx", c: cplxClass },
            { v: file.imports.length, l: "Deps", c: "text-(--sev-low)" },
          ].map((s, i) => (
            <div key={i} className="border-2 border-(--border-pixel) bg-(--bg-raised) p-1 text-center">
              <div className={`font-mono text-[12px] font-bold tabular-nums leading-none ${s.c}`}>
                {s.v.toLocaleString()}
              </div>
              <div className="mt-0.5 font-mono text-[8px] uppercase tracking-[0.08em] text-(--muted)">
                {s.l}
              </div>
            </div>
          ))}
        </div>

        {/* Badges */}
        {(file.isReactComponent || file.hasUnusedExports || file.types.length > 0) && (
          <div className="mt-2 flex gap-1 border-t-2 border-dashed border-(--border-pixel) pt-2">
            {file.isReactComponent && (
              <span className="border-2 border-(--sev-low) bg-[color-mix(in_srgb,var(--sev-low)_8%,transparent)] px-1.5 py-px font-mono text-[8px] uppercase tracking-[0.08em] text-(--sev-low)">
                REACT
              </span>
            )}
            {file.hasUnusedExports && (
              <span className="border-2 border-(--sev-high) bg-[color-mix(in_srgb,var(--sev-high)_8%,transparent)] px-1.5 py-px font-mono text-[8px] uppercase tracking-[0.08em] text-(--sev-high)">
                UNUSED
              </span>
            )}
            {file.types.length > 0 && (
              <span className="border-2 border-(--sev-med) bg-[color-mix(in_srgb,var(--sev-med)_8%,transparent)] px-1.5 py-px font-mono text-[8px] uppercase tracking-[0.08em] text-(--sev-med)">
                {file.types.length} TYPES
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
