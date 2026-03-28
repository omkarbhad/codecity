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

  const complexityColor = file.complexity <= 10 ? "text-emerald-400" : file.complexity <= 25 ? "text-amber-400" : "text-red-400"
  const fileName = file.path.split("/").pop() ?? file.path
  const ext = fileName.includes(".") ? fileName.slice(fileName.lastIndexOf(".")) : ""

  return (
    <div
      ref={tooltipRef}
      className="fixed z-[100] pointer-events-none bg-black/40 backdrop-blur-2xl border border-white/[0.07] rounded-lg px-3 py-2.5 min-w-[200px] max-w-[260px] shadow-2xl shadow-black/50 animate-fade-in"
      style={{
        left: mousePos.x + offsetX,
        top: mousePos.y + offsetY,
      }}
    >
      {/* File name */}
      <div className="flex items-center gap-2 mb-1.5">
        <div className="w-2 h-2 rounded-sm shrink-0" style={{ backgroundColor: districtColor, boxShadow: `0 0 6px ${districtColor}30` }} />
        <span className="text-xs text-white font-semibold truncate">
          {fileName}
        </span>
        {ext && (
          <span className="text-[9px] text-white/40 bg-white/[0.04] px-1 py-0.5 rounded shrink-0 font-sans">
            {ext}
          </span>
        )}
      </div>

      {/* Path */}
      <p className="font-sans text-[9px] text-white/40 truncate mb-2">{file.path}</p>

      {/* Stats grid */}
      <div className="grid grid-cols-4 gap-1.5">
        <div className="text-center">
          <div className="text-[11px] text-white/85 font-bold tabular-nums">{file.lines}</div>
          <div className="text-[7px] text-white/40 uppercase tracking-wider">lines</div>
        </div>
        <div className="text-center">
          <div className="text-[11px] text-white/85 font-bold tabular-nums">{file.functions.length}</div>
          <div className="text-[7px] text-white/40 uppercase tracking-wider">fns</div>
        </div>
        <div className="text-center">
          <div className={`text-[11px] font-bold tabular-nums ${complexityColor}`}>{file.complexity}</div>
          <div className="text-[7px] text-white/40 uppercase tracking-wider">cplx</div>
        </div>
        <div className="text-center">
          <div className="text-[11px] text-white/85 font-bold tabular-nums">{file.imports.length}</div>
          <div className="text-[7px] text-white/40 uppercase tracking-wider">deps</div>
        </div>
      </div>

      {/* Badges */}
      {(file.isReactComponent || file.hasUnusedExports || file.types.length > 0) && (
        <div className="flex gap-1 mt-2 pt-2 border-t border-white/[0.04]">
          {file.isReactComponent && (
            <span className="text-[8px] px-1.5 py-0.5 rounded bg-blue-500/[0.08] text-blue-400/70 border border-blue-500/[0.08]">
              React
            </span>
          )}
          {file.hasUnusedExports && (
            <span className="text-[8px] px-1.5 py-0.5 rounded bg-red-500/[0.08] text-red-400/70 border border-red-500/[0.08]">
              Unused
            </span>
          )}
          {file.types.length > 0 && (
            <span className="text-[8px] px-1.5 py-0.5 rounded bg-amber-500/[0.08] text-amber-400/70 border border-amber-500/[0.08]">
              {file.types.length} types
            </span>
          )}
        </div>
      )}
    </div>
  )
}
