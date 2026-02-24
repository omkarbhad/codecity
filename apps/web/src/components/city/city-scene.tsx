"use client"

import dynamic from "next/dynamic"
import { Canvas } from "@react-three/fiber"
import { EffectComposer, Bloom } from "@react-three/postprocessing"
import * as THREE from "three"
import type { CitySnapshot } from "@/lib/types/city"
import { CityStoreProvider } from "./use-city-store"
import { Lighting } from "./lighting"
import { Ground } from "./ground"
import { DistrictGround } from "./district-ground"
import { Building } from "./building"
import { DependencyPipes } from "./dependency-pipes"
import { CameraController } from "./camera-controller"

interface CitySceneProps {
  snapshot: CitySnapshot
}

/** Canvas-only scene — assumes a CityStoreProvider exists higher in the tree. */
export function CitySceneCanvas({ snapshot }: CitySceneProps) {
  return (
    <Canvas
      gl={{
        antialias: true,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.1,
      }}
      shadows
      camera={{ position: [40, 40, 40], fov: 50 }}
      style={{ width: "100%", height: "100%" }}
    >
      <Lighting />
      <Ground />

      {snapshot.districts.map((d) => (
        <DistrictGround key={d.name} district={d} />
      ))}

      {snapshot.files.map((f) => (
        <Building key={f.path} file={f} snapshot={snapshot} />
      ))}

      <DependencyPipes snapshot={snapshot} />
      <CameraController snapshot={snapshot} />

      <EffectComposer>
        <Bloom luminanceThreshold={0.8} intensity={0.5} />
      </EffectComposer>

      <fog attach="fog" args={["#07070c", 30, 150]} />
    </Canvas>
  )
}

/** Standalone scene with its own CityStoreProvider — for use without an outer provider. */
function CitySceneStandalone({ snapshot }: CitySceneProps) {
  return (
    <CityStoreProvider>
      <CitySceneCanvas snapshot={snapshot} />
    </CityStoreProvider>
  )
}

export default dynamic(
  () => Promise.resolve({ default: CitySceneStandalone }),
  { ssr: false }
)

export { CityStoreProvider }
