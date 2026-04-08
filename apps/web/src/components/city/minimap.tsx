"use client"

import { useRef, useEffect, useMemo, useCallback } from "react"
import type { CitySnapshot } from "@/lib/types/city"
import { useCityStore, isPathHidden } from "./use-city-store"

interface MinimapProps {
  snapshot: CitySnapshot
}

export function Minimap({ snapshot }: MinimapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const selectedFile = useCityStore((s) => s.selectedFile)
  const selectFile = useCityStore((s) => s.selectFile)
  const hiddenExtensions = useCityStore((s) => s.hiddenExtensions)
  const hiddenPaths = useCityStore((s) => s.hiddenPaths)
  // Use ref for hoveredFile to avoid full canvas redraws on mousemove
  const hoveredFileRef = useRef(useCityStore.getState().hoveredFile)
  useEffect(() => {
    return useCityStore.subscribe((s) => { hoveredFileRef.current = s.hoveredFile })
  }, [])

  // O(1) file lookup map
  const fileMap = useMemo(() => {
    const map = new Map<string, (typeof snapshot.files)[0]>()
    for (const f of snapshot.files) map.set(f.path, f)
    return map
  }, [snapshot.files])

  const bounds = useMemo(() => {
    let minX = Infinity
    let minZ = Infinity
    let maxX = -Infinity
    let maxZ = -Infinity

    for (const district of snapshot.districts) {
      const { x, z, width, depth } = district.bounds
      if (width === 0) continue
      minX = Math.min(minX, x)
      minZ = Math.min(minZ, z)
      maxX = Math.max(maxX, x + width)
      maxZ = Math.max(maxZ, z + depth)
    }

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

    const pad = 4
    return { minX: minX - pad, minZ: minZ - pad, maxX: maxX + pad, maxZ: maxZ + pad }
  }, [snapshot])

  // Click-to-navigate: find closest file to click position
  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current
      if (!canvas) return

      const rect = canvas.getBoundingClientRect()
      const clickX = e.clientX - rect.left
      const clickY = e.clientY - rect.top

      const displayWidth = canvas.clientWidth
      const displayHeight = canvas.clientHeight
      const worldW = bounds.maxX - bounds.minX
      const worldH = bounds.maxZ - bounds.minZ
      const scaleX = displayWidth / worldW
      const scaleZ = displayHeight / worldH
      const scale = Math.min(scaleX, scaleZ)
      const offsetX = (displayWidth - worldW * scale) / 2
      const offsetZ = (displayHeight - worldH * scale) / 2

      // Convert click to world coords
      const worldClickX = (clickX - offsetX) / scale + bounds.minX
      const worldClickZ = (clickY - offsetZ) / scale + bounds.minZ

      // Find nearest file
      let bestDist = Infinity
      let bestFile: string | null = null
      let bestIndex = -1

      for (let i = 0; i < snapshot.files.length; i++) {
        const file = snapshot.files[i]
        const dx = file.position.x - worldClickX
        const dz = file.position.z - worldClickZ
        const dist = dx * dx + dz * dz
        if (dist < bestDist) {
          bestDist = dist
          bestFile = file.path
          bestIndex = i
        }
      }

      // Only select if click was reasonably close (within ~5 world units)
      if (bestFile && bestDist < 25) {
        selectFile(bestFile, bestIndex)
      }
    },
    [bounds, snapshot.files, selectFile]
  )

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

    ctx.clearRect(0, 0, displayWidth, displayHeight)

    // Draw district regions
    for (const district of snapshot.districts) {
      if (district.bounds.width === 0) continue
      const [dx, dz] = toCanvas(district.bounds.x, district.bounds.z)
      const dw = district.bounds.width * scale
      const dd = district.bounds.depth * scale

      ctx.fillStyle = district.color + "18"
      ctx.fillRect(dx, dz, dw, dd)

      ctx.strokeStyle = district.color + "35"
      ctx.lineWidth = 1
      ctx.strokeRect(dx, dz, dw, dd)
    }

    // PERF: Build district color map once instead of .find() per file
    const districtColorMap = new Map<string, string>()
    for (const d of snapshot.districts) districtColorMap.set(d.name, d.color)

    // Draw file dots
    for (const file of snapshot.files) {
      const ext = file.path.includes(".") ? file.path.slice(file.path.lastIndexOf(".")).toLowerCase() : ".other"
      const isFiltered = hiddenExtensions.has(ext)
      if (isFiltered) continue
      // Skip files hidden via path visibility toggle
      if (isPathHidden(file.path, hiddenPaths)) continue

      const [fx, fz] = toCanvas(file.position.x, file.position.z)
      const color = districtColorMap.get(file.district) ?? "#888888"
      const isHovered = file.path === hoveredFileRef.current

      ctx.fillStyle = isHovered ? "#ffffff" : color + "90"
      ctx.beginPath()
      ctx.arc(fx, fz, isHovered ? 3 : 2, 0, Math.PI * 2)
      ctx.fill()
    }

    // Draw dependency lines and selected file highlight on minimap
    if (selectedFile) {
      const srcFile = fileMap.get(selectedFile)
      if (srcFile) {
        const [sx, sz] = toCanvas(srcFile.position.x, srcFile.position.z)

        // Draw outgoing imports (warm red)
        for (const imp of srcFile.imports) {
          const target = fileMap.get(imp)
          if (!target) continue
          const [tx, tz] = toCanvas(target.position.x, target.position.z)
          ctx.strokeStyle = "#ff6b6b50"
          ctx.lineWidth = 1
          ctx.beginPath()
          ctx.moveTo(sx, sz)
          ctx.lineTo(tx, tz)
          ctx.stroke()
          // Small dot at target
          ctx.fillStyle = "#ff6b6b60"
          ctx.beginPath()
          ctx.arc(tx, tz, 2.5, 0, Math.PI * 2)
          ctx.fill()
        }

        // Draw incoming importedBy (cool blue)
        for (const dep of srcFile.importedBy) {
          const source = fileMap.get(dep)
          if (!source) continue
          const [dx, dz] = toCanvas(source.position.x, source.position.z)
          ctx.strokeStyle = "#4dabf750"
          ctx.lineWidth = 1
          ctx.beginPath()
          ctx.moveTo(dx, dz)
          ctx.lineTo(sx, sz)
          ctx.stroke()
          // Small dot at source
          ctx.fillStyle = "#4dabf760"
          ctx.beginPath()
          ctx.arc(dx, dz, 2.5, 0, Math.PI * 2)
          ctx.fill()
        }

        // Outer glow
        ctx.fillStyle = "#ff505080"
        ctx.beginPath()
        ctx.arc(sx, sz, 6, 0, Math.PI * 2)
        ctx.fill()

        // Inner dot
        ctx.fillStyle = "#ff5050"
        ctx.beginPath()
        ctx.arc(sx, sz, 3.5, 0, Math.PI * 2)
        ctx.fill()
      }
    }
  }, [snapshot, selectedFile, bounds, hiddenExtensions, hiddenPaths, fileMap])

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <canvas
        ref={canvasRef}
        className="w-full flex-1 cursor-crosshair"
        style={{ minHeight: 200 }}
        onClick={handleClick}
      />
    </div>
  )
}
