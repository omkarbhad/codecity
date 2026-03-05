import type { FileData, DistrictData, SubDistrictData, CityStats, CitySnapshot, LayoutMode } from "../types/city"
import { DISTRICT_COLORS } from "../types/city"
import type { ParsedFile } from "./parser"

// ── Lightweight hex ↔ HSL helpers (avoids importing THREE in server code) ──

function hexToHSL(hex: string): { h: number; s: number; l: number } {
  const c = parseInt(hex.replace("#", ""), 16)
  const r = ((c >> 16) & 0xff) / 255
  const g = ((c >> 8) & 0xff) / 255
  const b = (c & 0xff) / 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  const l = (max + min) / 2
  if (max === min) return { h: 0, s: 0, l }
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h = 0
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6
  else if (max === g) h = ((b - r) / d + 2) / 6
  else h = ((r - g) / d + 4) / 6
  return { h, s, l }
}

function hslToHex(h: number, s: number, l: number): string {
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1; if (t > 1) t -= 1
    if (t < 1 / 6) return p + (q - p) * 6 * t
    if (t < 1 / 2) return q
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
    return p
  }
  if (s === 0) {
    const v = Math.round(l * 255)
    return `#${v.toString(16).padStart(2, "0").repeat(3)}`
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s
  const p = 2 * l - q
  const r = Math.round(hue2rgb(p, q, h + 1 / 3) * 255)
  const g = Math.round(hue2rgb(p, q, h) * 255)
  const b = Math.round(hue2rgb(p, q, h - 1 / 3) * 255)
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

// ── Extension color map ──

const EXTENSION_COLORS: Record<string, string> = {
  ".ts": "#3178c6", ".tsx": "#61dafb", ".js": "#f7df1e", ".jsx": "#61dafb",
  ".py": "#3572a5", ".css": "#264de4", ".scss": "#cd6799", ".html": "#e34c26",
  ".json": "#a0a0a0", ".md": "#083fa1", ".yaml": "#cb171e", ".yml": "#cb171e",
  ".toml": "#9c4221", ".rs": "#dea584", ".go": "#00add8", ".java": "#b07219",
  ".rb": "#cc342d", ".vue": "#42b883", ".svelte": "#ff3e00",
}

function getFileExtension(path: string): string {
  const lastDot = path.lastIndexOf(".")
  if (lastDot === -1) return ".other"
  return path.slice(lastDot).toLowerCase()
}

// ── Public helpers ─────────────────────────────────────────────────────────

export function computeDistricts(files: ParsedFile[], mode: LayoutMode = "folder"): DistrictData[] {
  if (mode === "extension") return computeDistrictsByExtension(files)
  if (mode === "semantic") return computeDistrictsByCoupling(files)
  return computeDistrictsByFolder(files)
}

/**
 * Group files by their TOP-LEVEL directory.
 * Each top-level dir = one district with its own color.
 */
function computeDistrictsByFolder(files: ParsedFile[]): DistrictData[] {
  const districtMap = new Map<string, string[]>()
  for (const file of files) {
    const segments = file.path.split("/")
    const districtName = segments.length > 1 ? segments[0] : "root"
    if (!districtMap.has(districtName)) districtMap.set(districtName, [])
    districtMap.get(districtName)!.push(file.path)
  }
  const sortedEntries = Array.from(districtMap.entries()).sort((a, b) => b[1].length - a[1].length)
  return sortedEntries.map(([name, filePaths], index) => ({
    name,
    color: DISTRICT_COLORS[index % DISTRICT_COLORS.length],
    files: filePaths,
    bounds: { x: 0, z: 0, width: 0, depth: 0 },
  }))
}

function computeDistrictsByExtension(files: ParsedFile[]): DistrictData[] {
  const extMap = new Map<string, string[]>()
  for (const file of files) {
    const ext = getFileExtension(file.path)
    if (!extMap.has(ext)) extMap.set(ext, [])
    extMap.get(ext)!.push(file.path)
  }
  const sorted = Array.from(extMap.entries()).sort((a, b) => b[1].length - a[1].length)
  return sorted.map(([ext, filePaths], index) => ({
    name: ext,
    color: EXTENSION_COLORS[ext] ?? DISTRICT_COLORS[index % DISTRICT_COLORS.length],
    files: filePaths,
    bounds: { x: 0, z: 0, width: 0, depth: 0 },
  }))
}

function computeDistrictsByCoupling(files: ParsedFile[]): DistrictData[] {
  const pathSet = new Set(files.map((f) => f.path))
  const adj = new Map<string, Set<string>>()
  for (const f of files) {
    if (!adj.has(f.path)) adj.set(f.path, new Set())
    for (const imp of f.imports) {
      if (pathSet.has(imp)) {
        adj.get(f.path)!.add(imp)
        if (!adj.has(imp)) adj.set(imp, new Set())
        adj.get(imp)!.add(f.path)
      }
    }
  }
  const visited = new Set<string>()
  const clusters: string[][] = []
  for (const f of files) {
    if (visited.has(f.path)) continue
    const cluster: string[] = []
    const stack = [f.path]
    while (stack.length > 0) {
      const current = stack.pop()!
      if (visited.has(current)) continue
      visited.add(current)
      cluster.push(current)
      const neighbors = adj.get(current)
      if (neighbors) for (const n of neighbors) if (!visited.has(n)) stack.push(n)
    }
    clusters.push(cluster)
  }
  const MAX_CLUSTER = 40
  const finalClusters: string[][] = []
  for (const cluster of clusters) {
    if (cluster.length <= MAX_CLUSTER) {
      finalClusters.push(cluster)
    } else {
      const subGroups = new Map<string, string[]>()
      for (const path of cluster) {
        const segments = path.split("/")
        const key = segments.length > 2 ? segments.slice(0, 2).join("/") : segments[0] ?? "root"
        if (!subGroups.has(key)) subGroups.set(key, [])
        subGroups.get(key)!.push(path)
      }
      for (const [, paths] of subGroups) finalClusters.push(paths)
    }
  }
  finalClusters.sort((a, b) => b.length - a.length)
  const usedNames = new Map<string, number>()
  return finalClusters.map((paths, index) => {
    let baseName = findCommonPrefix(paths) || `cluster-${index + 1}`
    const count = usedNames.get(baseName) ?? 0
    usedNames.set(baseName, count + 1)
    const name = count > 0 ? `${baseName} (${count + 1})` : baseName
    return {
      name,
      color: DISTRICT_COLORS[index % DISTRICT_COLORS.length],
      files: paths,
      bounds: { x: 0, z: 0, width: 0, depth: 0 },
    }
  })
}

function findCommonPrefix(paths: string[]): string {
  if (paths.length === 0) return ""
  if (paths.length === 1) {
    const segs = paths[0].split("/")
    return segs.length > 1 ? segs.slice(0, -1).join("/") : segs[0]
  }
  const first = paths[0].split("/")
  let depth = 0
  outer: for (let d = 0; d < first.length - 1; d++) {
    for (const p of paths) {
      const segs = p.split("/")
      if (segs.length <= d || segs[d] !== first[d]) break outer
    }
    depth = d + 1
  }
  return depth > 0 ? first.slice(0, depth).join("/") : first[0]
}

export function computeBuildingDimensions(file: ParsedFile | FileData): {
  height: number
  width: number
  depth: number
} {
  const height = clamp(file.lines / 60, 0.3, 12)
  const width = clamp(1.0 + file.functions.length * 0.12, 1.0, 2.2)
  return { height, width, depth: width }
}

// ── Internal layout types ────────────────────────────────────────────────

interface FilePosition {
  file: ParsedFile
  lx: number
  lz: number
  subFolder: string
}

interface BlockLayout {
  name: string
  positions: FilePosition[]
  halfW: number
  halfD: number
  children: BlockLayout[]
}

// ── Square grid layout for a list of files ───────────────────────────────

function layoutFilesInGrid(
  files: ParsedFile[],
  gap: number,
  subFolder: string
): BlockLayout {
  if (files.length === 0) {
    return { name: "", positions: [], halfW: 1, halfD: 1, children: [] }
  }
  const sorted = [...files].sort((a, b) => b.lines - a.lines)
  const cols = Math.max(1, Math.ceil(Math.sqrt(sorted.length)))
  const rows = Math.ceil(sorted.length / cols)

  // Compute column widths and row depths based on actual building sizes
  const colMaxW = new Array(cols).fill(0)
  const rowMaxD = new Array(rows).fill(0)
  for (let j = 0; j < sorted.length; j++) {
    const c = j % cols
    const r = Math.floor(j / cols)
    const dim = computeBuildingDimensions(sorted[j])
    colMaxW[c] = Math.max(colMaxW[c], dim.width)
    rowMaxD[r] = Math.max(rowMaxD[r], dim.depth)
  }

  // Compute offsets (cumulative, centered)
  const colX: number[] = []
  let cx = 0
  for (let c = 0; c < cols; c++) {
    const w = colMaxW[c] || 1.2
    if (c === 0) cx = 0
    else cx += (colMaxW[c - 1] || 1.2) / 2 + gap + w / 2
    colX.push(cx)
  }
  const rowZ: number[] = []
  let rz = 0
  for (let r = 0; r < rows; r++) {
    const d = rowMaxD[r] || 1.2
    if (r === 0) rz = 0
    else rz += (rowMaxD[r - 1] || 1.2) / 2 + gap + d / 2
    rowZ.push(rz)
  }
  // Center
  const midX = cols > 0 ? (colX[0] + colX[cols - 1]) / 2 : 0
  const midZ = rows > 0 ? (rowZ[0] + rowZ[rows - 1]) / 2 : 0

  const positions: FilePosition[] = []
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity
  for (let j = 0; j < sorted.length; j++) {
    const c = j % cols
    const r = Math.floor(j / cols)
    const lx = colX[c] - midX
    const lz = rowZ[r] - midZ
    const dim = computeBuildingDimensions(sorted[j])
    minX = Math.min(minX, lx - dim.width / 2)
    maxX = Math.max(maxX, lx + dim.width / 2)
    minZ = Math.min(minZ, lz - dim.depth / 2)
    maxZ = Math.max(maxZ, lz + dim.depth / 2)
    positions.push({ file: sorted[j], lx, lz, subFolder })
  }

  const pad = 0.1
  return {
    name: "",
    positions,
    halfW: maxX === -Infinity ? 1 : (maxX - minX) / 2 + pad,
    halfD: maxZ === -Infinity ? 1 : (maxZ - minZ) / 2 + pad,
    children: [],
  }
}

// ── Pack child blocks into a square grid ─────────────────────────────────

function packBlocksInGrid(blocks: BlockLayout[], gap: number): BlockLayout {
  if (blocks.length === 0) {
    return { name: "", positions: [], halfW: 1, halfD: 1, children: [] }
  }
  if (blocks.length === 1) {
    return blocks[0]
  }

  // Sort by area descending for better shelf packing
  const sorted = [...blocks].sort((a, b) => (b.halfW * b.halfD) - (a.halfW * a.halfD))

  // Calculate total area and target width for square layout
  let totalArea = 0
  for (const b of sorted) {
    totalArea += (b.halfW * 2 + gap) * (b.halfD * 2 + gap)
  }
  const targetWidth = Math.sqrt(totalArea) * 1.05

  // Shelf packing: place blocks in rows, new row when width exceeds target
  type ShelfItem = { block: BlockLayout; ox: number }
  type Shelf = { items: ShelfItem[]; width: number; maxHD: number }

  const shelves: Shelf[] = []
  let current: Shelf = { items: [], width: 0, maxHD: 0 }

  for (const block of sorted) {
    const bw = block.halfW * 2
    const newWidth = current.width + (current.items.length > 0 ? gap : 0) + bw

    if (current.items.length > 0 && newWidth > targetWidth) {
      shelves.push(current)
      current = { items: [], width: 0, maxHD: 0 }
    }

    const ox = current.width + (current.items.length > 0 ? gap : 0) + block.halfW
    current.items.push({ block, ox })
    current.width = ox + block.halfW
    current.maxHD = Math.max(current.maxHD, block.halfD)
  }
  if (current.items.length > 0) shelves.push(current)

  // Compute total depth
  let totalDepth = 0
  for (const shelf of shelves) totalDepth += shelf.maxHD * 2
  totalDepth += Math.max(0, shelves.length - 1) * gap

  // Place blocks centered
  const allPositions: FilePosition[] = []
  let bMinX = Infinity, bMaxX = -Infinity, bMinZ = Infinity, bMaxZ = -Infinity
  const offsetChildren: BlockLayout[] = []

  let oz = -totalDepth / 2

  for (const shelf of shelves) {
    const centerZ = oz + shelf.maxHD
    const shelfOffsetX = -shelf.width / 2

    for (const { block, ox } of shelf.items) {
      const worldX = shelfOffsetX + ox
      const worldZ = centerZ

      for (const pos of block.positions) {
        const wx = worldX + pos.lx
        const wz = worldZ + pos.lz
        const dim = computeBuildingDimensions(pos.file)
        bMinX = Math.min(bMinX, wx - dim.width / 2)
        bMaxX = Math.max(bMaxX, wx + dim.width / 2)
        bMinZ = Math.min(bMinZ, wz - dim.depth / 2)
        bMaxZ = Math.max(bMaxZ, wz + dim.depth / 2)
        allPositions.push({ ...pos, lx: wx, lz: wz })
      }

      offsetChildren.push({
        ...block,
        positions: block.positions.map(p => ({ ...p, lx: worldX + p.lx, lz: worldZ + p.lz })),
        children: offsetBlockChildren(block.children, worldX, worldZ),
      })
    }

    oz += shelf.maxHD * 2 + gap
  }

  const pad = 0.1
  return {
    name: "",
    positions: allPositions,
    halfW: bMinX === Infinity ? 1 : (bMaxX - bMinX) / 2 + pad,
    halfD: bMinZ === Infinity ? 1 : (bMaxZ - bMinZ) / 2 + pad,
    children: offsetChildren,
  }
}

function offsetBlockChildren(children: BlockLayout[], ox: number, oz: number): BlockLayout[] {
  return children.map(child => ({
    ...child,
    positions: child.positions.map(p => ({ ...p, lx: ox + p.lx, lz: oz + p.lz })),
    children: offsetBlockChildren(child.children, ox, oz),
  }))
}

// ── Bottom-up recursive layout ───────────────────────────────────────────
// 1. At each folder level, lay out direct files in a grid
// 2. Recursively lay out each subfolder
// 3. Treat file-grid + subfolder blocks as blocks, pack into a grid

function layoutRecursiveBottomUp(
  files: ParsedFile[],
  pathDepth: number,
  fileGap: number,
  blockGap: number,
  subFolder: string,
  maxDepth: number = 6
): BlockLayout {
  if (files.length === 0) {
    return { name: "", positions: [], halfW: 1, halfD: 1, children: [] }
  }

  // Separate direct files vs files in subdirectories
  const directFiles: ParsedFile[] = []
  const subdirGroups = new Map<string, ParsedFile[]>()

  for (const file of files) {
    const segments = file.path.split("/")
    if (segments.length <= pathDepth + 1) {
      directFiles.push(file)
    } else {
      const subdir = segments[pathDepth]
      if (!subdirGroups.has(subdir)) subdirGroups.set(subdir, [])
      subdirGroups.get(subdir)!.push(file)
    }
  }

  // If no subdirectories, just lay out files in a grid
  if (subdirGroups.size === 0) {
    return layoutFilesInGrid(directFiles, fileGap, subFolder)
  }

  // If only one subdir and no direct files, skip this level
  if (subdirGroups.size === 1 && directFiles.length === 0 && maxDepth > 0) {
    const [subdirName, subdirFiles] = Array.from(subdirGroups.entries())[0]
    const child = layoutRecursiveBottomUp(
      subdirFiles, pathDepth + 1, fileGap, blockGap,
      subFolder || subdirName, maxDepth - 1
    )
    child.name = subdirName
    return child
  }

  // Recursively lay out each subdirectory
  const childBlocks: BlockLayout[] = []
  const sortedSubdirs = Array.from(subdirGroups.entries()).sort((a, b) => b[1].length - a[1].length)

  for (const [subdirName, subdirFiles] of sortedSubdirs) {
    if (maxDepth <= 0) {
      // At max depth, lay out flat
      const block = layoutFilesInGrid(subdirFiles, fileGap, subFolder || subdirName)
      block.name = subdirName
      childBlocks.push(block)
    } else {
      const block = layoutRecursiveBottomUp(
        subdirFiles, pathDepth + 1, fileGap,
        Math.max(blockGap * 0.6, 0.15),
        subFolder || subdirName, maxDepth - 1
      )
      block.name = subdirName
      childBlocks.push(block)
    }
  }

  // If there are direct files, make a block for them too
  if (directFiles.length > 0) {
    const directBlock = layoutFilesInGrid(directFiles, fileGap, subFolder || "_files")
    directBlock.name = "_files"
    childBlocks.push(directBlock)
  }

  // Pack all child blocks into a square grid
  const packed = packBlocksInGrid(childBlocks, blockGap)
  packed.children = childBlocks.length > 0 ? packed.children : []
  return packed
}

// ── Semantic layout ──────────────────────────────────────────────────────

function layoutSemantic(files: ParsedFile[], gap: number): BlockLayout {
  if (files.length === 0) {
    return { name: "", positions: [], halfW: 1, halfD: 1, children: [] }
  }
  const pathToIdx = new Map<string, number>()
  files.forEach((f, i) => pathToIdx.set(f.path, i))
  const n = files.length
  const radius = Math.sqrt(n) * 3
  const posX = new Float64Array(n)
  const posZ = new Float64Array(n)
  for (let i = 0; i < n; i++) {
    const angle = (i / n) * Math.PI * 2
    const r = radius * (0.3 + 0.7 * Math.random())
    posX[i] = Math.cos(angle) * r
    posZ[i] = Math.sin(angle) * r
  }
  const iterations = Math.min(80, 20 + n * 0.5)
  const repulsion = 8
  const attraction = 0.15
  for (let iter = 0; iter < iterations; iter++) {
    const temp = 1 - iter / iterations
    const fx = new Float64Array(n)
    const fz = new Float64Array(n)
    if (n < 300) {
      for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
          const dx = posX[i] - posX[j]
          const dz = posZ[i] - posZ[j]
          const dist = Math.sqrt(dx * dx + dz * dz) + 0.1
          const force = repulsion / (dist * dist)
          const fxc = (dx / dist) * force
          const fzc = (dz / dist) * force
          fx[i] += fxc; fz[i] += fzc
          fx[j] -= fxc; fz[j] -= fzc
        }
      }
    } else {
      for (let i = 0; i < n; i++) {
        for (let j = Math.max(0, i - 20); j < Math.min(n, i + 20); j++) {
          if (i === j) continue
          const dx = posX[i] - posX[j]
          const dz = posZ[i] - posZ[j]
          const dist = Math.sqrt(dx * dx + dz * dz) + 0.1
          const force = repulsion / (dist * dist)
          fx[i] += (dx / dist) * force
          fz[i] += (dz / dist) * force
        }
      }
    }
    for (let i = 0; i < n; i++) {
      for (const imp of files[i].imports) {
        const j = pathToIdx.get(imp)
        if (j === undefined) continue
        const dx = posX[j] - posX[i]
        const dz = posZ[j] - posZ[i]
        const dist = Math.sqrt(dx * dx + dz * dz) + 0.1
        const force = attraction * dist
        fx[i] += (dx / dist) * force
        fz[i] += (dz / dist) * force
        fx[j] -= (dx / dist) * force * 0.5
        fz[j] -= (dz / dist) * force * 0.5
      }
    }
    const maxMove = 3 * temp + 0.5
    for (let i = 0; i < n; i++) {
      const len = Math.sqrt(fx[i] * fx[i] + fz[i] * fz[i]) + 0.001
      const scale = Math.min(maxMove, len) / len
      posX[i] += fx[i] * scale
      posZ[i] += fz[i] * scale
    }
  }
  const dims = files.map(computeBuildingDimensions)
  const minGap = gap * 0.8
  for (let pass = 0; pass < 5; pass++) {
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const dx = posX[i] - posX[j]
        const dz = posZ[i] - posZ[j]
        const dist = Math.sqrt(dx * dx + dz * dz) + 0.001
        const minDist = (dims[i].width + dims[j].width) / 2 + minGap
        if (dist < minDist) {
          const push = (minDist - dist) / 2
          const nx = dx / dist
          const nz = dz / dist
          posX[i] += nx * push; posZ[i] += nz * push
          posX[j] -= nx * push; posZ[j] -= nz * push
        }
      }
    }
  }
  let avgX = 0, avgZ = 0
  for (let i = 0; i < n; i++) { avgX += posX[i]; avgZ += posZ[i] }
  avgX /= n; avgZ /= n
  for (let i = 0; i < n; i++) { posX[i] -= avgX; posZ[i] -= avgZ }
  const positions: FilePosition[] = []
  let minBX = Infinity, maxBX = -Infinity, minBZ = Infinity, maxBZ = -Infinity
  for (let i = 0; i < n; i++) {
    const dim = dims[i]
    const folder = files[i].path.split("/")[0] ?? "_root"
    positions.push({ file: files[i], lx: posX[i], lz: posZ[i], subFolder: folder })
    minBX = Math.min(minBX, posX[i] - dim.width / 2)
    maxBX = Math.max(maxBX, posX[i] + dim.width / 2)
    minBZ = Math.min(minBZ, posZ[i] - dim.depth / 2)
    maxBZ = Math.max(maxBZ, posZ[i] + dim.depth / 2)
  }
  return {
    name: "",
    positions,
    halfW: maxBX === -Infinity ? 1 : (maxBX - minBX) / 2 + 1,
    halfD: maxBZ === -Infinity ? 1 : (maxBZ - minBZ) / 2 + 1,
    children: [],
  }
}

// ── Sub-district bounds computation ──────────────────────────────────────

function computeSubDistrictBounds(
  block: BlockLayout,
  baseColor: string,
  depth: number,
  maxSubDepth: number = 2
): SubDistrictData[] {
  if (block.children.length === 0 || depth >= maxSubDepth) return []

  const baseHSL = hexToHSL(baseColor)
  const subDistricts: SubDistrictData[] = []
  const n = block.children.length

  for (let ci = 0; ci < n; ci++) {
    const child = block.children[ci]
    if (child.name === "_files" && child.positions.length < 2) continue
    if (child.positions.length === 0) continue

    let sMinX = Infinity, sMaxX = -Infinity, sMinZ = Infinity, sMaxZ = -Infinity
    for (const pos of child.positions) {
      const dim = computeBuildingDimensions(pos.file)
      sMinX = Math.min(sMinX, pos.lx - dim.width / 2)
      sMaxX = Math.max(sMaxX, pos.lx + dim.width / 2)
      sMinZ = Math.min(sMinZ, pos.lz - dim.depth / 2)
      sMaxZ = Math.max(sMaxZ, pos.lz + dim.depth / 2)
    }
    if (sMinX === Infinity) continue

    const hueShift = n > 1 ? (ci / (n - 1)) * 0.15 - 0.075 : 0
    const lightnessShift = (ci % 2 === 0 ? 0.05 : -0.05)
    const sfColor = hslToHex(
      ((baseHSL.h + hueShift) % 1 + 1) % 1,
      clamp(baseHSL.s, 0.3, 1),
      clamp(baseHSL.l + lightnessShift, 0.25, 0.8)
    )

    const sPad = 0.15
    const subDistrict: SubDistrictData = {
      name: child.name,
      color: sfColor,
      bounds: {
        x: sMinX - sPad,
        z: sMinZ - sPad,
        width: sMaxX - sMinX + sPad * 2,
        depth: sMaxZ - sMinZ + sPad * 2,
      },
    }

    // Only add one more level of sub-districts
    if (child.children.length > 0 && depth + 1 < maxSubDepth) {
      const childSubs = computeSubDistrictBounds(child, sfColor, depth + 1, maxSubDepth)
      if (childSubs.length > 0) subDistrict.subDistricts = childSubs
    }

    subDistricts.push(subDistrict)
  }

  return subDistricts
}

// ── District packing ─────────────────────────────────────────────────────

interface LayoutSize {
  halfWidth: number
  halfDepth: number
}

function packDistrictsSquare(
  sizes: LayoutSize[],
  gap: number
): { cx: number; cz: number }[] {
  if (sizes.length === 0) return []
  if (sizes.length === 1) return [{ cx: 0, cz: 0 }]

  // Sort by area descending
  const indices = sizes.map((_, i) => i).sort((a, b) => {
    return (sizes[b].halfWidth * sizes[b].halfDepth) - (sizes[a].halfWidth * sizes[a].halfDepth)
  })

  // Calculate total area for target width (square layout)
  let totalArea = 0
  for (const idx of indices) {
    totalArea += (sizes[idx].halfWidth * 2 + gap) * (sizes[idx].halfDepth * 2 + gap)
  }
  const targetWidth = Math.sqrt(totalArea) * 1.05

  // Shelf packing: place districts in rows
  type ShelfItem = { idx: number; ox: number }
  type Shelf = { items: ShelfItem[]; width: number; maxHD: number }

  const shelves: Shelf[] = []
  let current: Shelf = { items: [], width: 0, maxHD: 0 }

  for (const idx of indices) {
    const bw = sizes[idx].halfWidth * 2
    const newWidth = current.width + (current.items.length > 0 ? gap : 0) + bw

    if (current.items.length > 0 && newWidth > targetWidth) {
      shelves.push(current)
      current = { items: [], width: 0, maxHD: 0 }
    }

    const ox = current.width + (current.items.length > 0 ? gap : 0) + sizes[idx].halfWidth
    current.items.push({ idx, ox })
    current.width = ox + sizes[idx].halfWidth
    current.maxHD = Math.max(current.maxHD, sizes[idx].halfDepth)
  }
  if (current.items.length > 0) shelves.push(current)

  // Compute total depth
  let totalDepth = 0
  for (const shelf of shelves) totalDepth += shelf.maxHD * 2
  totalDepth += Math.max(0, shelves.length - 1) * gap

  // Place districts centered
  const positions = new Array<{ cx: number; cz: number }>(sizes.length)
  let oz = -totalDepth / 2

  for (const shelf of shelves) {
    const centerZ = oz + shelf.maxHD
    const shelfOffsetX = -shelf.width / 2

    for (const { idx, ox } of shelf.items) {
      positions[idx] = { cx: shelfOffsetX + ox, cz: centerZ }
    }

    oz += shelf.maxHD * 2 + gap
  }

  return positions
}

// ── Main layout function ───────────────────────────────────────────────────

export function layoutCity(
  files: ParsedFile[],
  districts: DistrictData[],
  mode: LayoutMode = "folder"
): FileData[] {
  const FILE_GAP = 0.15
  const BLOCK_GAP = 0.3
  const DISTRICT_GAP = 0.8

  const filesByPath = new Map<string, ParsedFile>()
  for (const file of files) filesByPath.set(file.path, file)

  const importedByMap = new Map<string, string[]>()
  for (const file of files) {
    for (const imp of file.imports) {
      if (!importedByMap.has(imp)) importedByMap.set(imp, [])
      importedByMap.get(imp)!.push(file.path)
    }
  }

  // ── Pass 1: Layout within each district ──
  const districtLayouts: BlockLayout[] = []

  for (const district of districts) {
    const districtFiles = district.files
      .map((fp) => filesByPath.get(fp))
      .filter((f): f is ParsedFile => f !== undefined)

    if (districtFiles.length === 0) {
      districtLayouts.push({ name: district.name, positions: [], halfW: 1, halfD: 1, children: [] })
      continue
    }

    let block: BlockLayout
    switch (mode) {
      case "extension":
        block = layoutFilesInGrid(districtFiles, FILE_GAP, "")
        break
      case "semantic":
        block = layoutSemantic(districtFiles, FILE_GAP)
        break
      default:
        // folder & filetree: recursive bottom-up grid layout
        block = layoutRecursiveBottomUp(districtFiles, 1, FILE_GAP, BLOCK_GAP, "")
        break
    }

    block.name = district.name
    districtLayouts.push(block)
  }

  // ── Pass 2: Position districts in a square grid ──
  const districtSizes: LayoutSize[] = districtLayouts.map((l) => ({
    halfWidth: l.halfW,
    halfDepth: l.halfD,
  }))
  const districtPositions = packDistrictsSquare(districtSizes, DISTRICT_GAP)

  // ── Pass 3: Generate FileData with world positions ──
  const result: FileData[] = []

  for (let i = 0; i < districts.length; i++) {
    const district = districts[i]
    const layout = districtLayouts[i]
    const pos = districtPositions[i]
    if (!pos) continue

    const cx = pos.cx
    const cz = pos.cz

    for (const { file, lx, lz, subFolder } of layout.positions) {
      const importedBy = importedByMap.get(file.path) ?? []
      result.push({
        path: file.path,
        lines: file.lines,
        functions: file.functions,
        types: file.types,
        classes: file.classes,
        imports: file.imports,
        importedBy,
        externalImports: file.externalImports ?? [],
        decorators: file.decorators ?? [],
        complexity: file.complexity,
        isReactComponent: file.isReactComponent,
        hasUnusedExports: file.hasUnusedExports,
        fileType: file.fileType ?? "other",
        position: { x: cx + lx, z: cz + lz },
        district: district.name,
        subFolder: subFolder || "_root",
      })
    }

    // Compute district bounds from actual file positions
    const districtFilePositions = result.filter((f) => f.district === district.name)
    if (districtFilePositions.length > 0) {
      let bMinX = Infinity, bMaxX = -Infinity, bMinZ = Infinity, bMaxZ = -Infinity
      for (const f of districtFilePositions) {
        const dim = computeBuildingDimensions(f)
        bMinX = Math.min(bMinX, f.position.x - dim.width / 2)
        bMaxX = Math.max(bMaxX, f.position.x + dim.width / 2)
        bMinZ = Math.min(bMinZ, f.position.z - dim.depth / 2)
        bMaxZ = Math.max(bMaxZ, f.position.z + dim.depth / 2)
      }
      const pad = 0.25
      district.bounds = {
        x: bMinX - pad,
        z: bMinZ - pad,
        width: bMaxX - bMinX + pad * 2,
        depth: bMaxZ - bMinZ + pad * 2,
      }

      // Generate sub-district bounds (max 2 levels deep to avoid overlapping)
      if (layout.children.length > 0) {
        const subDistricts = computeSubDistrictBounds(layout, district.color, 0, 2)
        if (subDistricts.length > 0) {
          // Offset by district center
          for (const sd of subDistricts) {
            sd.bounds.x += cx
            sd.bounds.z += cz
            if (sd.subDistricts) offsetSubDistrictBounds(sd.subDistricts, cx, cz)
          }
          district.subDistricts = subDistricts
        }
      }
    }
  }

  return result
}

function offsetSubDistrictBounds(subs: SubDistrictData[], dx: number, dz: number) {
  for (const sd of subs) {
    sd.bounds.x += dx
    sd.bounds.z += dz
    if (sd.subDistricts) offsetSubDistrictBounds(sd.subDistricts, dx, dz)
  }
}

// ── Stats computation ──────────────────────────────────────────────────────

export function computeStats(files: FileData[]): CityStats {
  return {
    totalFiles: files.length,
    totalFunctions: files.reduce((sum, f) => sum + f.functions.length, 0),
    totalLines: files.reduce((sum, f) => sum + f.lines, 0),
    totalTypes: files.reduce((sum, f) => sum + f.types.length, 0),
    totalImports: files.reduce((sum, f) => sum + f.imports.length, 0),
    unusedExports: files.filter((f) => f.hasUnusedExports).length,
  }
}

// ── Client-side recompute ──────────────────────────────────────────────────

export function recomputeSnapshot(
  original: CitySnapshot,
  hiddenPaths: Set<string>,
  hiddenExtensions: Set<string>,
  getExtFn: (path: string) => string,
  isHiddenFn: (path: string, hidden: Set<string>) => boolean,
  layoutMode: LayoutMode = "folder"
): CitySnapshot {
  const visibleFiles = original.files.filter((f) => {
    if (isHiddenFn(f.path, hiddenPaths)) return false
    if (hiddenExtensions.size > 0 && hiddenExtensions.has(getExtFn(f.path))) return false
    return true
  })

  if (visibleFiles.length === 0) {
    return { files: [], districts: [], stats: computeStats([]) }
  }

  const visiblePaths = new Set(visibleFiles.map((f) => f.path))
  const parsedFiles: ParsedFile[] = visibleFiles.map((f) => ({
    path: f.path,
    lines: f.lines,
    functions: f.functions,
    types: f.types,
    classes: f.classes,
    imports: f.imports.filter((imp) => visiblePaths.has(imp)),
    externalImports: f.externalImports,
    decorators: f.decorators,
    complexity: f.complexity,
    isReactComponent: f.isReactComponent,
    hasUnusedExports: f.hasUnusedExports,
    fileType: f.fileType,
  }))

  const districts = computeDistricts(parsedFiles, layoutMode)
  const newFiles = layoutCity(parsedFiles, districts, layoutMode)
  const stats = computeStats(newFiles)
  return { files: newFiles, districts, stats }
}
