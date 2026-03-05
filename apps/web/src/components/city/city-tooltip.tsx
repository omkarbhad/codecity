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
  // PERF: Keep a ref to hoveredFile so the mousemove handler can skip
  // setState when nothing is hovered (avoids unnecessary re-renders)
  const hoveredFileRef = useRef(hoveredFile)
  hoveredFileRef.current = hoveredFile

  useEffect(() => {
    let rafId: number
    function handleMouseMove(e: MouseEvent) {
      // Skip position updates when no tooltip is shown
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

  // Don't show tooltip if this file is already selected (side panel visible)
  if (!file || file.path === selectedFile) return null

  const offsetX = mousePos.x > window.innerWidth - 260 ? -220 : 16
  const offsetY = mousePos.y > window.innerHeight - 120 ? -100 : 16

  const complexityColor = file.complexity <= 10 ? "text-emerald-400" : file.complexity <= 25 ? "text-amber-400" : "text-red-400"
  const fileName = file.path.split("/").pop() ?? file.path
  const ext = fileName.includes(".") ? fileName.slice(fileName.lastIndexOf(".")) : ""

  return (
    <div
      ref={tooltipRef}
      className="fixed z-[100] pointer-events-none glass-panel px-3 py-2 min-w-[180px] max-w-[250px] animate-fade-in"
      style={{
        left: mousePos.x + offsetX,
        top: mousePos.y + offsetY,
        borderLeft: `2px solid ${districtColor}40`,
      }}
    >
      <div className="flex items-center gap-2 mb-1">
        <div className="w-1.5 h-1.5 rounded-sm shrink-0" style={{ backgroundColor: districtColor, boxShadow: `0 0 4px ${districtColor}40` }} />
        <span className="font-mono text-[11px] text-white font-semibold truncate">
          {fileName}
        </span>
        {ext && (
          <span className="font-mono text-[8px] text-white/25 bg-white/[0.05] px-1 py-0.5 rounded shrink-0">
            {ext}
          </span>
        )}
      </div>

      <p className="font-mono text-[8px] text-white/20 truncate mb-1.5">{file.path}</p>

      <div className="flex gap-2.5 text-[9px] font-mono">
        <span className="text-white/50">{file.lines}<span className="text-white/20 ml-0.5">L</span></span>
        <span className="text-white/50">{file.functions.length}<span className="text-white/20 ml-0.5">fn</span></span>
        <span className={complexityColor}>{file.complexity}<span className="text-white/20 ml-0.5">cx</span></span>
        {file.imports.length > 0 && (
          <span className="text-white/35">{file.imports.length}<span className="text-white/15 ml-0.5">imp</span></span>
        )}
      </div>

      {(file.isReactComponent || file.hasUnusedExports) && (
        <div className="flex gap-1 mt-1.5">
          {file.isReactComponent && (
            <span className="text-[7px] font-mono px-1 py-0.5 rounded bg-blue-500/10 text-blue-400/70 border border-blue-500/10">
              React
            </span>
          )}
          {file.hasUnusedExports && (
            <span className="text-[7px] font-mono px-1 py-0.5 rounded bg-red-500/10 text-red-400/70 border border-red-500/10">
              Unused
            </span>
          )}
        </div>
      )}
    </div>
  )
}
