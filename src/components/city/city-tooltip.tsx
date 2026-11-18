"use client"

import { useEffect, useState, useMemo, useRef } from "react"
import type { CitySnapshot } from "@/lib/types/city"
import { useCityStore } from "./use-city-store"
import { UNKNOWN_COLOR } from "@/lib/theme"

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
    if (!file) return UNKNOWN_COLOR
    return snapshot.districts.find((d) => d.name === file.district)?.color ?? UNKNOWN_COLOR
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
      className="pointer-events-none fixed z-[100] min-w-[220px] max-w-[300px] overflow-hidden rounded-[10px] border border-(--border-pixel) bg-(--bg-card) shadow-(--shadow-lg) animate-fade-in"
      style={{
        left: mousePos.x + offsetX,
        top: mousePos.y + offsetY,
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-(--border-pixel) px-3 py-2">
        <span className="size-2.5 shrink-0 rounded-[3px]" style={{ backgroundColor: districtColor }} />
        <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-(--cream)">
          {fileName}
        </span>
        {ext && (
          <span className="shrink-0 rounded-full bg-(--bg-raised) px-2 py-px text-[11px] text-(--cream-dark)">
            {ext}
          </span>
        )}
      </div>

      <div className="px-3 py-2.5">
        {/* Path */}
        <p className="mb-2.5 truncate text-[12px] text-(--muted)">{file.path}</p>

        {/* Stats grid */}
        <div className="grid grid-cols-4 gap-1">
          {[
            { v: file.lines, l: "Lines", c: "text-(--cream)" },
            { v: file.functions.length, l: "Fns", c: "text-(--lime)" },
            { v: file.complexity, l: "Cplx", c: cplxClass },
            { v: file.imports.length, l: "Deps", c: "text-(--sev-low)" },
          ].map((s, i) => (
            <div key={i} className="rounded-[8px] bg-(--bg-raised) px-1 py-1.5 text-center">
              <div className={`text-[13px] font-semibold tabular-nums leading-none ${s.c}`}>
                {s.v.toLocaleString()}
              </div>
              <div className="mt-1 text-[10px] text-(--muted)">
                {s.l}
              </div>
            </div>
          ))}
        </div>

        {/* Badges */}
        {(file.isReactComponent || file.hasUnusedExports || file.types.length > 0) && (
          <div className="mt-2.5 flex gap-1 border-t border-(--border-pixel) pt-2.5">
            {file.isReactComponent && (
              <span className="bg-[color-mix(in_srgb,var(--sev-low)_14%,transparent)] px-2 py-0.5 text-[11px] text-(--sev-low) rounded-full">
                REACT
              </span>
            )}
            {file.hasUnusedExports && (
              <span className="bg-[color-mix(in_srgb,var(--sev-high)_14%,transparent)] px-2 py-0.5 text-[11px] text-(--sev-high) rounded-full">
                UNUSED
              </span>
            )}
            {file.types.length > 0 && (
              <span className="bg-[color-mix(in_srgb,var(--sev-med)_14%,transparent)] px-2 py-0.5 text-[11px] text-(--sev-med) rounded-full">
                {file.types.length} TYPES
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
