"use client"

import { useRef, useEffect, useCallback } from "react"
import { useFrame, useThree } from "@react-three/fiber"
import { OrthographicCamera, MapControls } from "@react-three/drei"
import * as THREE from "three"
import type { SpaceData } from "@/lib/magnova/types"
import { useMagnovaStore } from "./use-magnova-store"

interface CameraControllerProps {
  spaces: SpaceData[]
}

// Isometric angles locked in place
const ISOMETRIC_ROTATION_Y = -Math.PI / 4 // -45 degrees
const ISOMETRIC_ROTATION_X = Math.atan(-1 / Math.sqrt(2)) // ~-35.26 degrees

// Easing function for smooth fly-to animation
const easeInOutQuart = (t: number): number => {
  return t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2
}

export function CameraController({ spaces }: CameraControllerProps) {
  const { camera, gl } = useThree()
  const controlsRef = useRef<any>(null)
  const keysPressed = useRef<Set<string>>(new Set())

  // Animation state
  const animationState = useRef({
    isAnimating: false,
    startPosition: new THREE.Vector3(),
    endPosition: new THREE.Vector3(),
    startTarget: new THREE.Vector3(),
    endTarget: new THREE.Vector3(),
    progress: 0,
    duration: 1000, // ms
    startTime: 0,
  })

  // Store for selection
  const { selectedSlug } = useMagnovaStore()

  // Initialize camera with isometric projection
  useEffect(() => {
    const orthoCamera = camera as THREE.OrthographicCamera
    const frustumSize = 50

    orthoCamera.left = frustumSize / -2
    orthoCamera.right = frustumSize / 2
    orthoCamera.top = frustumSize / 2
    orthoCamera.bottom = frustumSize / -2
    orthoCamera.near = 0.1
    orthoCamera.far = 1000

    // Set initial position and rotation
    orthoCamera.position.set(30, 30, 30)
    orthoCamera.rotation.order = "YXZ"
    orthoCamera.rotation.y = ISOMETRIC_ROTATION_Y
    orthoCamera.rotation.x = ISOMETRIC_ROTATION_X
    orthoCamera.lookAt(0, 0, 0)

    orthoCamera.updateProjectionMatrix()
  }, [camera])

  // Handle keyboard input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase()
      if (["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(key)) {
        keysPressed.current.add(key)
        e.preventDefault()
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase()
      keysPressed.current.delete(key)
    }

    window.addEventListener("keydown", handleKeyDown)
    window.addEventListener("keyup", handleKeyUp)

    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("keyup", handleKeyUp)
    }
  }, [])

  // Fly-to animation when selectedSlug changes
  useEffect(() => {
    if (!selectedSlug) return

    const space = spaces.find((s) => s.slug === selectedSlug)
    if (!space) return

    const orthoCamera = camera as THREE.OrthographicCamera

    // Target position: 30 units away at isometric angle
    const distance = 30
    const targetPos = new THREE.Vector3(
      space.position.x + distance * Math.cos(ISOMETRIC_ROTATION_Y) * Math.cos(ISOMETRIC_ROTATION_X),
      space.position.z + distance * Math.sin(ISOMETRIC_ROTATION_X),
      space.position.x + distance * Math.sin(ISOMETRIC_ROTATION_Y) * Math.cos(ISOMETRIC_ROTATION_X)
    )

    const state = animationState.current
    state.startPosition.copy(orthoCamera.position)
    state.endPosition.copy(targetPos)
    state.startTarget.set(0, 0, 0)
    state.endTarget.set(space.position.x, 0, space.position.z)
    state.progress = 0
    state.duration = 1000
    state.startTime = Date.now()
    state.isAnimating = true
  }, [selectedSlug, spaces, camera])

  // Per-frame update for animation and WASD controls
  useFrame(() => {
    const orthoCamera = camera as THREE.OrthographicCamera
    const state = animationState.current

    // Update fly-to animation
    if (state.isAnimating) {
      const elapsed = Date.now() - state.startTime
      const progress = Math.min(elapsed / state.duration, 1)
      const eased = easeInOutQuart(progress)

      // Interpolate position
      const newPos = new THREE.Vector3().lerpVectors(state.startPosition, state.endPosition, eased)

      // Add gentle arc to Y during flight
      const arcHeight = 5 * Math.sin(progress * Math.PI)
      newPos.y += arcHeight

      orthoCamera.position.copy(newPos)

      // Interpolate controls target
      if (controlsRef.current) {
        const newTarget = new THREE.Vector3().lerpVectors(state.startTarget, state.endTarget, eased)
        controlsRef.current.target.copy(newTarget)
        controlsRef.current.update()
      }

      if (progress >= 1) {
        state.isAnimating = false
      }
    }

    // Handle WASD/arrow key panning
    if (keysPressed.current.size > 0) {
      const moveSpeed = 0.5

      // Get current zoom level to scale movement
      const frustumSize = 50
      const zoomFactor = frustumSize / (orthoCamera.right - orthoCamera.left)

      // Get camera's forward and right vectors (in XZ plane, Y=0)
      const forward = new THREE.Vector3(
        Math.sin(ISOMETRIC_ROTATION_Y),
        0,
        Math.cos(ISOMETRIC_ROTATION_Y)
      ).normalize()

      const right = new THREE.Vector3(
        Math.cos(ISOMETRIC_ROTATION_Y),
        0,
        -Math.sin(ISOMETRIC_ROTATION_Y)
      ).normalize()

      const moveVector = new THREE.Vector3()

      if (keysPressed.current.has("w") || keysPressed.current.has("arrowup")) {
        moveVector.add(forward)
      }
      if (keysPressed.current.has("s") || keysPressed.current.has("arrowdown")) {
        moveVector.sub(forward)
      }
      if (keysPressed.current.has("d") || keysPressed.current.has("arrowright")) {
        moveVector.add(right)
      }
      if (keysPressed.current.has("a") || keysPressed.current.has("arrowleft")) {
        moveVector.sub(right)
      }

      if (moveVector.length() > 0) {
        moveVector.normalize().multiplyScalar(moveSpeed * zoomFactor)

        orthoCamera.position.add(moveVector)

        if (controlsRef.current) {
          controlsRef.current.target.add(moveVector)
          controlsRef.current.update()
        }
      }
    }
  })

  return (
    <>
      <OrthographicCamera makeDefault position={[30, 30, 30]} />
      <MapControls
        ref={controlsRef}
        enableRotate={false}
        enableDamping
        dampingFactor={0.08}
        mouseButtons={{ LEFT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.DOLLY }}
        minZoom={0.3}
        maxZoom={3}
        panSpeed={1.2}
      />
    </>
  )
}
