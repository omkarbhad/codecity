"use client"

import { useRef, useEffect, useMemo } from "react"
import type { CitySnapshot } from "@/lib/types/city"
import { useCityStore } from "./use-city-store"

interface MinimapProps {
  snapshot: CitySnapshot
}

export function Minimap({ snapshot }: MinimapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { selectedFile } = useCityStore()

  // Compute world bounds for normalization
  const bounds = useMemo(() => {
    let minX = Infinity
    let minZ = Infinity
    let maxX = -Infinity
    let maxZ = -Infinity

    for (const district of snapshot.districts) {
      const { x, z, width, depth } = district.bounds
      minX = Math.min(minX, x)
      minZ = Math.min(minZ, z)
      maxX = Math.max(maxX, x + width)
      maxZ = Math.max(maxZ, z + depth)
    }

    // Fallback if no districts
    if (!isFinite(minX)) {
      for (const file of snapshot.files) {
        minX = Math.min(minX, file.position.x)
        minZ = Math.min(minZ, file.position.z)
        maxX = Math.max(maxX, file.position.x)
        maxZ = Math.max(maxZ, file.position.z)
      }
    }

    if (!isFinite(minX)) {
      return { minX: 0, minZ: 0, maxX: 100, maxZ: 100 }
    }

    // Add padding
    const pad = 2
    return {
      minX: minX - pad,
      minZ: minZ - pad,
      maxX: maxX + pad,
      maxZ: maxZ + pad,
    }
  }, [snapshot])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const displayWidth = canvas.clientWidth
    const displayHeight = canvas.clientHeight
    canvas.width = displayWidth * dpr
    canvas.height = displayHeight * dpr
    ctx.scale(dpr, dpr)

    const worldW = bounds.maxX - bounds.minX
    const worldH = bounds.maxZ - bounds.minZ

    const scaleX = displayWidth / worldW
    const scaleZ = displayHeight / worldH
    const scale = Math.min(scaleX, scaleZ)

    const offsetX = (displayWidth - worldW * scale) / 2
    const offsetZ = (displayHeight - worldH * scale) / 2

    function toCanvas(wx: number, wz: number): [number, number] {
      return [
        offsetX + (wx - bounds.minX) * scale,
        offsetZ + (wz - bounds.minZ) * scale,
      ]
    }

    // Clear
    ctx.clearRect(0, 0, displayWidth, displayHeight)

    // Draw districts
    for (const district of snapshot.districts) {
      const [dx, dz] = toCanvas(district.bounds.x, district.bounds.z)
      const dw = district.bounds.width * scale
      const dd = district.bounds.depth * scale

      ctx.fillStyle = district.color + "20" // 12.5% opacity
      ctx.fillRect(dx, dz, dw, dd)

      ctx.strokeStyle = district.color + "40"
      ctx.lineWidth = 1
      ctx.strokeRect(dx, dz, dw, dd)
    }

    // Draw files as small dots
    for (const file of snapshot.files) {
      const [fx, fz] = toCanvas(file.position.x, file.position.z)
      const district = snapshot.districts.find((d) => d.name === file.district)
      const color = district?.color ?? "#888888"

      ctx.fillStyle = color + "80"
      ctx.beginPath()
      ctx.arc(fx, fz, 1.5, 0, Math.PI * 2)
      ctx.fill()
    }

    // Draw selected file
    if (selectedFile) {
      const file = snapshot.files.find((f) => f.path === selectedFile)
      if (file) {
        const [sx, sz] = toCanvas(file.position.x, file.position.z)

        // Outer glow
        ctx.fillStyle = "#ff404060"
        ctx.beginPath()
        ctx.arc(sx, sz, 5, 0, Math.PI * 2)
        ctx.fill()

        // Inner dot
        ctx.fillStyle = "#ff4040"
        ctx.beginPath()
        ctx.arc(sx, sz, 3, 0, Math.PI * 2)
        ctx.fill()
      }
    }
  }, [snapshot, selectedFile, bounds])

  return (
    <div className="bg-card/30 backdrop-blur-xl rounded-lg border border-border/30 overflow-hidden">
      <div className="px-3 py-2 border-b border-border/30">
        <span className="font-mono text-xs text-white/50 uppercase tracking-wider">
          Minimap
        </span>
      </div>
      <canvas
        ref={canvasRef}
        className="w-full"
        style={{ height: 160 }}
      />
    </div>
  )
}
