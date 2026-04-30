"use client"

import { Suspense, useEffect, useMemo, useRef } from "react"
import dynamic from "next/dynamic"
import { Canvas, useFrame, useThree } from "@react-three/fiber"
import * as THREE from "three"
import type { CitySnapshot } from "@/lib/types/city"
import { getCityBounds, type CityBounds } from "@/lib/visualization/city-bounds"
import { DistrictGround } from "./district-ground"
import { InstancedBuildings } from "./instanced-buildings"

interface MiniCityPreviewProps {
  snapshot: CitySnapshot
  /** Kept for compatibility with existing cards. Previews are intentionally static. */
  speed?: number
  className?: string
}

/** Static fitted camera tuned for thumbnail-size canvases. */
function MiniCameraFit({ cityBounds, maxLines }: { cityBounds: CityBounds; maxLines: number }) {
  const { camera } = useThree()
  const { center, radius, height } = useMemo(() => {
    const spread = Math.max(cityBounds.spread, 8)
    const estimatedHeight = Math.max(8, Math.min(80, Math.sqrt(Math.max(maxLines, 1)) * 2.2))
    return {
      center: [cityBounds.centerX, cityBounds.centerZ] as const,
      radius: Math.max(22, spread * 1.2),
      height: Math.max(18, spread * 0.58, estimatedHeight * 1.35),
    }
  }, [cityBounds, maxLines])

  useEffect(() => {
    camera.position.set(center[0] + radius * 0.82, height, center[1] + radius)
    camera.lookAt(center[0], Math.max(2, height * 0.18), center[1])
    camera.updateProjectionMatrix()
  }, [camera, center, height, radius])

  return null
}

function MiniPreviewLights() {
  return (
    <>
      <hemisphereLight color="#f5f7ff" groundColor="#20243a" intensity={1.15} />
      <ambientLight color="#c8d1ff" intensity={0.58} />
      <directionalLight color="#fff7e8" intensity={2.8} position={[45, 70, 52]} />
      <directionalLight color="#8fb1ff" intensity={1.1} position={[-55, 35, -34]} />
      <directionalLight color="#ffd3a3" intensity={0.55} position={[-20, 28, 60]} />
    </>
  )
}

function MiniPreviewGround({ cityBounds }: { cityBounds: CityBounds }) {
  const groundSize = Math.max(160, cityBounds.spread * 3.8)
  const gridDivisions = Math.min(80, Math.max(24, Math.round(groundSize / 8)))

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[cityBounds.centerX, -0.015, cityBounds.centerZ]}>
        <planeGeometry args={[groundSize, groundSize]} />
        <meshBasicMaterial color="#111216" />
      </mesh>
      <gridHelper
        args={[groundSize, gridDivisions, new THREE.Color("#3b3f4a"), new THREE.Color("#232630")]}
        position={[cityBounds.centerX, 0.01, cityBounds.centerZ]}
      />
    </group>
  )
}

/** Lightweight floating particles for atmosphere */
function MiniParticles({ spread = 40 }: { spread?: number }) {
  const mesh = useRef<THREE.Points>(null)
  const count = 80

  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * spread
      arr[i * 3 + 1] = Math.random() * 30 + 3
      arr[i * 3 + 2] = (Math.random() - 0.5) * spread
    }
    return arr
  }, [spread])

  useFrame(({ clock }) => {
    if (!mesh.current) return
    mesh.current.rotation.y = clock.getElapsedTime() * 0.004
    mesh.current.position.y = Math.sin(clock.getElapsedTime() * 0.12) * 0.4
  })

  return (
    <points ref={mesh}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color="#99aaff"
        size={0.18}
        transparent
        opacity={0.45}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  )
}

function MiniCityPreviewInner({ snapshot, className }: MiniCityPreviewProps) {
  const cityBounds = useMemo(() => getCityBounds(snapshot.files), [snapshot.files])
  const maxLines = useMemo(() => Math.max(1, ...snapshot.files.map((file) => file.lines)), [snapshot.files])

  return (
    <div className={className} style={{ width: "100%", height: "100%" }}>
      <Canvas
        gl={{
          antialias: false, // off for perf in thumbnail
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.95,
          powerPreference: "low-power",
        }}
        shadows={false} // no shadows for thumbnails — big perf win
        camera={{ position: [30, 20, 30], fov: 48, near: 0.5, far: 5000 }}
        style={{ width: "100%", height: "100%" }}
        onCreated={({ gl }) => {
          gl.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
        }}
      >
        <color attach="background" args={["#0b0c10"]} />
        <Suspense fallback={null}>
          <MiniCameraFit cityBounds={cityBounds} maxLines={maxLines} />
          <MiniPreviewLights />
          <MiniPreviewGround cityBounds={cityBounds} />
          {snapshot.districts.map((d) => (
            <DistrictGround key={d.name} district={d} />
          ))}
          <InstancedBuildings snapshot={snapshot} />
          <MiniParticles spread={40} />
        </Suspense>
      </Canvas>
    </div>
  )
}

/** SSR-safe mini 3D city preview canvas. Wrap in a sized container. */
export const MiniCityPreview = dynamic(
  () => Promise.resolve(MiniCityPreviewInner),
  { ssr: false }
)
