"use client"

import { useRef, useMemo } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"
import type { CitySnapshot, FileData } from "@/lib/types/city"
import { useCityStore } from "./use-city-store"

interface DependencyPipesProps {
  snapshot: CitySnapshot
}

/** Clamp value between min and max. */
function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

/** Compute building height for a file (same formula as Building). */
function fileHeight(f: FileData) {
  return clamp(f.lines / 50, 0.4, 18)
}

interface PipeData {
  curve: THREE.CatmullRomCurve3
  color: string
  key: string
}

/** A single animated pipe with a flowing particle. */
function Pipe({ curve, color }: { curve: THREE.CatmullRomCurve3; color: string }) {
  const particleRef = useRef<THREE.Mesh>(null)
  const particleMatRef = useRef<THREE.MeshBasicMaterial>(null)

  // Tube geometries (memoised)
  const solidTube = useMemo(
    () => new THREE.TubeGeometry(curve, 32, 0.03, 6, false),
    [curve]
  )
  const glowTube = useMemo(
    () => new THREE.TubeGeometry(curve, 32, 0.08, 6, false),
    [curve]
  )

  // Animate the particle along the curve
  useFrame(({ clock }) => {
    if (!particleRef.current || !particleMatRef.current) return

    const t = clock.getElapsedTime()
    const param = (t / 2) % 1 // 2-second traverse
    const point = curve.getPointAt(param)
    particleRef.current.position.copy(point)

    // Pulsing opacity 0.3 – 1.0
    particleMatRef.current.opacity = 0.65 + Math.sin(t * 6) * 0.35
  })

  return (
    <group>
      {/* Solid core */}
      <mesh geometry={solidTube}>
        <meshBasicMaterial color={color} />
      </mesh>

      {/* Glow shell */}
      <mesh geometry={glowTube}>
        <meshBasicMaterial color={color} transparent opacity={0.15} />
      </mesh>

      {/* Flow particle */}
      <mesh ref={particleRef}>
        <sphereGeometry args={[0.12, 8, 8]} />
        <meshBasicMaterial
          ref={particleMatRef}
          color="#ffffff"
          transparent
          opacity={1}
        />
      </mesh>
    </group>
  )
}

export function DependencyPipes({ snapshot }: DependencyPipesProps) {
  const { selectedFile } = useCityStore()

  // Build a quick lookup: path → FileData
  const fileMap = useMemo(() => {
    const map = new Map<string, FileData>()
    for (const f of snapshot.files) {
      map.set(f.path, f)
    }
    return map
  }, [snapshot.files])

  // Compute pipe data whenever selectedFile changes
  const pipes: PipeData[] = useMemo(() => {
    if (!selectedFile) return []

    const src = fileMap.get(selectedFile)
    if (!src) return []

    const result: PipeData[] = []

    const srcH = fileHeight(src)
    const srcPos = new THREE.Vector3(src.position.x, srcH / 2, src.position.z)

    // Outgoing imports → red
    for (const imp of src.imports) {
      const target = fileMap.get(imp)
      if (!target) continue
      const tH = fileHeight(target)
      const tPos = new THREE.Vector3(
        target.position.x,
        tH / 2,
        target.position.z
      )

      const mid = new THREE.Vector3()
        .addVectors(srcPos, tPos)
        .multiplyScalar(0.5)
      mid.y = Math.max(srcH, tH) + 3

      result.push({
        key: `out-${imp}`,
        color: "#ff4040",
        curve: new THREE.CatmullRomCurve3([srcPos, mid, tPos]),
      })
    }

    // Incoming importedBy → blue
    for (const dep of src.importedBy) {
      const source = fileMap.get(dep)
      if (!source) continue
      const sH = fileHeight(source)
      const sPos = new THREE.Vector3(
        source.position.x,
        sH / 2,
        source.position.z
      )

      const mid = new THREE.Vector3()
        .addVectors(sPos, srcPos)
        .multiplyScalar(0.5)
      mid.y = Math.max(sH, srcH) + 3

      result.push({
        key: `in-${dep}`,
        color: "#4d94ff",
        curve: new THREE.CatmullRomCurve3([sPos, mid, srcPos]),
      })
    }

    return result
  }, [selectedFile, fileMap])

  if (pipes.length === 0) return null

  return (
    <group>
      {pipes.map((p) => (
        <Pipe key={p.key} curve={p.curve} color={p.color} />
      ))}
    </group>
  )
}
