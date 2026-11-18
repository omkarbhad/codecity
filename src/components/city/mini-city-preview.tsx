"use client"

import { Suspense, useEffect, useMemo, useRef, useState } from "react"
import dynamic from "next/dynamic"
import { Canvas, useThree } from "@react-three/fiber"
import * as THREE from "three"
import type { CitySnapshot } from "@/lib/types/city"
import { getCityBounds, type CityBounds } from "@/lib/visualization/city-bounds"
import { getBuildingHeight } from "@/lib/visualization/building-dimensions"
import { DistrictGround } from "./district-ground"
import { InstancedBuildings } from "./instanced-buildings"
import { useSceneLook } from "@/lib/theme"

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
    const estimatedHeight = Math.max(8, getBuildingHeight({ lines: maxLines }))
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
  const look = useSceneLook()
  return (
    <>
      <hemisphereLight color={look.hemi.sky} groundColor={look.hemi.ground} intensity={look.hemi.intensity} />
      <ambientLight color={look.ambient.color} intensity={look.ambient.intensity} />
      <directionalLight color={look.key.color} intensity={look.key.intensity} position={[45, 70, 52]} />
      <directionalLight color={look.fill.color} intensity={look.fill.intensity} position={[-55, 35, -34]} />
      <directionalLight color={look.warm.color} intensity={look.warm.intensity} position={[-20, 12, 60]} />
    </>
  )
}

function MiniPreviewGround({ cityBounds }: { cityBounds: CityBounds }) {
  const look = useSceneLook()
  const groundSize = Math.max(160, cityBounds.spread * 3.8)
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[cityBounds.centerX, -0.015, cityBounds.centerZ]}>
      <planeGeometry args={[groundSize, groundSize]} />
      <meshStandardMaterial color={look.ground} roughness={0.92} />
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
          dpr={[1, 1.5]} // capped for thumbnails; a prop, since fiber re-applies dpr over setPixelRatio
        >
          <SceneBackground />
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

/** Canvas background in the scene's fog colour (dusk or day). */
function SceneBackground() {
  const look = useSceneLook()
  return <color attach="background" args={[look.fog]} />
}
