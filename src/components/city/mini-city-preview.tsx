"use client"

import { Suspense, useEffect, useMemo, useRef, useState } from "react"
import dynamic from "next/dynamic"
import { Canvas, useThree } from "@react-three/fiber"
import * as THREE from "three"
import type { CitySnapshot } from "@/lib/types/city"
import { getCityBounds, type CityBounds } from "@/lib/visualization/city-bounds"
import { DistrictGround } from "./district-ground"
import { InstancedBuildings } from "./instanced-buildings"
import { NIGHT_HORIZON } from "./city-atmosphere"

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
      radius: Math.max(15, spread * 0.78),
      height: Math.max(13, spread * 0.42, estimatedHeight * 1.05),
    }
  }, [cityBounds, maxLines])

  useEffect(() => {
    camera.position.set(center[0] + radius * 0.72, height, center[1] + radius * 0.9)
    camera.lookAt(center[0], Math.max(1.5, height * 0.2), center[1])
    camera.updateProjectionMatrix()
  }, [camera, center, height, radius])

  return null
}

function MiniPreviewLights() {
  return (
    <>
      <hemisphereLight color="#6f82b4" groundColor="#0b0d14" intensity={0.9} />
      <ambientLight color="#26304a" intensity={0.5} />
      <directionalLight color="#c9d6ff" intensity={1.6} position={[45, 70, 52]} />
      <directionalLight color="#4d6bb3" intensity={0.45} position={[-55, 35, -34]} />
      <directionalLight color="#ff9a5c" intensity={0.3} position={[-20, 12, 60]} />
    </>
  )
}

function MiniPreviewGround({ cityBounds }: { cityBounds: CityBounds }) {
  const groundSize = Math.max(160, cityBounds.spread * 3.8)
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[cityBounds.centerX, -0.015, cityBounds.centerZ]}>
      <planeGeometry args={[groundSize, groundSize]} />
      <meshStandardMaterial color="#0c0e13" roughness={0.92} />
    </mesh>
  )
}

function MiniCityPreviewInner({ snapshot, className }: MiniCityPreviewProps) {
  const cityBounds = useMemo(() => getCityBounds(snapshot.files), [snapshot.files])
  const maxLines = useMemo(() => Math.max(1, ...snapshot.files.map((file) => file.lines)), [snapshot.files])

  // Only keep a WebGL context while the card is on (or near) screen: browsers
  // cap live contexts (~16), and off-screen previews would burn GPU for nothing.
  const containerRef = useRef<HTMLDivElement>(null)
  const [onScreen, setOnScreen] = useState(false)
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const observer = new IntersectionObserver(([entry]) => setOnScreen(entry.isIntersecting), { rootMargin: "200px" })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={containerRef} className={className} style={{ width: "100%", height: "100%" }}>
      {onScreen && (
        <Canvas
          gl={{
            antialias: false, // off for perf in thumbnail
            toneMapping: THREE.ACESFilmicToneMapping,
            toneMappingExposure: 1.4,
            powerPreference: "low-power",
          }}
          shadows={false} // no shadows for thumbnails — big perf win
          camera={{ position: [30, 20, 30], fov: 42, near: 0.5, far: 5000 }}
          style={{ width: "100%", height: "100%" }}
          onCreated={({ gl }) => {
            gl.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
          }}
        >
          <color attach="background" args={[NIGHT_HORIZON]} />
          <Suspense fallback={null}>
            <MiniCameraFit cityBounds={cityBounds} maxLines={maxLines} />
            <MiniPreviewLights />
            <MiniPreviewGround cityBounds={cityBounds} />
            {snapshot.districts.map((d) => (
              <DistrictGround key={d.name} district={d} />
            ))}
            <InstancedBuildings snapshot={snapshot} />
            </Suspense>
        </Canvas>
      )}
    </div>
  )
}

/** SSR-safe mini 3D city preview canvas. Wrap in a sized container. */
export const MiniCityPreview = dynamic(
  () => Promise.resolve(MiniCityPreviewInner),
  { ssr: false }
)
