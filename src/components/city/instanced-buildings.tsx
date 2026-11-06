"use client"

import { useRef, useMemo, useEffect, useCallback, useLayoutEffect, useState } from "react"
import { useFrame, type ThreeEvent } from "@react-three/fiber"
import * as THREE from "three"
import type { CitySnapshot } from "@/lib/types/city"
import { useCityStore, isPathHidden } from "./use-city-store"
import { getExtension } from "./extension-filter"
import { getBuildingColor, clamp, easeOutQuint } from "@/lib/visualization/color-utils"
import { getBuildingHeight } from "@/lib/visualization/building-dimensions"
import { createBuildingDepthMaterial, createBuildingGeometry, createBuildingMaterial } from "./building-material"

interface InstancedBuildingsProps {
  snapshot: CitySnapshot
  onLoadProgress?: (progress: BuildingLoadProgress | null) => void
}

export interface BuildingLoadProgress {
  loadedChunks: number
  totalChunks: number
  loadedFiles: number
  totalFiles: number
  loadedDistricts: string[]
  loadedGroundDistricts: string[]
  complete: boolean
}

const CLICK_THRESHOLD_PX = 6
const PODIUM_HEIGHT = 0.3
const DIMMED_LIGHT = 0.12
const SELECTED_LIGHT = 1.25
const PROGRESSIVE_THRESHOLD = 1200
const LARGE_CITY_THRESHOLD = 15000
const LARGE_CITY_CHUNK_SIZE = 650
const SMALL_CITY_CHUNK_SIZE = 800
const CHUNK_LOAD_DELAY_MS = 45
const MOVEMENT_IDLE_MS = 220
const MOVING_CHUNK_DELAY_MS = 650
const snapshotLoadProgress = new Map<string, number>()

function getTopFolder(path: string): string {
  const slashIndex = path.indexOf("/")
  if (slashIndex === -1) return "_root"
  return path.slice(0, slashIndex)
}

function buildFolderChunks(files: CitySnapshot["files"]): number[][] {
  const folderMap = new Map<string, number[]>()

  files.forEach((file, index) => {
    const folder = getTopFolder(file.path)
    const indices = folderMap.get(folder)
    if (indices) {
      indices.push(index)
    } else {
      folderMap.set(folder, [index])
    }
  })

  const maxChunkSize = files.length > LARGE_CITY_THRESHOLD ? LARGE_CITY_CHUNK_SIZE : SMALL_CITY_CHUNK_SIZE
  const chunks: number[][] = []

  Array.from(folderMap.entries())
    .sort(([a], [b]) => {
      if (a === "_root") return -1
      if (b === "_root") return 1
      return a.localeCompare(b)
    })
    .forEach(([, indices]) => {
      for (let start = 0; start < indices.length; start += maxChunkSize) {
        chunks.push(indices.slice(start, start + maxChunkSize))
      }
    })

  return chunks
}

function getSnapshotLoadKey(snapshot: CitySnapshot): string {
  const firstPath = snapshot.files[0]?.path ?? ""
  const lastPath = snapshot.files.at(-1)?.path ?? ""
  return `${snapshot.files.length}:${snapshot.stats.totalLines}:${firstPath}:${lastPath}`
}

export function InstancedBuildings({ snapshot, onLoadProgress }: InstancedBuildingsProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const platformRef = useRef<THREE.InstancedMesh>(null)
  const antennaCylRef = useRef<THREE.InstancedMesh>(null)
  const antennaTipRef = useRef<THREE.InstancedMesh>(null)
  const domeRef = useRef<THREE.InstancedMesh>(null)
  const typeRingRef = useRef<THREE.InstancedMesh>(null)

  // Track pointer for click vs drag detection
  const pointerDownPos = useRef<{ x: number; y: number; instanceId: number | undefined } | null>(null)
  const lastMovementAtRef = useRef(0)
  const lastChunkLoadedAtRef = useRef(0)

  const count = snapshot.files.length
  const shouldLoadProgressively = count > PROGRESSIVE_THRESHOLD
  const loadKey = useMemo(() => getSnapshotLoadKey(snapshot), [snapshot])
  const folderChunks = useMemo(() => buildFolderChunks(snapshot.files), [snapshot.files])
  const firstChunkCount = shouldLoadProgressively ? Math.min(2, folderChunks.length) : folderChunks.length
  const initialChunkCount = shouldLoadProgressively
    ? Math.max(firstChunkCount, snapshotLoadProgress.get(loadKey) ?? firstChunkCount)
    : folderChunks.length
  const [loadedChunkCount, setLoadedChunkCount] = useState(initialChunkCount)
  const loadedFileIndices = useMemo(() => {
    if (!shouldLoadProgressively) return snapshot.files.map((_, index) => index)

    const indices: number[] = []
    for (let i = 0; i < Math.min(loadedChunkCount, folderChunks.length); i++) {
      indices.push(...folderChunks[i])
    }
    return indices
  }, [folderChunks, loadedChunkCount, shouldLoadProgressively])
  const loadedIndices = useMemo(() => new Set(loadedFileIndices), [loadedFileIndices])
  const fileIndexToInstanceIndex = useMemo(() => {
    const map = new Map<number, number>()
    loadedFileIndices.forEach((fileIndex, instanceIndex) => map.set(fileIndex, instanceIndex))
    return map
  }, [loadedFileIndices])
  const loadedFileCount = loadedFileIndices.length
  const fileIndexByPath = useMemo(() => {
    const map = new Map<string, number>()
    snapshot.files.forEach((file, index) => map.set(file.path, index))
    return map
  }, [snapshot.files])
  const loadedDistricts = useMemo(() => {
    const districts = new Set<string>()
    loadedIndices.forEach((index) => {
      const file = snapshot.files[index]
      if (file) districts.add(file.district)
    })
    return Array.from(districts)
  }, [loadedIndices, snapshot.files])
  const loadedGroundDistricts = useMemo(() => {
    const loaded = new Set<string>()
    for (const district of snapshot.districts) {
      if (district.files.length === 0) continue
      const isFullyLoaded = district.files.every((path) => {
        const index = fileIndexByPath.get(path) ?? -1
        return index >= 0 && loadedIndices.has(index)
      })
      if (isFullyLoaded) loaded.add(district.name)
    }
    return Array.from(loaded)
  }, [fileIndexByPath, loadedIndices, snapshot.districts])

  // Facade material + geometry (per-instance aLit = window light level)
  const buildingMaterial = useMemo(() => createBuildingMaterial(), [])
  const buildingDepthMaterial = useMemo(() => createBuildingDepthMaterial(), [])
  useEffect(() => () => buildingDepthMaterial.dispose(), [buildingDepthMaterial])
  const buildingGeometry = useMemo(() => createBuildingGeometry(count), [count])
  useEffect(() => () => buildingMaterial.dispose(), [buildingMaterial])
  useEffect(() => () => buildingGeometry.dispose(), [buildingGeometry])

  // PERF: Reusable Object3D for matrix computation — avoids per-frame heap allocation
  const _dummy = useRef(new THREE.Object3D())

  const growStartTime = useRef<number | null>(null)
  const growComplete = useRef(false)
  const GROW_DURATION = Math.min(3.0, 1.2 + count * 0.003)
  const GROW_STAGGER = Math.min(1.0, 0.3 + count * 0.002)
  const enableGrowAnimation = count <= PROGRESSIVE_THRESHOLD

  const selectedFile = useCityStore((s) => s.selectedFile)
  const selectedIndex = useCityStore((s) => s.selectedIndex)
  const hoveredIndex = useCityStore((s) => s.hoveredIndex)
  const visualizationMode = useCityStore((s) => s.visualizationMode)
  const searchQuery = useCityStore((s) => s.searchQuery)
  const hiddenExtensions = useCityStore((s) => s.hiddenExtensions)
  const hiddenPaths = useCityStore((s) => s.hiddenPaths)
  const selectFile = useCityStore((s) => s.selectFile)
  const hoverFile = useCityStore((s) => s.hoverFile)

  const districtColorMap = useMemo(() => {
    const map = new Map<string, string>()
    for (const d of snapshot.districts) map.set(d.name, d.color)
    return map
  }, [snapshot.districts])

  useEffect(() => {
    if (!shouldLoadProgressively) return

    const markMovement = () => {
      lastMovementAtRef.current = performance.now()
    }

    function handleKeyDown(e: KeyboardEvent) {
      const key = e.key.toLowerCase()
      if (["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(key)) {
        markMovement()
      }
    }

    window.addEventListener("wheel", markMovement, { passive: true })
    window.addEventListener("pointerdown", markMovement, { passive: true })
    window.addEventListener("pointermove", markMovement, { passive: true })
    window.addEventListener("keydown", handleKeyDown)

    return () => {
      window.removeEventListener("wheel", markMovement)
      window.removeEventListener("pointerdown", markMovement)
      window.removeEventListener("pointermove", markMovement)
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [shouldLoadProgressively])

  useEffect(() => {
    const cachedChunkCount = snapshotLoadProgress.get(loadKey) ?? firstChunkCount
    const startChunkCount = shouldLoadProgressively
      ? Math.max(firstChunkCount, Math.min(cachedChunkCount, folderChunks.length))
      : folderChunks.length

    setLoadedChunkCount(startChunkCount)
    growStartTime.current = null
    growComplete.current = !enableGrowAnimation

    let cancelled = false
    let timeoutId: ReturnType<typeof setTimeout> | null = null
    let nextChunkCount = startChunkCount
    lastChunkLoadedAtRef.current = performance.now()

    function scheduleNextChunk(delay = CHUNK_LOAD_DELAY_MS) {
      timeoutId = setTimeout(loadNextChunk, delay)
    }

    function loadNextChunk() {
      if (cancelled) return
      const now = performance.now()
      const idleFor = now - lastMovementAtRef.current
      const isMoving = idleFor < MOVEMENT_IDLE_MS
      if (isMoving && now - lastChunkLoadedAtRef.current < MOVING_CHUNK_DELAY_MS) {
        scheduleNextChunk(MOVING_CHUNK_DELAY_MS - (now - lastChunkLoadedAtRef.current))
        return
      }

      nextChunkCount = Math.min(nextChunkCount + 1, folderChunks.length)
      lastChunkLoadedAtRef.current = now
      snapshotLoadProgress.set(loadKey, nextChunkCount)
      setLoadedChunkCount(nextChunkCount)
      if (nextChunkCount < folderChunks.length) {
        scheduleNextChunk()
      }
    }

    snapshotLoadProgress.set(loadKey, startChunkCount)

    if (shouldLoadProgressively && startChunkCount < folderChunks.length) {
      scheduleNextChunk()
    }

    return () => {
      cancelled = true
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [enableGrowAnimation, firstChunkCount, folderChunks.length, loadKey, shouldLoadProgressively, snapshot.files])

  useEffect(() => {
    if (!onLoadProgress) return

    if (!shouldLoadProgressively) {
      onLoadProgress(null)
      return
    }

    onLoadProgress({
      loadedChunks: loadedChunkCount,
      totalChunks: folderChunks.length,
      loadedFiles: loadedFileCount,
      totalFiles: count,
      loadedDistricts,
      loadedGroundDistricts,
      complete: loadedChunkCount >= folderChunks.length,
    })
  }, [count, folderChunks.length, loadedChunkCount, loadedDistricts, loadedFileCount, loadedGroundDistricts, onLoadProgress, shouldLoadProgressively])

  // Build a map from (districtName::subFolderName) → sub-district color
  // so buildings match their sub-district ground color exactly
  const subDistrictColorMap = useMemo(() => {
    const map = new Map<string, string>()
    function walk(subs: import("@/lib/types/city").SubDistrictData[], districtName: string) {
      for (const sub of subs) {
        map.set(`${districtName}::${sub.name}`, sub.color)
        if (sub.subDistricts) walk(sub.subDistricts, districtName)
      }
    }
    for (const d of snapshot.districts) {
      if (d.subDistricts) walk(d.subDistricts, d.name)
    }
    return map
  }, [snapshot.districts])

  const getBuildingBaseColor = useCallback(
    (file: CitySnapshot["files"][number]) => {
      const sf = file.subFolder ?? "_root"
      return subDistrictColorMap.get(`${file.district}::${sf}`) ?? districtColorMap.get(file.district) ?? "#888888"
    },
    [districtColorMap, subDistrictColorMap]
  )

  const growDelays = useMemo(() => {
    if (!enableGrowAnimation) return []
    const districtNames = snapshot.districts.map((d) => d.name)
    return snapshot.files.map((file) => {
      const distIdx = districtNames.indexOf(file.district)
      return (distIdx / Math.max(1, districtNames.length - 1)) * GROW_STAGGER
    })
  }, [enableGrowAnimation, snapshot.files, snapshot.districts])

  const getDimensions = useCallback(
    (f: CitySnapshot["files"][number]) => {
      const height = getBuildingHeight(f)
      const width = clamp(1.0 + f.functions.length * 0.12, 1.0, 2.2)
      return { height, width, depth: width }
    },
    []
  )

  // LOD gating: skip expensive decorations for very large codebases
  const enableDecorations = count < 1500

  const decorationData = useMemo(() => {
    if (!enableDecorations) return { platforms: [], antennas: [], domes: [], typeRings: [] }

    const platforms: number[] = []
    const antennas: number[] = []
    const domes: number[] = []
    const typeRings: number[] = []

    for (let i = 0; i < count; i++) {
      const file = snapshot.files[i]
      if (file.lines > 200) platforms.push(i)
      if (file.complexity > 20) antennas.push(i)
      if (file.isReactComponent) domes.push(i)
      if (file.types.length > 3) typeRings.push(i)
    }

    return { platforms, antennas, domes, typeRings }
  }, [snapshot.files, count, enableDecorations])

  const visibleMask = useMemo(() => {
    const hasSearch = !!searchQuery
    const hasExtFilter = hiddenExtensions.size > 0
    const hasPathFilter = hiddenPaths.size > 0
    if (!hasSearch && !hasExtFilter && !hasPathFilter) return null

    const q = searchQuery.toLowerCase()
    return snapshot.files.map((f) => {
      if (hasPathFilter && isPathHidden(f.path, hiddenPaths)) return false
      if (hasExtFilter && hiddenExtensions.has(getExtension(f.path))) return false
      if (hasSearch) {
        if (f.path.toLowerCase().includes(q)) return true
        if (f.functions.some((fn) => fn.name.toLowerCase().includes(q))) return true
        if (f.types.some((t) => t.name.toLowerCase().includes(q))) return true
        return false
      }
      return true
    })
  }, [searchQuery, hiddenExtensions, hiddenPaths, snapshot.files])

  const relatedFiles = useMemo(() => {
    if (!selectedFile) return null
    const file = snapshot.files.find((f) => f.path === selectedFile)
    if (!file) return null
    const related = new Set<string>([selectedFile])
    file.imports.forEach((imp) => related.add(imp))
    file.importedBy.forEach((dep) => related.add(dep))
    return related
  }, [selectedFile, snapshot.files])

  // Escape / Tab keyboard
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.target as HTMLElement).tagName === "INPUT") return

      if (e.key === "Escape" && selectedFile) {
        selectFile(null, null)
        return
      }

      if (e.key === "Tab" && selectedFile) {
        e.preventDefault()
        const currentFile = snapshot.files.find((f) => f.path === selectedFile)
        if (!currentFile) return

        const districtFiles = snapshot.files
          .map((f, i) => ({ file: f, index: i }))
          .filter(({ file, index }) => {
            if (file.district !== currentFile.district) return false
            if (visibleMask && !visibleMask[index]) return false
            return true
          })

        if (districtFiles.length <= 1) return

        const currentIdx = districtFiles.findIndex((d) => d.file.path === selectedFile)
        const direction = e.shiftKey ? -1 : 1
        const nextIdx = (currentIdx + direction + districtFiles.length) % districtFiles.length
        const next = districtFiles[nextIdx]
        selectFile(next.file.path, next.index)
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [selectedFile, selectFile, snapshot.files, visibleMask])

  // Update instance matrices and colors
  useLayoutEffect(() => {
    if (!meshRef.current) return

    const dummy = new THREE.Object3D()
    const _color = new THREE.Color()
    meshRef.current.count = loadedFileIndices.length
    const litAttr = buildingGeometry.getAttribute("aLit") as THREE.InstancedBufferAttribute

    for (let instanceIndex = 0; instanceIndex < loadedFileIndices.length; instanceIndex++) {
      const i = loadedFileIndices[instanceIndex]
      const file = snapshot.files[i]
      const dim = getDimensions(file)

      if (visibleMask && !visibleMask[i]) {
        dummy.position.set(0, -1000, 0)
        dummy.scale.set(0, 0, 0)
      } else {
        dummy.position.set(file.position.x, dim.height / 2, file.position.z)
        dummy.scale.set(dim.width, dim.height, dim.depth)
      }

      dummy.updateMatrix()
      meshRef.current.setMatrixAt(instanceIndex, dummy.matrix)

      const buildingColor = getBuildingBaseColor(file)
      const isDimmed = !!(relatedFiles && !relatedFiles.has(file.path))
      getBuildingColor(file, visualizationMode, buildingColor, isDimmed, _color)
      meshRef.current.setColorAt(instanceIndex, _color)
      // Window lights: off for unrelated buildings, brighter for the selection
      litAttr.setX(instanceIndex, isDimmed ? DIMMED_LIGHT : file.path === selectedFile ? SELECTED_LIGHT : 1)
    }
    litAttr.needsUpdate = true

    meshRef.current.instanceMatrix.needsUpdate = true
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true

    // Update platforms
    if (platformRef.current) {
      for (let pi = 0; pi < decorationData.platforms.length; pi++) {
        const i = decorationData.platforms[pi]
        const file = snapshot.files[i]
        const dim = getDimensions(file)
        const buildingColor = getBuildingBaseColor(file)

        if ((loadedIndices && !loadedIndices.has(i)) || (visibleMask && !visibleMask[i])) {
          dummy.position.set(0, -1000, 0)
          dummy.scale.set(0, 0, 0)
        } else {
          dummy.position.set(file.position.x, PODIUM_HEIGHT / 2, file.position.z)
          dummy.scale.set(dim.width + 0.5, PODIUM_HEIGHT, dim.depth + 0.5)
        }

        dummy.updateMatrix()
        platformRef.current.setMatrixAt(pi, dummy.matrix)
        // Podium follows the active color mode, a shade darker than the tower
        getBuildingColor(file, visualizationMode, buildingColor, !!(relatedFiles && !relatedFiles.has(file.path)), _color)
        _color.multiplyScalar(0.5)
        platformRef.current.setColorAt(pi, _color)
      }
      platformRef.current.instanceMatrix.needsUpdate = true
      if (platformRef.current.instanceColor) platformRef.current.instanceColor.needsUpdate = true
    }

    // Update antennas
    if (antennaCylRef.current && antennaTipRef.current) {
      for (let ai = 0; ai < decorationData.antennas.length; ai++) {
        const i = decorationData.antennas[ai]
        const file = snapshot.files[i]
        const dim = getDimensions(file)

        if ((loadedIndices && !loadedIndices.has(i)) || (visibleMask && !visibleMask[i])) {
          dummy.position.set(0, -1000, 0)
          dummy.scale.set(0, 0, 0)
        } else {
          dummy.position.set(file.position.x, dim.height + 0.6, file.position.z)
          dummy.scale.set(1, 1, 1)
        }
        dummy.updateMatrix()
        antennaCylRef.current.setMatrixAt(ai, dummy.matrix)

        if ((loadedIndices && !loadedIndices.has(i)) || (visibleMask && !visibleMask[i])) {
          dummy.position.set(0, -1000, 0)
        } else {
          dummy.position.set(file.position.x, dim.height + 1.2, file.position.z)
        }
        dummy.updateMatrix()
        antennaTipRef.current.setMatrixAt(ai, dummy.matrix)
      }
      antennaCylRef.current.instanceMatrix.needsUpdate = true
      antennaTipRef.current.instanceMatrix.needsUpdate = true
    }

    // Update domes
    if (domeRef.current) {
      for (let di = 0; di < decorationData.domes.length; di++) {
        const i = decorationData.domes[di]
        const file = snapshot.files[i]
        const dim = getDimensions(file)

        if ((loadedIndices && !loadedIndices.has(i)) || (visibleMask && !visibleMask[i])) {
          dummy.position.set(0, -1000, 0)
          dummy.scale.set(0, 0, 0)
        } else {
          dummy.position.set(file.position.x, dim.height, file.position.z)
          dummy.scale.set(1, 1, 1)
          dummy.rotation.set(-Math.PI / 2, 0, 0)
        }
        dummy.updateMatrix()
        domeRef.current.setMatrixAt(di, dummy.matrix)
        dummy.rotation.set(0, 0, 0)
      }
      domeRef.current.instanceMatrix.needsUpdate = true
    }

    // Update type rings
    if (typeRingRef.current) {
      for (let ti = 0; ti < decorationData.typeRings.length; ti++) {
        const i = decorationData.typeRings[ti]
        const file = snapshot.files[i]
        const dim = getDimensions(file)

        if ((loadedIndices && !loadedIndices.has(i)) || (visibleMask && !visibleMask[i])) {
          dummy.position.set(0, -1000, 0)
          dummy.scale.set(0, 0, 0)
        } else {
          const ringScale = (Math.min(dim.width, dim.depth) * 0.34) / 0.85
          dummy.position.set(file.position.x, dim.height + 0.02, file.position.z)
          dummy.scale.set(ringScale, ringScale, ringScale * 0.5)
          dummy.rotation.set(-Math.PI / 2, 0, 0)
        }
        dummy.updateMatrix()
        typeRingRef.current.setMatrixAt(ti, dummy.matrix)
        dummy.rotation.set(0, 0, 0)
      }
      typeRingRef.current.instanceMatrix.needsUpdate = true
    }
  }, [snapshot.files, districtColorMap, getBuildingBaseColor, getDimensions, visualizationMode, visibleMask, decorationData, relatedFiles, loadedIndices, loadedFileIndices, buildingGeometry, selectedFile])

  // Track previous selected/hovered indices for smooth scale reset
  const prevSelectedIndex = useRef<number | null>(null)
  const prevHoveredIndex = useRef<number | null>(null)

  // Animate: grow-in + selection/hover
  useFrame(({ clock }) => {
    if (!meshRef.current) return
    const t = clock.getElapsedTime()
    const dummy = _dummy.current

    if (!enableGrowAnimation && !growComplete.current) {
      growComplete.current = true
    }

    if (enableGrowAnimation && !growComplete.current) {
      if (growStartTime.current === null) growStartTime.current = t

      const elapsed = t - growStartTime.current
      let allDone = true

      for (const i of loadedFileIndices) {
        if (visibleMask && !visibleMask[i]) continue

        const file = snapshot.files[i]
        const dim = getDimensions(file)
        const delay = growDelays[i]
        const localT = Math.max(0, elapsed - delay) / GROW_DURATION
        const progress = Math.min(1, easeOutQuint(localT))

        if (progress < 1) allDone = false

        const scaledHeight = dim.height * progress
        dummy.position.set(file.position.x, scaledHeight / 2, file.position.z)
        dummy.scale.set(dim.width, Math.max(0.01, scaledHeight), dim.depth)
        dummy.updateMatrix()
        const instanceIndex = fileIndexToInstanceIndex.get(i)
        if (instanceIndex !== undefined) meshRef.current!.setMatrixAt(instanceIndex, dummy.matrix)
      }

      meshRef.current.instanceMatrix.needsUpdate = true
      if (allDone) growComplete.current = true
      return
    }

    // Reset scale for previously selected/hovered buildings that are no longer active
    let needsUpdate = false
    const prevSel = prevSelectedIndex.current
    const prevHov = prevHoveredIndex.current

    if (prevSel !== null && prevSel !== selectedIndex && prevSel !== hoveredIndex) {
      const file = snapshot.files[prevSel]
      const dim = file ? getDimensions(file) : undefined
      const instanceIndex = fileIndexToInstanceIndex.get(prevSel)
      if (file && dim && instanceIndex !== undefined && !(visibleMask && !visibleMask[prevSel])) {
        dummy.position.set(file.position.x, dim.height / 2, file.position.z)
        dummy.scale.set(dim.width, dim.height, dim.depth)
        dummy.updateMatrix()
        meshRef.current.setMatrixAt(instanceIndex, dummy.matrix)
        needsUpdate = true
      }
    }

    if (prevHov !== null && prevHov !== hoveredIndex && prevHov !== selectedIndex && prevHov !== prevSel) {
      const file = snapshot.files[prevHov]
      const dim = file ? getDimensions(file) : undefined
      const instanceIndex = fileIndexToInstanceIndex.get(prevHov)
      if (file && dim && instanceIndex !== undefined && !(visibleMask && !visibleMask[prevHov])) {
        dummy.position.set(file.position.x, dim.height / 2, file.position.z)
        dummy.scale.set(dim.width, dim.height, dim.depth)
        dummy.updateMatrix()
        meshRef.current.setMatrixAt(instanceIndex, dummy.matrix)
        needsUpdate = true
      }
    }

    prevSelectedIndex.current = selectedIndex
    prevHoveredIndex.current = hoveredIndex

    if (selectedIndex !== null || hoveredIndex !== null) {
      for (const i of loadedFileIndices) {
        if (visibleMask && !visibleMask[i]) continue

        const isSelected = i === selectedIndex
        const isHovered = i === hoveredIndex

        if (!isSelected && !isHovered) continue

        const file = snapshot.files[i]
        const dim = getDimensions(file)

        let scale = 1
        if (isSelected) {
          scale = 1.12 + Math.sin(t * 2) * 0.015
        } else if (isHovered) {
          scale = 1.06
        }

        dummy.position.set(file.position.x, dim.height / 2, file.position.z)
        dummy.scale.set(dim.width * scale, dim.height * scale, dim.depth * scale)
        dummy.updateMatrix()
        const instanceIndex = fileIndexToInstanceIndex.get(i)
        if (instanceIndex !== undefined) {
          meshRef.current!.setMatrixAt(instanceIndex, dummy.matrix)
          needsUpdate = true
        }
      }
    }

    if (needsUpdate) {
      meshRef.current.instanceMatrix.needsUpdate = true
    }
  })

  // Pointer events with click vs drag detection
  const handlePointerDown = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation()
      pointerDownPos.current = {
        x: e.nativeEvent.clientX,
        y: e.nativeEvent.clientY,
        instanceId: e.instanceId,
      }
    },
    []
  )

  const handlePointerUp = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation()
      if (!pointerDownPos.current) return

      const dx = e.nativeEvent.clientX - pointerDownPos.current.x
      const dy = e.nativeEvent.clientY - pointerDownPos.current.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      const instanceId = pointerDownPos.current.instanceId
      pointerDownPos.current = null

      // Only treat as click if pointer didn't move much (not a drag/pan)
      if (dist < CLICK_THRESHOLD_PX && instanceId !== undefined && instanceId < loadedFileIndices.length) {
        const fileIndex = loadedFileIndices[instanceId]
        if (visibleMask && !visibleMask[fileIndex]) return
        const file = snapshot.files[fileIndex]
        if (fileIndex === selectedIndex) {
          selectFile(null, null)
        } else {
          selectFile(file.path, fileIndex)
        }
      }
    },
    [snapshot.files, loadedFileIndices, selectFile, selectedIndex, visibleMask]
  )

  const handlePointerMove = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation()
      if (e.instanceId !== undefined && e.instanceId < loadedFileIndices.length) {
        const fileIndex = loadedFileIndices[e.instanceId]
        if (visibleMask && !visibleMask[fileIndex]) return
        const file = snapshot.files[fileIndex]
        hoverFile(file.path, fileIndex)
        document.body.style.cursor = "pointer"
      }
    },
    [snapshot.files, loadedFileIndices, hoverFile, visibleMask]
  )

  const handlePointerOut = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation()
      hoverFile(null, null)
      document.body.style.cursor = "auto"
    },
    [hoverFile]
  )

  return (
    <group>
      <instancedMesh
        ref={meshRef}
        args={[buildingGeometry, buildingMaterial, count]}
        customDepthMaterial={buildingDepthMaterial}
        castShadow
        receiveShadow
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerMove={handlePointerMove}
        onPointerOut={handlePointerOut}
        frustumCulled={false}
      />

      {decorationData.platforms.length > 0 && (
        <instancedMesh
          ref={platformRef}
          args={[undefined, undefined, decorationData.platforms.length]}
          frustumCulled={false}
        >
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial roughness={0.85} metalness={0.1} />
        </instancedMesh>
      )}

      {decorationData.antennas.length > 0 && (
        <>
          <instancedMesh
            ref={antennaCylRef}
            args={[undefined, undefined, decorationData.antennas.length]}
            frustumCulled={false}
          >
            <cylinderGeometry args={[0.025, 0.035, 1.2, 6]} />
            <meshStandardMaterial color="#3a3f4b" roughness={0.5} metalness={0.6} />
          </instancedMesh>
          <instancedMesh
            ref={antennaTipRef}
            args={[undefined, undefined, decorationData.antennas.length]}
            frustumCulled={false}
          >
            <sphereGeometry args={[0.09, 8, 8]} />
            <meshBasicMaterial color="#ff3b30" />
          </instancedMesh>
        </>
      )}

      {decorationData.domes.length > 0 && (
        <instancedMesh
          ref={domeRef}
          args={[undefined, undefined, decorationData.domes.length]}
          frustumCulled={false}
        >
          <sphereGeometry args={[0.35, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial
            color="#a8c8ff"
            transparent
            opacity={0.55}
            metalness={0.6}
            roughness={0.15}
            emissive="#6a9cff"
            emissiveIntensity={0.3}
          />
        </instancedMesh>
      )}

      {decorationData.typeRings.length > 0 && (
        <instancedMesh
          ref={typeRingRef}
          args={[undefined, undefined, decorationData.typeRings.length]}
          frustumCulled={false}
        >
          <torusGeometry args={[0.85, 0.06, 6, 24]} />
          <meshBasicMaterial color="#fbbf24" transparent opacity={0.85} />
        </instancedMesh>
      )}
    </group>
  )
}
