"use client"

import { Suspense, useEffect, useMemo, useRef, useState } from "react"
import dynamic from "next/dynamic"
import { Canvas, useThree } from "@react-three/fiber"
import * as THREE from "three"
import type { CitySnapshot } from "@/lib/types/city"
import { getCityBounds, type CityBounds } from "@/lib/visualization/city-bounds"
import { getBuildingHeight } from "@/lib/visualization/building-dimensions"
import { DistrictGround } from "./district-ground"
import { Lighting } from "./lighting"
import { Ground } from "./ground"
import { getCityBox, getOverview } from "./camera-controller"
import { InstancedBuildings } from "./instanced-buildings"
import { useSceneLook } from "@/lib/theme"

interface MiniCityPreviewProps {
  snapshot: CitySnapshot
  /** Kept for compatibility with existing cards. Previews are intentionally static. */
  speed?: number
  className?: string
}

/**
 * The same overview the project page opens on (same angle, same fit), so the
 * thumbnail is a small picture of the city you get when you open it.
 */
function MiniCameraFit({ snapshot, cityBounds }: { snapshot: CitySnapshot; cityBounds: CityBounds }) {
  const { camera, size } = useThree()
  const box = useMemo(() => {
    const maxHeight = snapshot.files.reduce((max, file) => Math.max(max, getBuildingHeight(file)), 0)
    return getCityBox(snapshot, cityBounds, maxHeight)
  }, [snapshot, cityBounds])

  useEffect(() => {
    const view = getOverview(box, camera, size, { top: 6, bottom: 6 })
    camera.position.copy(view.position)
    camera.lookAt(view.target)
    camera.updateProjectionMatrix()
  }, [camera, box, size])

  return null
}

function MiniCityPreviewInner({ snapshot, className }: MiniCityPreviewProps) {
  const cityBounds = useMemo(() => getCityBounds(snapshot.files), [snapshot.files])

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
            // Same tone mapping as the city, so the colours match
            toneMapping: THREE.NeutralToneMapping,
            toneMappingExposure: 1.0,
            powerPreference: "low-power",
          }}
          shadows={false} // no shadows for thumbnails — big perf win
          camera={{ position: [30, 20, 30], fov: 50, near: 0.5, far: 5000 }}
          style={{ width: "100%", height: "100%" }}
          dpr={[1, 1.5]} // capped for thumbnails; a prop, since fiber re-applies dpr over setPixelRatio
        >
          <SceneBackground />
          <Suspense fallback={null}>
            <MiniCameraFit snapshot={snapshot} cityBounds={cityBounds} />
            {/* The city's own lights and ground (shadows stay off for thumbnails) */}
            <Lighting snapshot={snapshot} cityBounds={cityBounds} />
            <Ground snapshot={snapshot} cityBounds={cityBounds} farPlane={5000} />
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
