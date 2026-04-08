"use client"

import { useRef, useEffect, useCallback } from "react"
import { useFrame, useThree } from "@react-three/fiber"
import { OrbitControls } from "@react-three/drei"
import * as THREE from "three"
import type { CitySnapshot } from "@/lib/types/city"
import type { CityBounds } from "@/lib/visualization/city-bounds"
import { getCityBounds } from "@/lib/visualization/city-bounds"
import { useCityStore } from "./use-city-store"

interface CameraControllerProps {
  snapshot: CitySnapshot
  cityBounds?: CityBounds
}

export function CameraController({ snapshot, cityBounds }: CameraControllerProps) {
  const selectedFile = useCityStore((s) => s.selectedFile)
  const { camera } = useThree()

  const controlsRef = useRef<React.ComponentRef<typeof OrbitControls>>(null)

  const flyState = useRef({
    active: false,
    t: 0,
    startPos: new THREE.Vector3(),
    endPos: new THREE.Vector3(),
    startTarget: new THREE.Vector3(),
    endTarget: new THREE.Vector3(),
  })

  const hasInitialized = useRef(false)

  // WASD / arrow key movement state
  const keysPressed = useRef(new Set<string>())
  const PAN_SPEED = 0.8

  // PERF: Reusable vectors for per-frame panning — avoids heap allocation every frame
  const _forward = useRef(new THREE.Vector3())
  const _right = useRef(new THREE.Vector3())
  const _move = useRef(new THREE.Vector3())

  const getControlsTarget = useCallback(() => {
    if (controlsRef.current) {
      return (controlsRef.current as unknown as { target: THREE.Vector3 }).target
    }
    return new THREE.Vector3()
  }, [])

  const currentBounds = cityBounds ?? getCityBounds(snapshot.files)

  // Auto-fit camera on initial load
  useEffect(() => {
    if (hasInitialized.current || !currentBounds.hasFiles) return
    hasInitialized.current = true

    const cx = currentBounds.centerX
    const cz = currentBounds.centerZ
    const spread = currentBounds.spread
    const dist = Math.max(30, spread * 0.7)

    camera.position.set(
      cx + dist * Math.sin(Math.PI / 4) * Math.cos(0.75),
      dist * Math.sin(0.75),
      cz + dist * Math.cos(Math.PI / 4) * Math.cos(0.75)
    )
    camera.lookAt(cx, 0, cz)

    const target = getControlsTarget()
    target.set(cx, 0, cz)
  }, [camera, currentBounds, getControlsTarget])

  // Fly-to when a building is selected
  useEffect(() => {
    if (!selectedFile) return
    const file = snapshot.files.find((f) => f.path === selectedFile)
    if (!file) return

    const height = Math.max(0.4, Math.min(18, file.lines / 50))
    const targetPoint = new THREE.Vector3(file.position.x, height * 0.3, file.position.z)

    const controlsTarget = getControlsTarget()
    const currentDist = camera.position.distanceTo(controlsTarget)
    const newDist = Math.max(12, Math.min(currentDist * 0.45, 40))

    const direction = camera.position.clone().sub(controlsTarget).normalize()
    const newCamPos = targetPoint.clone().add(direction.multiplyScalar(newDist))
    newCamPos.y = Math.max(newCamPos.y, height + 8)

    const fly = flyState.current
    fly.active = true
    fly.t = 0
    fly.startPos.copy(camera.position)
    fly.endPos.copy(newCamPos)
    fly.startTarget.copy(controlsTarget)
    fly.endTarget.copy(targetPoint)
  }, [selectedFile, snapshot.files, camera, getControlsTarget])

  // Stable references — read from refs inside listeners to avoid churn
  const cameraRef = useRef(camera)
  cameraRef.current = camera
  const getControlsTargetRef = useRef(getControlsTarget)
  getControlsTargetRef.current = getControlsTarget
  const cityBoundsRef = useRef(currentBounds)
  cityBoundsRef.current = currentBounds

  // "R" key resets camera, WASD/arrows for panning — registered once
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.target as HTMLElement).tagName === "INPUT") return

      const moveKeys = ["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"]
      if (moveKeys.includes(e.key.toLowerCase())) {
        e.preventDefault()
        keysPressed.current.add(e.key.toLowerCase())
        return
      }

      if (e.key === "r" || e.key === "R") {
        const bounds = cityBoundsRef.current
        if (!bounds.hasFiles) return

        const cx = bounds.centerX
        const cz = bounds.centerZ
        const spread = bounds.spread
        const dist = Math.max(30, spread * 0.7)

        const fly = flyState.current
        fly.active = true
        fly.t = 0
        fly.startPos.copy(cameraRef.current.position)
        fly.endPos.set(
          cx + dist * Math.sin(Math.PI / 4) * Math.cos(0.75),
          dist * Math.sin(0.75),
          cz + dist * Math.cos(Math.PI / 4) * Math.cos(0.75)
        )
        fly.startTarget.copy(getControlsTargetRef.current())
        fly.endTarget.set(cx, 0, cz)
      }
    }

    function handleKeyUp(e: KeyboardEvent) {
      keysPressed.current.delete(e.key.toLowerCase())
    }

    window.addEventListener("keydown", handleKeyDown)
    window.addEventListener("keyup", handleKeyUp)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("keyup", handleKeyUp)
    }
  }, []) // Empty deps — listeners registered once, read from refs

  // Per-frame: fly animation + WASD panning
  useFrame(() => {
    const fly = flyState.current

    if (fly.active) {
      fly.t = Math.min(fly.t + 0.04, 1)
      const ease = 1 - Math.pow(1 - fly.t, 4)

      camera.position.lerpVectors(fly.startPos, fly.endPos, ease)

      const arcHeight = Math.sin(fly.t * Math.PI) * Math.min(
        15,
        fly.startPos.distanceTo(fly.endPos) * 0.12
      )
      camera.position.y += arcHeight

      const target = getControlsTarget()
      target.lerpVectors(fly.startTarget, fly.endTarget, ease)

      if (fly.t >= 1) fly.active = false
    }

    // WASD / Arrow key panning — uses reusable vectors to avoid allocation
    if (keysPressed.current.size > 0 && !fly.active) {
      const target = getControlsTarget()
      const forward = _forward.current
      camera.getWorldDirection(forward)
      forward.y = 0
      forward.normalize()

      const right = _right.current
      right.set(0, 1, 0)
      right.crossVectors(forward, right).normalize()

      const move = _move.current
      move.set(0, 0, 0)
      const speedScale = PAN_SPEED * (camera.position.y * 0.05 + 0.5)

      if (keysPressed.current.has("w") || keysPressed.current.has("arrowup")) {
        move.addScaledVector(forward, speedScale)
      }
      if (keysPressed.current.has("s") || keysPressed.current.has("arrowdown")) {
        move.addScaledVector(forward, -speedScale)
      }
      if (keysPressed.current.has("a") || keysPressed.current.has("arrowleft")) {
        move.addScaledVector(right, -speedScale)
      }
      if (keysPressed.current.has("d") || keysPressed.current.has("arrowright")) {
        move.addScaledVector(right, speedScale)
      }

      camera.position.add(move)
      target.add(move)
    }
  })

  // Generous limits — user should never hit invisible walls
  const maxDist = Math.max(500, currentBounds.spread * 3)

  return (
    <OrbitControls
      ref={controlsRef}
      minDistance={2}
      maxDistance={maxDist}
      enableDamping
      dampingFactor={0.08}
      maxPolarAngle={Math.PI * 0.85}
      minPolarAngle={0.05}
      makeDefault
      mouseButtons={{
        LEFT: THREE.MOUSE.PAN,
        MIDDLE: THREE.MOUSE.DOLLY,
        RIGHT: THREE.MOUSE.ROTATE,
      }}
      touches={{
        ONE: THREE.TOUCH.PAN,
        TWO: THREE.TOUCH.DOLLY_ROTATE,
      }}
      panSpeed={1.2}
      rotateSpeed={0.6}
      zoomSpeed={1.0}
      screenSpacePanning={false}
    />
  )
}
