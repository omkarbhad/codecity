"use client"

import { useRef, useMemo, useEffect } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"
import type { FileData, CitySnapshot } from "@/lib/types/city"
import { useCityStore } from "./use-city-store"

interface BuildingProps {
  file: FileData
  snapshot: CitySnapshot
}

/** Clamp a value between min and max. */
function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

/** Compute the building colour based on the current visualization mode. */
function getBuildingColor(
  file: FileData,
  mode: string,
  districtColor: string
): THREE.Color {
  const c = new THREE.Color()

  switch (mode) {
    case "dependencies":
      c.set(districtColor)
      break

    case "complexity": {
      // green → yellow → red  (0 → 15 → 30+)
      const t = clamp(file.complexity / 30, 0, 1)
      if (t < 0.5) {
        c.lerpColors(new THREE.Color("#34d399"), new THREE.Color("#fbbf24"), t * 2)
      } else {
        c.lerpColors(new THREE.Color("#fbbf24"), new THREE.Color("#ff4040"), (t - 0.5) * 2)
      }
      break
    }

    case "unused":
      c.set(file.hasUnusedExports ? "#ff4040" : "#34d399")
      break

    case "filesize": {
      const t = clamp(file.lines / 500, 0, 1)
      c.lerpColors(new THREE.Color("#fbbf24"), new THREE.Color("#ff4040"), t)
      break
    }

    case "types":
      c.set(file.types.length > 0 ? "#fbbf24" : "#333333")
      break

    default:
      c.set(districtColor)
  }

  return c
}

export function Building({ file, snapshot }: BuildingProps) {
  const groupRef = useRef<THREE.Group>(null)
  const wireframeRef = useRef<THREE.LineSegments>(null)

  const { selectedFile, hoveredFile, visualizationMode, selectFile, hoverFile } =
    useCityStore()

  const isSelected = selectedFile === file.path
  const isHovered = hoveredFile === file.path

  // ── Dimensions ──
  const height = clamp(file.lines / 60, 0.3, 12)
  const width = clamp(1.0 + file.functions.length * 0.12, 1.0, 2.2)
  const depth = width

  // ── Colour ──
  const districtColor = useMemo(() => {
    const d = snapshot.districts.find((d) => d.name === file.district)
    return d?.color ?? "#888888"
  }, [snapshot.districts, file.district])

  const color = useMemo(
    () => getBuildingColor(file, visualizationMode, districtColor),
    [file, visualizationMode, districtColor]
  )

  // ── Geometries (memoised + disposed on unmount) ──
  const edgesGeometry = useMemo(() => {
    const box = new THREE.BoxGeometry(width, height, depth)
    const edges = new THREE.EdgesGeometry(box)
    box.dispose()
    return edges
  }, [width, height, depth])

  // Dispose edges geometry on unmount to prevent memory leaks
  useEffect(() => {
    return () => edgesGeometry.dispose()
  }, [edgesGeometry])

  // Floor line positions — one per function, evenly spaced
  const floorLines = useMemo(() => {
    const count = file.functions.length
    if (count === 0) return []
    const spacing = height / (count + 1)
    return file.functions.map((_, i) => {
      const y = -height / 2 + spacing * (i + 1)
      return y
    })
  }, [file.functions, height])

  // ── Animations ──
  useFrame(({ clock }) => {
    if (!groupRef.current) return
    const t = clock.getElapsedTime()

    // Hover / select scale
    let targetScale = 1
    if (isSelected) {
      // Breathing 1.08 – 1.12
      targetScale = 1.1 + Math.sin(t * 3) * 0.02
    } else if (isHovered) {
      targetScale = 1.06
    }

    const s = groupRef.current.scale
    s.x += (targetScale - s.x) * 0.15
    s.y += (targetScale - s.y) * 0.15
    s.z += (targetScale - s.z) * 0.15

    // Unused-export pulsing wireframe
    if (file.hasUnusedExports && wireframeRef.current) {
      const mat = wireframeRef.current.material as THREE.LineBasicMaterial
      mat.opacity = 0.5 + Math.sin(t * 4) * 0.3 // 0.2 – 0.8
    }
  })

  return (
    <group
      ref={groupRef}
      position={[file.position.x, height / 2, file.position.z]}
      onPointerOver={(e) => {
        e.stopPropagation()
        hoverFile(file.path)
        document.body.style.cursor = "pointer"
      }}
      onPointerOut={(e) => {
        e.stopPropagation()
        hoverFile(null)
        document.body.style.cursor = "auto"
      }}
      onPointerDown={(e) => {
        e.stopPropagation()
        selectFile(isSelected ? null : file.path)
      }}
    >
      {/* ── Large-file platform ── */}
      {file.lines > 200 && (
        <mesh position={[0, -height / 2 + 0.05, 0]}>
          <boxGeometry args={[width * 1.3, 0.1, depth * 1.3]} />
          <meshStandardMaterial
            color={color}
            transparent
            opacity={0.25}
            roughness={0.8}
          />
        </mesh>
      )}

      {/* ── Main box ── */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[width, height, depth]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.1}
          metalness={0.25}
          roughness={0.4}
        />
      </mesh>

      {/* ── Edge wireframe ── */}
      <lineSegments ref={wireframeRef} geometry={edgesGeometry}>
        <lineBasicMaterial
          color={color}
          transparent
          opacity={file.hasUnusedExports ? 0.5 : 0.4}
        />
      </lineSegments>

      {/* ── Floor lines (one per function) ── */}
      {floorLines.map((y, i) => (
        <mesh key={i} position={[0, y, 0]}>
          <boxGeometry args={[width * 0.92, 0.02, depth * 0.92]} />
          <meshBasicMaterial color={color} transparent opacity={0.25} />
        </mesh>
      ))}

      {/* ── Complexity antenna ── */}
      {file.complexity > 20 && (
        <group position={[0, height / 2, 0]}>
          {/* Thin red rod */}
          <mesh position={[0, 0.75, 0]}>
            <cylinderGeometry args={[0.05, 0.05, 1.5, 8]} />
            <meshStandardMaterial color="#ff4040" />
          </mesh>
          {/* Glowing tip */}
          <mesh position={[0, 1.6, 0]}>
            <sphereGeometry args={[0.15, 12, 12]} />
            <meshStandardMaterial
              color="#ff4040"
              emissive="#ff4040"
              emissiveIntensity={2}
            />
          </mesh>
        </group>
      )}

      {/* ── React dome ── */}
      {file.isReactComponent && (
        <mesh
          position={[0, height / 2, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <sphereGeometry args={[0.5, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial
            color="#4d94ff"
            emissive="#4d94ff"
            emissiveIntensity={0.3}
            transparent
            opacity={0.6}
          />
        </mesh>
      )}

      {/* ── Type ring ── */}
      {file.types.length >= 3 && (
        <mesh position={[0, -height / 2 + 0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.8, 0.04, 8, 32]} />
          <meshStandardMaterial
            color="#fbbf24"
            emissive="#fbbf24"
            emissiveIntensity={0.5}
          />
        </mesh>
      )}
    </group>
  )
}
