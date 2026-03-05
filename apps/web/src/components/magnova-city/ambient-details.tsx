"use client"

import { useMemo } from "react"
import * as THREE from "three"
import type { SpaceData } from "@/lib/magnova/types"

// ── Procedural Trees ──

function Tree({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  return (
    <group position={position} scale={scale}>
      {/* Trunk */}
      <mesh position={[0, 0.5, 0]} castShadow>
        <cylinderGeometry args={[0.08, 0.12, 1, 5]} />
        <meshStandardMaterial color="#6D4C41" flatShading roughness={0.8} />
      </mesh>
      {/* Foliage layers */}
      <mesh position={[0, 1.2, 0]} castShadow>
        <coneGeometry args={[0.6, 1.0, 6]} />
        <meshStandardMaterial color="#4CAF50" flatShading roughness={0.7} />
      </mesh>
      <mesh position={[0, 1.7, 0]} castShadow>
        <coneGeometry args={[0.45, 0.8, 6]} />
        <meshStandardMaterial color="#66BB6A" flatShading roughness={0.7} />
      </mesh>
      <mesh position={[0, 2.1, 0]} castShadow>
        <coneGeometry args={[0.3, 0.6, 6]} />
        <meshStandardMaterial color="#81C784" flatShading roughness={0.7} />
      </mesh>
    </group>
  )
}

// ── Procedural Rocks ──

function Rock({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  return (
    <mesh position={position} scale={scale} castShadow>
      <icosahedronGeometry args={[0.3, 0]} />
      <meshStandardMaterial color="#90A4AE" flatShading roughness={0.9} />
    </mesh>
  )
}

// ── Path Segments ──

function PathSegment({
  from,
  to,
}: {
  from: { x: number; z: number }
  to: { x: number; z: number }
}) {
  const dx = to.x - from.x
  const dz = to.z - from.z
  const length = Math.sqrt(dx * dx + dz * dz)
  const angle = Math.atan2(dx, dz)
  const midX = (from.x + to.x) / 2
  const midZ = (from.z + to.z) / 2

  return (
    <mesh position={[midX, 0.05, midZ]} rotation={[0, angle, 0]} receiveShadow>
      <boxGeometry args={[0.8, 0.05, length]} />
      <meshStandardMaterial color="#A1887F" flatShading roughness={0.95} />
    </mesh>
  )
}

// ── Main Ambient Component ──

interface AmbientDetailsProps {
  spaces: SpaceData[]
}

export function AmbientDetails({ spaces }: AmbientDetailsProps) {
  // Generate tree positions (seeded random, avoiding buildings)
  const trees = useMemo(() => {
    const result: { pos: [number, number, number]; scale: number }[] = []
    let seed = 12345

    const nextRandom = () => {
      seed = (seed * 16807) % 2147483647
      return (seed - 1) / 2147483646
    }

    for (let i = 0; i < 60; i++) {
      const x = (nextRandom() - 0.5) * 80
      const z = (nextRandom() - 0.5) * 80
      const scale = 0.6 + nextRandom() * 0.8

      // Check distance from all buildings
      let tooClose = false
      for (const space of spaces) {
        const dx = x - space.position.x
        const dz = z - space.position.z
        if (Math.sqrt(dx * dx + dz * dz) < 5) {
          tooClose = true
          break
        }
      }

      if (!tooClose) {
        result.push({ pos: [x, 0, z], scale })
      }
    }

    return result
  }, [spaces])

  // Generate rock positions
  const rocks = useMemo(() => {
    const result: { pos: [number, number, number]; scale: number }[] = []
    let seed = 67890

    const nextRandom = () => {
      seed = (seed * 16807) % 2147483647
      return (seed - 1) / 2147483646
    }

    for (let i = 0; i < 30; i++) {
      const x = (nextRandom() - 0.5) * 70
      const z = (nextRandom() - 0.5) * 70
      const scale = 0.5 + nextRandom() * 1.5

      let tooClose = false
      for (const space of spaces) {
        const dx = x - space.position.x
        const dz = z - space.position.z
        if (Math.sqrt(dx * dx + dz * dz) < 4) {
          tooClose = true
          break
        }
      }

      if (!tooClose) {
        result.push({ pos: [x, 0.1, z], scale })
      }
    }

    return result
  }, [spaces])

  // Generate paths connecting buildings to the center (Orchestrator)
  const paths = useMemo(() => {
    const center = spaces.find((s) => s.buildingType === "castle")
    if (!center) return []

    return spaces
      .filter((s) => s.slug !== center.slug)
      .map((s) => ({
        from: center.position,
        to: s.position,
      }))
  }, [spaces])

  return (
    <group>
      {/* Trees */}
      {trees.map((tree, i) => (
        <Tree key={`tree-${i}`} position={tree.pos} scale={tree.scale} />
      ))}

      {/* Rocks */}
      {rocks.map((rock, i) => (
        <Rock key={`rock-${i}`} position={rock.pos} scale={rock.scale} />
      ))}

      {/* Paths from center to each building */}
      {paths.map((path, i) => (
        <PathSegment key={`path-${i}`} from={path.from} to={path.to} />
      ))}
    </group>
  )
}
