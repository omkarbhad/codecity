"use client"

import { memo, useCallback, useMemo, useRef } from "react"
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  MarkerType,
  Handle,
  Position,
  type Node,
  type Edge,
  type NodeProps,
  type NodeMouseHandler,
} from "@xyflow/react"
import * as THREE from "three"
import "@xyflow/react/dist/style.css"

import type { CitySnapshot } from "@/lib/types/city"
import { isPathHidden, useCityStore } from "./use-city-store"
import { getExtension } from "./extension-filter"
import { getBuildingColor } from "@/lib/visualization/color-utils"

const WORLD_TO_PIXELS = 24
const MIN_NODE_SIZE = 24
const MAX_NODE_SIZE = 220
const NODE_GAP = 8
const DISTRICT_PADDING = 40
const DISTRICT_HEADER = 28

interface FileNodeData extends Record<string, unknown> {
  color: string
  label: string
  path: string
}

interface DistrictNodeData extends Record<string, unknown> {
  label: string
  color: string
  fileCount: number
}

const FileNode = memo(function FileNode({ data }: NodeProps<Node<FileNodeData>>) {
  return (
    <div
      className="city2d-node"
      style={{ background: data.color }}
      data-path={data.path}
    >
      {/* Invisible edge anchors — IDs allow explicit source/target picking */}
      <Handle id="t" type="target" position={Position.Top} className="city2d-handle" isConnectable={false} />
      <Handle id="s" type="source" position={Position.Bottom} className="city2d-handle" isConnectable={false} />
      <span className="city2d-node-label">{data.label}</span>
    </div>
  )
})

const DistrictNode = memo(function DistrictNode({ data }: NodeProps<Node<DistrictNodeData>>) {
  return (
    <div className="city2d-district" style={{ ["--district-color" as string]: data.color }}>
      <div className="city2d-district-header">
        <span className="city2d-district-dot" style={{ background: data.color }} />
        <span className="city2d-district-name" title={data.label}>{data.label}</span>
        <span className="city2d-district-count">{data.fileCount}</span>
      </div>
    </div>
  )
})

const nodeTypes = { file: FileNode, district: DistrictNode }

interface Props {
  snapshot: CitySnapshot
}

export function City2DCanvas({ snapshot }: Props) {
  const visualizationMode = useCityStore((s) => s.visualizationMode)
  const hiddenPaths = useCityStore((s) => s.hiddenPaths)
  const hiddenExtensions = useCityStore((s) => s.hiddenExtensions)
  const dimUnselected = useCityStore((s) => s.dimUnselected)
  const selectedFile = useCityStore((s) => s.selectedFile)
  const selectFile = useCityStore((s) => s.selectFile)
  const hoverFile = useCityStore((s) => s.hoverFile)

  // Build O(1) path → index lookup
  const pathIndex = useMemo(() => {
    const m = new Map<string, number>()
    for (let i = 0; i < snapshot.files.length; i++) m.set(snapshot.files[i].path, i)
    return m
  }, [snapshot.files])

  const districtColorMap = useMemo(() => {
    const m = new Map<string, string>()
    const walk = (
      list: { name: string; color: string; subDistricts?: { name: string; color: string; subDistricts?: unknown[] }[] }[],
    ) => {
      for (const d of list) {
        m.set(d.name, d.color)
        if (d.subDistricts) walk(d.subDistricts as never)
      }
    }
    walk(snapshot.districts)
    return m
  }, [snapshot.districts])

  const subDistrictColorMap = useMemo(() => {
    const m = new Map<string, string>()
    const walk = (
      list: { name: string; color: string; subDistricts?: unknown[] }[],
      parentName: string,
    ) => {
      for (const sd of list) {
        m.set(`${parentName}::${sd.name}`, sd.color)
        if (sd.subDistricts) walk(sd.subDistricts as never, parentName)
      }
    }
    for (const d of snapshot.districts) {
      if (d.subDistricts) walk(d.subDistricts as never, d.name)
    }
    return m
  }, [snapshot.districts])

  // Two-pass collision-free layout:
  //   1. Compute size + color for every visible file.
  //   2. Group by district, pack each district into its own grid (sorted by size desc),
  //      emit a district group node + file children. Districts placed at their 3D bounds origin
  //      and nudged down to resolve any group-vs-group overlap.
  const nodes = useMemo<Array<Node<FileNodeData> | Node<DistrictNodeData>>>(() => {
    const tmp = new THREE.Color()

    interface PreparedFile {
      path: string
      label: string
      color: string
      size: number
      district: string
    }

    const prepared: PreparedFile[] = []
    for (let i = 0; i < snapshot.files.length; i++) {
      const file = snapshot.files[i]
      if (isPathHidden(file.path, hiddenPaths)) continue
      if (hiddenExtensions.has(getExtension(file.path))) continue

      const sf = file.subFolder ?? "_root"
      const baseColor =
        subDistrictColorMap.get(`${file.district}::${sf}`) ??
        districtColorMap.get(file.district) ??
        "#888888"

      const colorObj = getBuildingColor(file, visualizationMode, baseColor, false, tmp)
      const colorHex = `#${colorObj.getHexString()}`

      const linesScore = Math.sqrt(Math.max(1, file.lines))
      const fnBonus = Math.min(20, file.functions.length * 1.2)
      const sizePx = Math.max(MIN_NODE_SIZE, Math.min(MAX_NODE_SIZE, 22 + linesScore * 4 + fnBonus))

      const slash = file.path.lastIndexOf("/")
      const label = slash >= 0 ? file.path.slice(slash + 1) : file.path

      prepared.push({ path: file.path, label, color: colorHex, size: sizePx, district: file.district })
    }

    // Group by district
    const groups = new Map<string, PreparedFile[]>()
    for (const p of prepared) {
      const arr = groups.get(p.district)
      if (arr) arr.push(p)
      else groups.set(p.district, [p])
    }

    // District anchor positions from the original 3D bounds (top-left in 2D space)
    const districtAnchor = new Map<string, { x: number; y: number }>()
    for (const d of snapshot.districts) {
      districtAnchor.set(d.name, {
        x: d.bounds.x * WORLD_TO_PIXELS,
        y: d.bounds.z * WORLD_TO_PIXELS,
      })
    }

    interface PlacedRect { x: number; y: number; w: number; h: number }
    interface PlacedDistrict {
      name: string
      rect: PlacedRect
      color: string
      fileCount: number
      childNodes: Node<FileNodeData>[]
    }
    const placedDistricts: PlacedDistrict[] = []

    const groupNames = Array.from(groups.keys())
    for (const name of groupNames) {
      const files = groups.get(name)!
      files.sort((a, b) => b.size - a.size)

      const cellSize = files[0].size + NODE_GAP
      const cols = Math.max(1, Math.ceil(Math.sqrt(files.length)))
      const rows = Math.ceil(files.length / cols)
      const innerPad = DISTRICT_PADDING / 2
      const gridWidth = cols * cellSize + DISTRICT_PADDING
      const gridHeight = rows * cellSize + DISTRICT_PADDING + DISTRICT_HEADER

      const anchor = districtAnchor.get(name) ?? { x: 0, y: 0 }

      // Children stored with positions RELATIVE to district anchor.
      // We rebase them to absolute coords after district overlap resolution.
      const childNodes: Node<FileNodeData>[] = []
      for (let i = 0; i < files.length; i++) {
        const f = files[i]
        const col = i % cols
        const row = Math.floor(i / cols)
        const cellOriginX = innerPad + col * cellSize
        const cellOriginY = DISTRICT_HEADER + innerPad + row * cellSize
        const x = cellOriginX + (cellSize - NODE_GAP - f.size) / 2
        const y = cellOriginY + (cellSize - NODE_GAP - f.size) / 2

        childNodes.push({
          id: f.path,
          type: "file",
          position: { x, y },
          data: { color: f.color, label: f.label, path: f.path },
          style: { width: f.size, height: f.size },
          width: f.size,
          height: f.size,
          measured: { width: f.size, height: f.size },
          draggable: false,
          selectable: true,
        })
      }

      placedDistricts.push({
        name,
        rect: { x: anchor.x, y: anchor.y, w: gridWidth, h: gridHeight },
        color: districtColorMap.get(name) ?? "#888888",
        fileCount: files.length,
        childNodes,
      })
    }

    // Resolve district-vs-district overlaps deterministically.
    placedDistricts.sort((a, b) => {
      if (a.rect.y !== b.rect.y) return a.rect.y - b.rect.y
      if (a.rect.x !== b.rect.x) return a.rect.x - b.rect.x
      return a.name.localeCompare(b.name)
    })

    const finalRects: PlacedRect[] = []
    for (const d of placedDistricts) {
      let rect = { ...d.rect }
      let moved = true
      while (moved) {
        moved = false
        for (const r of finalRects) {
          const overlapX = rect.x < r.x + r.w && rect.x + rect.w > r.x
          const overlapY = rect.y < r.y + r.h && rect.y + rect.h > r.y
          if (overlapX && overlapY) {
            rect = { ...rect, y: r.y + r.h + DISTRICT_PADDING }
            moved = true
          }
        }
      }
      d.rect = rect
      finalRects.push(rect)
    }

    // Emit district backgrounds first (lower z), then files at absolute positions.
    const out: Array<Node<FileNodeData> | Node<DistrictNodeData>> = []
    for (const d of placedDistricts) {
      out.push({
        id: `district:${d.name}`,
        type: "district",
        position: { x: d.rect.x, y: d.rect.y },
        data: { label: d.name, color: d.color, fileCount: d.fileCount },
        style: { width: d.rect.w, height: d.rect.h },
        width: d.rect.w,
        height: d.rect.h,
        measured: { width: d.rect.w, height: d.rect.h },
        draggable: false,
        selectable: false,
      })
    }
    for (const d of placedDistricts) {
      for (const child of d.childNodes) {
        out.push({
          ...child,
          position: { x: child.position.x + d.rect.x, y: child.position.y + d.rect.y },
        })
      }
    }
    return out
  }, [
    snapshot.files,
    snapshot.districts,
    hiddenPaths,
    hiddenExtensions,
    districtColorMap,
    subDistrictColorMap,
    visualizationMode,
  ])

  const handleNodeClick = useCallback<NodeMouseHandler>(
    (_event, node) => {
      if (node.type !== "file") return
      const idx = pathIndex.get(node.id)
      selectFile(node.id, idx ?? null)
    },
    [pathIndex, selectFile],
  )

  const handlePaneClick = useCallback(() => selectFile(null, null), [selectFile])

  // Lightweight throttled hover via DOM event delegation — avoids React re-renders.
  const containerRef = useRef<HTMLDivElement | null>(null)
  const lastHoverPath = useRef<string | null>(null)
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const target = (e.target as HTMLElement).closest<HTMLElement>("[data-path]")
      const path = target?.dataset.path ?? null
      if (path === lastHoverPath.current) return
      lastHoverPath.current = path
      if (path) {
        hoverFile(path, pathIndex.get(path) ?? null)
      } else {
        hoverFile(null, null)
      }
    },
    [hoverFile, pathIndex],
  )
  const handleMouseLeave = useCallback(() => {
    if (lastHoverPath.current !== null) {
      lastHoverPath.current = null
      hoverFile(null, null)
    }
  }, [hoverFile])

  const wrapperClass = `absolute inset-0 bg-[#070708] city2d ${
    selectedFile ? "city2d-has-selection" : ""
  } ${dimUnselected ? "city2d-dim" : ""}`

  // Edges only for the selected file: outgoing imports + incoming importedBy.
  // Skip when nothing is selected — keeps the canvas clean and avoids per-frame edge work.
  const edges = useMemo<Edge[]>(() => {
    if (!selectedFile) return []
    const idx = pathIndex.get(selectedFile)
    if (idx === undefined) return []
    const file = snapshot.files[idx]

    const result: Edge[] = []
    const visible = (path: string) => {
      const i = pathIndex.get(path)
      if (i === undefined) return false
      const f = snapshot.files[i]
      if (isPathHidden(f.path, hiddenPaths)) return false
      if (hiddenExtensions.has(getExtension(f.path))) return false
      return true
    }

    // Match 3D dependency-pipes palette: red = outgoing, blue = incoming.
    const OUTGOING = "#ff6b6b"
    const INCOMING = "#4dabf7"

    for (const target of file.imports) {
      if (!visible(target)) continue
      result.push({
        id: `e:${file.path}->${target}`,
        source: file.path,
        target,
        type: "smoothstep",
        sourceHandle: "s",
        targetHandle: "t",
        animated: true,
        className: "city2d-edge city2d-edge-out",
        style: { stroke: OUTGOING, strokeWidth: 2.5 },
        markerEnd: { type: MarkerType.ArrowClosed, color: OUTGOING, width: 16, height: 16 },
        zIndex: 1000,
      })
    }
    for (const source of file.importedBy) {
      if (!visible(source)) continue
      result.push({
        id: `e:${source}->${file.path}`,
        source,
        target: file.path,
        type: "smoothstep",
        sourceHandle: "s",
        targetHandle: "t",
        animated: true,
        className: "city2d-edge city2d-edge-in",
        style: { stroke: INCOMING, strokeWidth: 2.5 },
        markerEnd: { type: MarkerType.ArrowClosed, color: INCOMING, width: 16, height: 16 },
        zIndex: 1000,
      })
    }
    return result
  }, [selectedFile, pathIndex, snapshot.files, hiddenPaths, hiddenExtensions])

  // Inline style targeting the selected node by data-path. Cheap: only updates on selection change.
  const selectionStyle = useMemo(() => {
    if (!selectedFile) return ""
    const escaped = selectedFile.replace(/["\\]/g, (m) => `\\${m}`)
    return `.city2d-node[data-path="${escaped}"] {
      opacity: 1 !important;
      outline: 2px solid #ffffff !important;
      box-shadow: 0 0 0 3px rgba(59,130,246,0.55), 0 6px 16px rgba(0,0,0,0.55) !important;
      z-index: 10;
    }`
  }, [selectedFile])

  return (
    <div
      ref={containerRef}
      className={wrapperClass}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <style>{CITY2D_STYLES}</style>
      {selectionStyle && <style>{selectionStyle}</style>}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodeClick={handleNodeClick}
        onPaneClick={handlePaneClick}
        fitView
        fitViewOptions={{ padding: 0.2, maxZoom: 2 }}
        minZoom={0.05}
        maxZoom={4}
        proOptions={{ hideAttribution: true }}
        nodesDraggable={false}
        nodesConnectable={false}
        panOnScroll
        panOnDrag
        selectionOnDrag={false}
        zoomOnDoubleClick={false}
        colorMode="dark"
      >
        <Background color="#1a1a1f" gap={32} size={1} />
        <Controls position="bottom-right" showInteractive={false} />
        <MiniMap
          position="top-right"
          pannable
          zoomable
          maskColor="rgba(0,0,0,0.6)"
          style={{ background: "#0b0b0c", border: "1px solid rgba(255,255,255,0.08)" }}
          nodeColor={(n) => {
            if (n.type === "district") return (n.data as DistrictNodeData).color
            return (n.data as FileNodeData).color
          }}
          nodeStrokeWidth={0}
          nodeBorderRadius={2}
        />
      </ReactFlow>
    </div>
  )
}

const CITY2D_STYLES = `
.city2d-node {
  position: relative;
  width: 100%;
  height: 100%;
  border-radius: 3px;
  outline: 1px solid rgba(0,0,0,0.45);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  overflow: hidden;
  box-shadow: 0 2px 6px rgba(0,0,0,0.45);
  transition: outline-color 120ms, opacity 120ms;
}
.city2d-node-label {
  pointer-events: none;
  width: 100%;
  padding: 0 4px 2px;
  text-align: center;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 8px;
  line-height: 1;
  color: rgba(255,255,255,0.92);
  text-shadow: 0 1px 2px rgba(0,0,0,0.85);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  mix-blend-mode: screen;
}
.city2d-node:hover {
  outline: 1.5px solid rgba(255,255,255,0.85);
  z-index: 5;
}
.city2d.city2d-has-selection.city2d-dim .city2d-node {
  opacity: 0.22;
}
.city2d-district {
  width: 100%;
  height: 100%;
  border-radius: 10px;
  background: color-mix(in srgb, var(--district-color) 6%, rgba(15,15,18,0.55));
  border: 1px solid color-mix(in srgb, var(--district-color) 45%, rgba(255,255,255,0.04));
  box-shadow: inset 0 0 24px color-mix(in srgb, var(--district-color) 8%, transparent), 0 1px 0 rgba(255,255,255,0.03);
  pointer-events: none;
  overflow: hidden;
}
.city2d-district-header {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 26px;
  padding: 0 12px;
  font-family: ui-sans-serif, system-ui, sans-serif;
  font-size: 12px;
  font-weight: 600;
  color: rgba(255,255,255,0.92);
  border-bottom: 1px solid color-mix(in srgb, var(--district-color) 30%, rgba(255,255,255,0.04));
  background: color-mix(in srgb, var(--district-color) 14%, rgba(0,0,0,0.55));
  letter-spacing: 0.01em;
}
.city2d-district-dot {
  width: 8px;
  height: 8px;
  border-radius: 2px;
  flex-shrink: 0;
  box-shadow: 0 0 6px color-mix(in srgb, var(--district-color) 60%, transparent);
}
.city2d-district-name {
  flex: 1;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.city2d-district-count {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 10px;
  font-weight: 500;
  color: rgba(255,255,255,0.4);
  flex-shrink: 0;
}
/* District backgrounds — sit behind file nodes, never intercept input */
.react-flow__node-district {
  background: transparent !important;
  border: none !important;
  padding: 0 !important;
  z-index: 0 !important;
  pointer-events: none !important;
}
.react-flow__node-file {
  z-index: 5;
}
/* Handles invisible — only used as edge anchor points */
.city2d-handle {
  width: 1px !important;
  height: 1px !important;
  min-width: 0 !important;
  min-height: 0 !important;
  background: transparent !important;
  border: none !important;
  opacity: 0;
  pointer-events: none;
}
/* Edges — match 3D dependency-pipes look (red out / blue in, glow + dash flow) */
.react-flow__edges {
  z-index: 1000;
  overflow: visible;
}
.city2d-edge .react-flow__edge-path {
  stroke-linecap: round;
  stroke-linejoin: round;
}
.city2d-edge-out .react-flow__edge-path {
  filter: drop-shadow(0 0 4px rgba(255, 107, 107, 0.85)) drop-shadow(0 0 10px rgba(255, 107, 107, 0.45));
}
.city2d-edge-in .react-flow__edge-path {
  filter: drop-shadow(0 0 4px rgba(77, 171, 247, 0.85)) drop-shadow(0 0 10px rgba(77, 171, 247, 0.45));
}
.city2d-edge.animated .react-flow__edge-path {
  stroke-dasharray: 8 6;
  animation: city2d-dashflow 0.7s linear infinite;
}
.city2d-edge-in.animated .react-flow__edge-path {
  animation-direction: reverse;
}
@keyframes city2d-dashflow {
  to { stroke-dashoffset: -14; }
}
`
