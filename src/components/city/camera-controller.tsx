"use client"

import { useRef, useEffect, useCallback, useMemo } from "react"
import { useFrame, useThree } from "@react-three/fiber"
import { OrbitControls } from "@react-three/drei"
import * as THREE from "three"
import type { CitySnapshot } from "@/lib/types/city"
import type { CityBounds } from "@/lib/visualization/city-bounds"
import { getCityBounds } from "@/lib/visualization/city-bounds"
import { getBuildingHeight } from "@/lib/visualization/building-dimensions"
import { useCityStore } from "./use-city-store"
import { isTypingTarget } from "@/lib/keyboard"

const OVERVIEW_AZIMUTH = Math.PI / 4
const OVERVIEW_ELEVATION = 0.62

/** Screen space the floating toolbar takes at the top of the canvas, and the margin kept at the bottom. */
const OVERLAY_TOP_PX = 64
const OVERLAY_BOTTOM_PX = 20
const SIDE_MARGIN = 0.94
/** Spires and their needles rise above the roof of the tallest towers. */
const SKYLINE_HEADROOM = 1.35

interface CityBox {
  minX: number
  maxX: number
  minZ: number
  maxZ: number
  height: number
}

/** The city's footprint (district blocks, not just building centres) and skyline height. */
export function getCityBox(snapshot: CitySnapshot, bounds: CityBounds, maxHeight: number): CityBox {
  const box = { minX: bounds.minX, maxX: bounds.maxX, minZ: bounds.minZ, maxZ: bounds.maxZ, height: maxHeight * SKYLINE_HEADROOM }
  for (const { bounds: b } of snapshot.districts) {
    if (!(b.width > 0 && b.depth > 0)) continue
    box.minX = Math.min(box.minX, b.x)
    box.maxX = Math.max(box.maxX, b.x + b.width)
    box.minZ = Math.min(box.minZ, b.z)
    box.maxZ = Math.max(box.maxZ, b.z + b.depth)
  }
  return box
}

/**
 * Camera position + target that put the whole city on screen: every corner of the
 * city's box is projected and the camera backs off until all of them clear the
 * side margins and the toolbar.
 */
export function getOverview(
  box: CityBox,
  camera: THREE.Camera,
  size: { width: number; height: number },
  /** Pixels kept clear at the top and bottom of the canvas (the toolbar, by default). */
  clear: { top: number; bottom: number } = { top: OVERLAY_TOP_PX, bottom: OVERLAY_BOTTOM_PX }
) {
  const fov = THREE.MathUtils.degToRad((camera as THREE.PerspectiveCamera).fov ?? 50)
  const tanV = Math.tan(fov / 2)
  const tanH = tanV * (size.width / Math.max(1, size.height))
  const top = 1 - (2 * clear.top) / Math.max(1, size.height)
  const bottom = 1 - (2 * clear.bottom) / Math.max(1, size.height)

  const toCamera = new THREE.Vector3(
    Math.sin(OVERVIEW_AZIMUTH) * Math.cos(OVERVIEW_ELEVATION),
    Math.sin(OVERVIEW_ELEVATION),
    Math.cos(OVERVIEW_AZIMUTH) * Math.cos(OVERVIEW_ELEVATION)
  )
  const forward = toCamera.clone().negate()
  const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize()
  const up = new THREE.Vector3().crossVectors(right, forward)

  const corners: THREE.Vector3[] = []
  for (const x of [box.minX, box.maxX]) for (const z of [box.minZ, box.maxZ]) for (const y of [0, box.height]) corners.push(new THREE.Vector3(x, y, z))

  const target = new THREE.Vector3((box.minX + box.maxX) / 2, box.height * 0.3, (box.minZ + box.maxZ) / 2)
  const rel = new THREE.Vector3()
  let distance = 30
  // Fit, re-centre the projected city below the toolbar, fit again
  for (let pass = 0; pass < 3; pass++) {
    distance = 30
    for (const corner of corners) {
      rel.subVectors(corner, target)
      const x = rel.dot(right), y = rel.dot(up), z = rel.dot(forward)
      distance = Math.max(distance, Math.abs(x) / (tanH * SIDE_MARGIN) - z, (y > 0 ? y / (tanV * top) : -y / (tanV * bottom)) - z)
    }
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
    for (const corner of corners) {
      rel.subVectors(corner, target)
      const depth = distance + rel.dot(forward)
      const nx = rel.dot(right) / (depth * tanH), ny = rel.dot(up) / (depth * tanV)
      minX = Math.min(minX, nx); maxX = Math.max(maxX, nx)
      minY = Math.min(minY, ny); maxY = Math.max(maxY, ny)
    }
    target.addScaledVector(right, ((minX + maxX) / 2) * distance * tanH)
    target.addScaledVector(up, ((minY + maxY) / 2 - (top - bottom) / 2) * distance * tanV)
  }

  return { position: target.clone().addScaledVector(toCamera, distance), target }
}

interface CameraControllerProps {
  snapshot: CitySnapshot
  cityBounds?: CityBounds
}

export function CameraController({ snapshot, cityBounds }: CameraControllerProps) {
  const selectedFile = useCityStore((s) => s.selectedFile)
  const { camera, size } = useThree()

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
  const maxHeight = useMemo(
    () => snapshot.files.reduce((max, file) => Math.max(max, getBuildingHeight(file)), 0),
    [snapshot.files]
  )
  const cityBox = useMemo(() => getCityBox(snapshot, currentBounds, maxHeight), [snapshot, currentBounds, maxHeight])
  const cityBoxRef = useRef(cityBox)
  cityBoxRef.current = cityBox
  const sizeRef = useRef(size)
  sizeRef.current = size

  // Auto-fit camera on initial load
  useEffect(() => {
    if (hasInitialized.current || !currentBounds.hasFiles) return
    hasInitialized.current = true

    const view = getOverview(cityBox, camera, sizeRef.current)
    camera.position.copy(view.position)
    camera.lookAt(view.target)
    getControlsTarget().copy(view.target)
  }, [camera, currentBounds, cityBox, getControlsTarget])

  // Fly-to when a building is selected
  useEffect(() => {
    if (!selectedFile) return
    const file = snapshot.files.find((f) => f.path === selectedFile)
    if (!file) return

    const height = getBuildingHeight(file)
    const targetPoint = new THREE.Vector3(file.position.x, height * 0.45, file.position.z)

    const controlsTarget = getControlsTarget()
    const currentDist = camera.position.distanceTo(controlsTarget)
    // Close enough to read the facade, far enough that a tall tower's roof and name tag stay on screen
    const newDist = Math.max(12, Math.min(currentDist * 0.45, 40), height * 1.7 + 6)

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
      // Typing in a search field or the code editor must not steer the camera
      if (e.defaultPrevented || isTypingTarget(e)) return

      const moveKeys = ["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"]
      if (moveKeys.includes(e.key.toLowerCase())) {
        e.preventDefault()
        keysPressed.current.add(e.key.toLowerCase())
        return
      }

      if (e.key === "r" || e.key === "R") {
        const bounds = cityBoundsRef.current
        if (!bounds.hasFiles) return

        const view = getOverview(cityBoxRef.current, cameraRef.current, sizeRef.current)
        const fly = flyState.current
        fly.active = true
        fly.t = 0
        fly.startPos.copy(cameraRef.current.position)
        fly.endPos.copy(view.position)
        fly.startTarget.copy(getControlsTargetRef.current())
        fly.endTarget.copy(view.target)
      }
    }

    function handleKeyUp(e: KeyboardEvent) {
      keysPressed.current.delete(e.key.toLowerCase())
    }

    // A key released while the window is unfocused never sends keyup; drop it so the camera stops
    const releaseAll = () => keysPressed.current.clear()

    window.addEventListener("keydown", handleKeyDown)
    window.addEventListener("keyup", handleKeyUp)
    window.addEventListener("blur", releaseAll)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("keyup", handleKeyUp)
      window.removeEventListener("blur", releaseAll)
    }
  }, []) // Empty deps — listeners registered once, read from refs

  // Per-frame: fly animation + WASD panning
  useFrame((_, delta) => {
    const fly = flyState.current

    if (fly.active) {
      // Time-based, so the flight takes the same ~0.4 s on a 60 Hz and a 120 Hz display
      fly.t = Math.min(fly.t + Math.min(delta, 0.05) * 2.4, 1)
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
      maxPolarAngle={Math.PI / 2 - 0.05} // never below the ground, which is one-sided
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
