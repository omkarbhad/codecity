"use client"

import { useRef, useEffect, useCallback } from "react"
import { useFrame, useThree } from "@react-three/fiber"
import { OrbitControls } from "@react-three/drei"
import * as THREE from "three"
import type { CitySnapshot } from "@/lib/types/city"
import { useCityStore } from "./use-city-store"

interface CameraControllerProps {
  snapshot: CitySnapshot
}

const DEFAULT_POSITION = new THREE.Vector3(40, 40, 40)
const DEFAULT_TARGET = new THREE.Vector3(0, 0, 0)

export function CameraController({ snapshot }: CameraControllerProps) {
  const { selectedFile } = useCityStore()
  const { camera } = useThree()

  const controlsRef = useRef<React.ComponentRef<typeof OrbitControls>>(null)
  const targetPosition = useRef(new THREE.Vector3().copy(DEFAULT_POSITION))
  const targetLookAt = useRef(new THREE.Vector3().copy(DEFAULT_TARGET))
  const isAnimating = useRef(false)
  const animProgress = useRef(0)

  // Animate camera toward a selected building
  useEffect(() => {
    if (!selectedFile) return

    const file = snapshot.files.find((f) => f.path === selectedFile)
    if (!file) return

    const height = Math.max(0.4, Math.min(18, file.lines / 50))
    const filePos = new THREE.Vector3(
      file.position.x,
      height / 2,
      file.position.z
    )

    // Position the camera offset from the building
    const offset = new THREE.Vector3(12, 10, 12)
    targetPosition.current.copy(filePos).add(offset)
    targetLookAt.current.copy(filePos)
    isAnimating.current = true
    animProgress.current = 0
  }, [selectedFile, snapshot.files])

  // "R" key resets camera
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "r" || e.key === "R") {
        targetPosition.current.copy(DEFAULT_POSITION)
        targetLookAt.current.copy(DEFAULT_TARGET)
        isAnimating.current = true
        animProgress.current = 0
      }
    },
    []
  )

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [handleKeyDown])

  // Smooth lerp each frame
  useFrame(() => {
    if (!isAnimating.current) return

    animProgress.current += 1
    const t = Math.min(animProgress.current / 60, 1) // ~60 frames
    const ease = 1 - Math.pow(1 - t, 3) // ease-out cubic

    camera.position.lerp(targetPosition.current, ease * 0.08 + 0.02)

    if (controlsRef.current) {
      const controls = controlsRef.current as unknown as { target: THREE.Vector3 }
      controls.target.lerp(targetLookAt.current, ease * 0.08 + 0.02)
    }

    if (t >= 1) {
      isAnimating.current = false
    }
  })

  return (
    <OrbitControls
      ref={controlsRef}
      minDistance={10}
      maxDistance={200}
      enableDamping
      dampingFactor={0.05}
      makeDefault
    />
  )
}
