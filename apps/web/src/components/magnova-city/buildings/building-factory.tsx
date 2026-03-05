"use client"

import { useRef } from "react"
import { useFrame, type ThreeEvent } from "@react-three/fiber"
import * as THREE from "three"
import type { SpaceData, BuildingType } from "@/lib/magnova/types"
import { useMagnovaStore } from "../use-magnova-store"

// ── Shared material config ──
const FLAT_MAT = { flatShading: true, roughness: 0.7, metalness: 0.1 }

// ── Individual building components ──

/** Castle — Orchestrator: central command, largest building */
function CastleBuilding({ color }: { color: string }) {
  return (
    <group>
      {/* Main keep */}
      <mesh position={[0, 2.5, 0]} castShadow>
        <boxGeometry args={[3, 5, 3]} />
        <meshStandardMaterial color={color} {...FLAT_MAT} />
      </mesh>
      {/* Battlements top */}
      <mesh position={[0, 5.2, 0]} castShadow>
        <boxGeometry args={[3.4, 0.4, 3.4]} />
        <meshStandardMaterial color={color} {...FLAT_MAT} />
      </mesh>
      {/* 4 corner towers */}
      {[[-1.8, -1.8], [1.8, -1.8], [-1.8, 1.8], [1.8, 1.8]].map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          <mesh position={[0, 2, 0]} castShadow>
            <cylinderGeometry args={[0.6, 0.7, 4, 6]} />
            <meshStandardMaterial color={color} {...FLAT_MAT} />
          </mesh>
          <mesh position={[0, 4.3, 0]} castShadow>
            <coneGeometry args={[0.8, 1.2, 6]} />
            <meshStandardMaterial color="#8B0000" {...FLAT_MAT} />
          </mesh>
        </group>
      ))}
      {/* Gate */}
      <mesh position={[0, 0.8, 1.6]} castShadow>
        <boxGeometry args={[1.2, 1.6, 0.3]} />
        <meshStandardMaterial color="#4A3728" {...FLAT_MAT} />
      </mesh>
      {/* Flag pole on keep */}
      <mesh position={[0, 6, 0]}>
        <cylinderGeometry args={[0.04, 0.04, 1.5, 4]} />
        <meshBasicMaterial color="#8B4513" />
      </mesh>
      <mesh position={[0.3, 6.5, 0]}>
        <planeGeometry args={[0.6, 0.4]} />
        <meshBasicMaterial color="#E8B84B" side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}

/** Observatory — Graphini: dome + telescope */
function ObservatoryBuilding({ color }: { color: string }) {
  return (
    <group>
      {/* Base cylinder */}
      <mesh position={[0, 1.2, 0]} castShadow>
        <cylinderGeometry args={[1.5, 1.8, 2.4, 8]} />
        <meshStandardMaterial color={color} {...FLAT_MAT} />
      </mesh>
      {/* Dome */}
      <mesh position={[0, 2.4, 0]} castShadow>
        <sphereGeometry args={[1.5, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#E0E0E0" {...FLAT_MAT} metalness={0.3} />
      </mesh>
      {/* Telescope tube */}
      <mesh position={[0.5, 3.2, 0]} rotation={[0, 0, -Math.PI / 6]} castShadow>
        <cylinderGeometry args={[0.15, 0.2, 2, 6]} />
        <meshStandardMaterial color="#607D8B" {...FLAT_MAT} />
      </mesh>
      {/* Telescope lens */}
      <mesh position={[1.3, 3.75, 0]}>
        <sphereGeometry args={[0.22, 6, 6]} />
        <meshStandardMaterial color="#81D4FA" {...FLAT_MAT} emissive="#4FC3F7" emissiveIntensity={0.3} />
      </mesh>
      {/* Steps */}
      <mesh position={[0, 0.1, 1.6]}>
        <boxGeometry args={[1.2, 0.2, 0.6]} />
        <meshStandardMaterial color="#9E9E9E" {...FLAT_MAT} />
      </mesh>
    </group>
  )
}

/** Colosseum — Debate Arena: circular tiered structure */
function ColosseumBuilding({ color }: { color: string }) {
  return (
    <group>
      {/* Outer ring */}
      <mesh position={[0, 1.2, 0]} castShadow>
        <cylinderGeometry args={[2, 2.2, 2.4, 12]} />
        <meshStandardMaterial color={color} {...FLAT_MAT} />
      </mesh>
      {/* Inner cutout (smaller, darker) */}
      <mesh position={[0, 1.4, 0]}>
        <cylinderGeometry args={[1.3, 1.3, 2.6, 12]} />
        <meshStandardMaterial color="#3E2723" {...FLAT_MAT} />
      </mesh>
      {/* Tiered seating rings */}
      {[0.5, 1.0, 1.5].map((y, i) => (
        <mesh key={i} position={[0, y, 0]}>
          <torusGeometry args={[1.6 + i * 0.2, 0.08, 4, 12]} />
          <meshStandardMaterial color="#D7CCC8" {...FLAT_MAT} />
        </mesh>
      ))}
      {/* Pillars around exterior */}
      {Array.from({ length: 8 }).map((_, i) => {
        const angle = (i / 8) * Math.PI * 2
        return (
          <mesh
            key={i}
            position={[Math.cos(angle) * 2.1, 1.5, Math.sin(angle) * 2.1]}
            castShadow
          >
            <cylinderGeometry args={[0.12, 0.15, 3, 4]} />
            <meshStandardMaterial color="#BCAAA4" {...FLAT_MAT} />
          </mesh>
        )
      })}
      {/* Arena floor */}
      <mesh position={[0, 0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.3, 12]} />
        <meshStandardMaterial color="#D2B48C" {...FLAT_MAT} />
      </mesh>
    </group>
  )
}

/** Library — Deep Research: tall shelved tower */
function LibraryBuilding({ color }: { color: string }) {
  return (
    <group>
      {/* Main body */}
      <mesh position={[0, 2, 0]} castShadow>
        <boxGeometry args={[2.5, 4, 2]} />
        <meshStandardMaterial color={color} {...FLAT_MAT} />
      </mesh>
      {/* Roof */}
      <mesh position={[0, 4.4, 0]} castShadow>
        <coneGeometry args={[1.8, 1.2, 4]} />
        <meshStandardMaterial color="#5D4037" {...FLAT_MAT} />
      </mesh>
      {/* Shelf ledges */}
      {[1.2, 2.2, 3.2].map((y, i) => (
        <mesh key={i} position={[0, y, 1.05]} castShadow>
          <boxGeometry args={[2.6, 0.1, 0.15]} />
          <meshStandardMaterial color="#8D6E63" {...FLAT_MAT} />
        </mesh>
      ))}
      {/* Door */}
      <mesh position={[0, 0.7, 1.05]}>
        <boxGeometry args={[0.8, 1.4, 0.1]} />
        <meshStandardMaterial color="#3E2723" {...FLAT_MAT} />
      </mesh>
      {/* Window */}
      <mesh position={[0, 3.5, 1.05]}>
        <circleGeometry args={[0.35, 6]} />
        <meshStandardMaterial color="#81D4FA" {...FLAT_MAT} emissive="#4FC3F7" emissiveIntensity={0.2} />
      </mesh>
    </group>
  )
}

/** Warehouse — SQL Playground: industrial wide building */
function WarehouseBuilding({ color }: { color: string }) {
  return (
    <group>
      {/* Main body */}
      <mesh position={[0, 1.2, 0]} castShadow>
        <boxGeometry args={[3.5, 2.4, 2.5]} />
        <meshStandardMaterial color={color} {...FLAT_MAT} />
      </mesh>
      {/* Corrugated roof */}
      <mesh position={[0, 2.7, 0]} castShadow>
        <boxGeometry args={[3.8, 0.5, 2.8]} />
        <meshStandardMaterial color="#78909C" {...FLAT_MAT} metalness={0.4} />
      </mesh>
      {/* Loading dock */}
      <mesh position={[0, 0.3, 1.4]} castShadow>
        <boxGeometry args={[2, 0.6, 0.5]} />
        <meshStandardMaterial color="#9E9E9E" {...FLAT_MAT} />
      </mesh>
      {/* Garage doors */}
      {[-0.8, 0.8].map((x, i) => (
        <mesh key={i} position={[x, 0.8, 1.28]}>
          <boxGeometry args={[0.9, 1.3, 0.05]} />
          <meshStandardMaterial color="#455A64" {...FLAT_MAT} />
        </mesh>
      ))}
      {/* Side pipe */}
      <mesh position={[1.8, 1.5, 0]} rotation={[0, 0, 0]}>
        <cylinderGeometry args={[0.12, 0.12, 2.4, 6]} />
        <meshStandardMaterial color="#607D8B" {...FLAT_MAT} />
      </mesh>
    </group>
  )
}

/** Workshop — Data Viz: workshop with chimney */
function WorkshopBuilding({ color }: { color: string }) {
  return (
    <group>
      {/* Main body */}
      <mesh position={[0, 1, 0]} castShadow>
        <boxGeometry args={[2.5, 2, 2]} />
        <meshStandardMaterial color={color} {...FLAT_MAT} />
      </mesh>
      {/* Angled roof */}
      <mesh position={[0, 2.3, 0]} rotation={[0, 0, 0]} castShadow>
        <boxGeometry args={[2.8, 0.6, 2.3]} />
        <meshStandardMaterial color="#6D4C41" {...FLAT_MAT} />
      </mesh>
      {/* Chimney */}
      <mesh position={[0.8, 3, -0.5]} castShadow>
        <cylinderGeometry args={[0.25, 0.3, 1.5, 6]} />
        <meshStandardMaterial color="#795548" {...FLAT_MAT} />
      </mesh>
      {/* Chimney smoke particle (small sphere) */}
      <mesh position={[0.8, 3.9, -0.5]}>
        <sphereGeometry args={[0.2, 6, 6]} />
        <meshStandardMaterial color="#BDBDBD" transparent opacity={0.4} {...FLAT_MAT} />
      </mesh>
      {/* Workshop window (large) */}
      <mesh position={[0, 1.2, 1.05]}>
        <boxGeometry args={[1.5, 0.8, 0.05]} />
        <meshStandardMaterial color="#BBDEFB" {...FLAT_MAT} emissive="#64B5F6" emissiveIntensity={0.15} />
      </mesh>
      {/* Workbench outside */}
      <mesh position={[-1.5, 0.4, 0.5]}>
        <boxGeometry args={[0.6, 0.8, 1]} />
        <meshStandardMaterial color="#8D6E63" {...FLAT_MAT} />
      </mesh>
    </group>
  )
}

/** Tower — Git Diff Reviewer: watchtower */
function TowerBuilding({ color }: { color: string }) {
  return (
    <group>
      {/* Narrow base */}
      <mesh position={[0, 2.5, 0]} castShadow>
        <cylinderGeometry args={[0.8, 1, 5, 6]} />
        <meshStandardMaterial color={color} {...FLAT_MAT} />
      </mesh>
      {/* Platform top */}
      <mesh position={[0, 5.2, 0]} castShadow>
        <boxGeometry args={[2.2, 0.3, 2.2]} />
        <meshStandardMaterial color="#8D6E63" {...FLAT_MAT} />
      </mesh>
      {/* Railing posts */}
      {[[-0.9, -0.9], [0.9, -0.9], [-0.9, 0.9], [0.9, 0.9]].map(([x, z], i) => (
        <mesh key={i} position={[x, 5.8, z]}>
          <cylinderGeometry args={[0.05, 0.05, 1, 4]} />
          <meshStandardMaterial color="#6D4C41" {...FLAT_MAT} />
        </mesh>
      ))}
      {/* Pointed roof */}
      <mesh position={[0, 6.7, 0]} castShadow>
        <coneGeometry args={[1.3, 1.2, 4]} />
        <meshStandardMaterial color="#5D4037" {...FLAT_MAT} />
      </mesh>
      {/* Flag */}
      <mesh position={[0, 7.5, 0]}>
        <cylinderGeometry args={[0.03, 0.03, 0.8, 4]} />
        <meshBasicMaterial color="#4E342E" />
      </mesh>
      <mesh position={[0.2, 7.7, 0]}>
        <planeGeometry args={[0.4, 0.3]} />
        <meshBasicMaterial color="#F44336" side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}

/** Temple — Astrova: dome with spires */
function TempleBuilding({ color }: { color: string }) {
  return (
    <group>
      {/* Octagonal base */}
      <mesh position={[0, 1, 0]} castShadow>
        <cylinderGeometry args={[2, 2.2, 2, 8]} />
        <meshStandardMaterial color={color} {...FLAT_MAT} />
      </mesh>
      {/* Main dome */}
      <mesh position={[0, 2, 0]} castShadow>
        <sphereGeometry args={[1.8, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#CE93D8" {...FLAT_MAT} emissive="#9C27B0" emissiveIntensity={0.1} />
      </mesh>
      {/* Crown spire */}
      <mesh position={[0, 3.8, 0]} castShadow>
        <coneGeometry args={[0.3, 1.2, 6]} />
        <meshStandardMaterial color="#FFD54F" {...FLAT_MAT} emissive="#FFC107" emissiveIntensity={0.15} />
      </mesh>
      {/* 4 corner spires */}
      {[[1.5, 1.5], [-1.5, 1.5], [1.5, -1.5], [-1.5, -1.5]].map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          <mesh position={[0, 1.5, 0]} castShadow>
            <cylinderGeometry args={[0.2, 0.3, 3, 6]} />
            <meshStandardMaterial color={color} {...FLAT_MAT} />
          </mesh>
          <mesh position={[0, 3.2, 0]}>
            <coneGeometry args={[0.25, 0.6, 6]} />
            <meshStandardMaterial color="#FFD54F" {...FLAT_MAT} />
          </mesh>
        </group>
      ))}
      {/* Steps */}
      {[0, 0.15, 0.3].map((y, i) => (
        <mesh key={i} position={[0, y, 2.2 + i * 0.3]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[1.5 - i * 0.2, 0.3]} />
          <meshStandardMaterial color="#D7CCC8" {...FLAT_MAT} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  )
}

/** Archive — RAG Knowledge Base: stepped pyramid */
function ArchiveBuilding({ color }: { color: string }) {
  return (
    <group>
      {/* 3 stacked boxes, decreasing size */}
      <mesh position={[0, 0.6, 0]} castShadow>
        <boxGeometry args={[3, 1.2, 3]} />
        <meshStandardMaterial color={color} {...FLAT_MAT} />
      </mesh>
      <mesh position={[0, 1.7, 0]} castShadow>
        <boxGeometry args={[2.2, 1, 2.2]} />
        <meshStandardMaterial color={color} {...FLAT_MAT} />
      </mesh>
      <mesh position={[0, 2.6, 0]} castShadow>
        <boxGeometry args={[1.4, 0.8, 1.4]} />
        <meshStandardMaterial color={color} {...FLAT_MAT} />
      </mesh>
      {/* Top capstone */}
      <mesh position={[0, 3.3, 0]} castShadow>
        <coneGeometry args={[0.5, 0.8, 4]} />
        <meshStandardMaterial color="#FFB74D" {...FLAT_MAT} emissive="#FF9800" emissiveIntensity={0.15} />
      </mesh>
      {/* Entrance */}
      <mesh position={[0, 0.5, 1.55]}>
        <boxGeometry args={[0.7, 1, 0.1]} />
        <meshStandardMaterial color="#3E2723" {...FLAT_MAT} />
      </mesh>
      {/* Side glyphs (small boxes as decoration) */}
      {[-0.8, 0, 0.8].map((x, i) => (
        <mesh key={i} position={[x, 1.8, 1.15]}>
          <boxGeometry args={[0.15, 0.15, 0.05]} />
          <meshStandardMaterial color="#FFD54F" {...FLAT_MAT} />
        </mesh>
      ))}
    </group>
  )
}

/** Laboratory — API Playground: pipes and antenna */
function LaboratoryBuilding({ color }: { color: string }) {
  return (
    <group>
      {/* Main body */}
      <mesh position={[0, 1.2, 0]} castShadow>
        <boxGeometry args={[2.5, 2.4, 2]} />
        <meshStandardMaterial color={color} {...FLAT_MAT} />
      </mesh>
      {/* Flat roof */}
      <mesh position={[0, 2.5, 0]} castShadow>
        <boxGeometry args={[2.8, 0.15, 2.3]} />
        <meshStandardMaterial color="#546E7A" {...FLAT_MAT} />
      </mesh>
      {/* Pipes on side */}
      {[0.5, 0, -0.5].map((z, i) => (
        <mesh key={i} position={[1.4, 1.2 + i * 0.4, z]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.1, 0.1, 0.6, 6]} />
          <meshStandardMaterial color="#78909C" {...FLAT_MAT} metalness={0.5} />
        </mesh>
      ))}
      {/* Antenna */}
      <mesh position={[-0.6, 3.2, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 1.5, 4]} />
        <meshStandardMaterial color="#90A4AE" {...FLAT_MAT} />
      </mesh>
      {/* Antenna tip */}
      <mesh position={[-0.6, 4, 0]}>
        <sphereGeometry args={[0.18, 6, 6]} />
        <meshStandardMaterial color="#F44336" {...FLAT_MAT} emissive="#F44336" emissiveIntensity={0.3} />
      </mesh>
      {/* Vent */}
      <mesh position={[0.6, 2.8, 0]}>
        <cylinderGeometry args={[0.3, 0.35, 0.5, 6]} />
        <meshStandardMaterial color="#607D8B" {...FLAT_MAT} />
      </mesh>
      {/* Door */}
      <mesh position={[0, 0.6, 1.05]}>
        <boxGeometry args={[0.8, 1.2, 0.05]} />
        <meshStandardMaterial color="#37474F" {...FLAT_MAT} />
      </mesh>
    </group>
  )
}

// ── Building Renderer ──

function getBuildingComponent(type: BuildingType, color: string) {
  switch (type) {
    case "castle":      return <CastleBuilding color={color} />
    case "observatory": return <ObservatoryBuilding color={color} />
    case "colosseum":   return <ColosseumBuilding color={color} />
    case "library":     return <LibraryBuilding color={color} />
    case "warehouse":   return <WarehouseBuilding color={color} />
    case "workshop":    return <WorkshopBuilding color={color} />
    case "tower":       return <TowerBuilding color={color} />
    case "temple":      return <TempleBuilding color={color} />
    case "archive":     return <ArchiveBuilding color={color} />
    case "laboratory":  return <LaboratoryBuilding color={color} />
    default:            return <CastleBuilding color={color} />
  }
}

interface BuildingProps {
  space: SpaceData
}

/** Single building with hover/click interaction and breathing animation */
export function Building({ space }: BuildingProps) {
  const groupRef = useRef<THREE.Group>(null)
  const { selectedSlug, hoveredSlug, selectSpace, hoverSpace } = useMagnovaStore()

  const isSelected = selectedSlug === space.slug
  const isHovered = hoveredSlug === space.slug
  const isLocked = space.status === "locked"

  // Pointer tracking for click vs drag
  const pointerStart = useRef<{ x: number; y: number } | null>(null)

  // Breathing animation + selection pulse
  useFrame(({ clock }) => {
    if (!groupRef.current) return
    const t = clock.getElapsedTime()

    // Gentle breathing
    const breathe = 1 + Math.sin(t * 0.8 + space.position.x) * 0.005

    // Selection pulse
    const pulse = isSelected ? 1.05 + Math.sin(t * 2) * 0.02 : 1
    const hover = isHovered && !isSelected ? 1.03 : 1

    const scale = breathe * pulse * hover
    groupRef.current.scale.setScalar(scale)
  })

  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    pointerStart.current = { x: e.nativeEvent.clientX, y: e.nativeEvent.clientY }
  }

  const handlePointerUp = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    if (!pointerStart.current) return
    const dx = e.nativeEvent.clientX - pointerStart.current.x
    const dy = e.nativeEvent.clientY - pointerStart.current.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    pointerStart.current = null

    if (dist < 6 && !isLocked) {
      selectSpace(isSelected ? null : space.slug)
    }
  }

  const handlePointerOver = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    if (!isLocked) {
      hoverSpace(space.slug)
      document.body.style.cursor = "pointer"
    }
  }

  const handlePointerOut = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    hoverSpace(null)
    document.body.style.cursor = "auto"
  }

  return (
    <group
      ref={groupRef}
      position={[space.position.x, 0.1, space.position.z]}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
    >
      {/* Building mesh */}
      <group>
        {getBuildingComponent(space.buildingType, isLocked ? "#9E9E9E" : space.color)}
      </group>

      {/* Selection glow ring */}
      {isSelected && (
        <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <torusGeometry args={[3, 0.1, 4, 24]} />
          <meshBasicMaterial color="#FFD700" transparent opacity={0.6} />
        </mesh>
      )}

      {/* Hover ring */}
      {isHovered && !isSelected && (
        <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <torusGeometry args={[3, 0.06, 4, 24]} />
          <meshBasicMaterial color="#FFFFFF" transparent opacity={0.3} />
        </mesh>
      )}

      {/* Active building point light */}
      {space.status === "active" && !isLocked && (
        <pointLight
          color={space.color}
          intensity={0.5}
          distance={8}
          position={[0, 4, 0]}
        />
      )}

      {/* "Building" status scaffold */}
      {space.status === "building" && (
        <>
          <mesh position={[-1.5, 2, -1.5]}>
            <cylinderGeometry args={[0.05, 0.05, 4, 4]} />
            <meshBasicMaterial color="#FF9800" />
          </mesh>
          <mesh position={[1.5, 2, -1.5]}>
            <cylinderGeometry args={[0.05, 0.05, 4, 4]} />
            <meshBasicMaterial color="#FF9800" />
          </mesh>
          <mesh position={[0, 3.5, -1.5]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.05, 0.05, 3, 4]} />
            <meshBasicMaterial color="#FF9800" />
          </mesh>
        </>
      )}
    </group>
  )
}

// ── All Buildings Container ──

interface AllBuildingsProps {
  spaces: SpaceData[]
}

export function AllBuildings({ spaces }: AllBuildingsProps) {
  return (
    <group>
      {spaces.map((space) => (
        <Building key={space.slug} space={space} />
      ))}
    </group>
  )
}
