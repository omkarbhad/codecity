"use client"

import { Suspense, useMemo, useRef } from "react"
import dynamic from "next/dynamic"
import { Canvas, useFrame } from "@react-three/fiber"
import * as THREE from "three"
import type { CitySnapshot } from "@/lib/types/city"
import { Lighting } from "./lighting"
import { Ground } from "./ground"
import { DistrictGround } from "./district-ground"
import { InstancedBuildings } from "./instanced-buildings"

interface MiniCityPreviewProps {
  snapshot: CitySnapshot
  /** Orbit speed multiplier. Default 0.5 */
  speed?: number
  className?: string
}

/** Auto-orbiting camera tuned for thumbnail-size canvases */
function MiniCameraOrbit({ snapshot, speed = 0.5 }: { snapshot: CitySnapshot; speed?: number }) {
  const angleRef = useRef(Math.random() * Math.PI * 2) // random start angle per card

  const { center, radius, height } = useMemo(() => {
    const files = snapshot.files
    if (files.length === 0) return { center: [0, 0] as const, radius: 20, height: 14 }
    const xs = files.map((f) => f.position.x)
    const zs = files.map((f) => f.position.z)
    const cx = (Math.min(...xs) + Math.max(...xs)) / 2
    const cz = (Math.min(...zs) + Math.max(...zs)) / 2
    const spread = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...zs) - Math.min(...zs), 8)
    return {
      center: [cx, cz] as const,
      radius: spread * 0.75,
      height: spread * 0.55,
    }
  }, [snapshot])

  useFrame(({ camera }, delta) => {
    angleRef.current += delta * speed * 0.35
    camera.position.x = Math.cos(angleRef.current) * radius + center[0]
    camera.position.z = Math.sin(angleRef.current) * radius + center[1]
    camera.position.y = height
    camera.lookAt(center[0], 1, center[1])
  })

  return null
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

function MiniCityPreviewInner({ snapshot, speed = 0.5 }: MiniCityPreviewProps) {
  return (
    <Canvas
      gl={{
        antialias: false, // off for perf in thumbnail
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.4,
        powerPreference: "low-power",
      }}
      shadows={false} // no shadows for thumbnails — big perf win
      camera={{ position: [30, 20, 30], fov: 55, near: 0.5, far: 2000 }}
      style={{ width: "100%", height: "100%" }}
      onCreated={({ gl }) => {
        gl.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
      }}
    >
      <color attach="background" args={["#040408"]} />
      <Suspense fallback={null}>
        <MiniCameraOrbit snapshot={snapshot} speed={speed} />
        <Lighting snapshot={snapshot} />
        <Ground snapshot={snapshot} />
        {snapshot.districts.map((d) => (
          <DistrictGround key={d.name} district={d} />
        ))}
        <InstancedBuildings snapshot={snapshot} />
        <MiniParticles spread={40} />
      </Suspense>
      <fogExp2 attach="fog" args={["#040408", 0.006]} />
    </Canvas>
  )
}

/** SSR-safe mini 3D city preview canvas. Wrap in a sized container. */
export const MiniCityPreview = dynamic(
  () => Promise.resolve(MiniCityPreviewInner),
  { ssr: false }
)
