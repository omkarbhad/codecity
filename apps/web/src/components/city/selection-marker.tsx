"use client"

import { useRef, useMemo, memo } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"
import type { CitySnapshot } from "@/lib/types/city"
import { useCityStore } from "./use-city-store"

interface SelectionMarkerProps {
  snapshot: CitySnapshot
}

export const SelectionMarker = memo(function SelectionMarker({ snapshot }: SelectionMarkerProps) {
  const selectedFile = useCityStore((s) => s.selectedFile)
  const ringRef = useRef<THREE.Mesh>(null)
  const glowRef = useRef<THREE.Mesh>(null)
  const beamRef = useRef<THREE.Mesh>(null)
  const matRef = useRef<THREE.MeshBasicMaterial>(null)
  const glowMatRef = useRef<THREE.MeshBasicMaterial>(null)
  const beamMatRef = useRef<THREE.MeshBasicMaterial>(null)

  const fileData = useMemo(() => {
    if (!selectedFile) return null
    return snapshot.files.find((f) => f.path === selectedFile) ?? null
  }, [selectedFile, snapshot.files])

  const districtColor = useMemo(() => {
    if (!fileData) return "#ffffff"
    return snapshot.districts.find((d) => d.name === fileData.district)?.color ?? "#ffffff"
  }, [fileData, snapshot.districts])

  useFrame(({ clock }) => {
    if (!ringRef.current || !matRef.current || !glowRef.current || !glowMatRef.current) return
    const t = clock.getElapsedTime()

    ringRef.current.rotation.z = t * 0.4
    glowRef.current.rotation.z = -t * 0.25

    matRef.current.opacity = 0.55 + Math.sin(t * 2.5) * 0.18
    glowMatRef.current.opacity = 0.14 + Math.sin(t * 1.8) * 0.05

    // Beam pulse
    if (beamRef.current && beamMatRef.current) {
      beamMatRef.current.opacity = 0.07 + Math.sin(t * 1.5) * 0.03
    }
  })

  if (!fileData) return null

  const buildingWidth = Math.max(1.2, Math.min(2.8, 1.2 + fileData.functions.length * 0.15))
  const buildingHeight = Math.max(0.4, Math.min(18, fileData.lines / 50))
  const ringRadius = buildingWidth * 0.8 + 0.3

  return (
    <group position={[fileData.position.x, 0.04, fileData.position.z]}>
      {/* Vertical beam */}
      <mesh ref={beamRef} position={[0, buildingHeight / 2 + 5, 0]}>
        <cylinderGeometry args={[ringRadius * 0.1, ringRadius * 0.6, buildingHeight + 10, 8, 1, true]} />
        <meshBasicMaterial
          ref={beamMatRef}
          color={districtColor}
          transparent
          opacity={0.04}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Outer glow disc */}
      <mesh ref={glowRef} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[ringRadius * 0.5, ringRadius * 1.8, 32]} />
        <meshBasicMaterial
          ref={glowMatRef}
          color={districtColor}
          transparent
          opacity={0.08}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Inner ring */}
      <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[ringRadius * 0.85, ringRadius, 32]} />
        <meshBasicMaterial
          ref={matRef}
          color={districtColor}
          transparent
          opacity={0.45}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  )
})
