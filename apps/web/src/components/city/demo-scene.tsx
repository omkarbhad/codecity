"use client"

import dynamic from "next/dynamic"
import { Canvas } from "@react-three/fiber"
import { OrbitControls } from "@react-three/drei"
import { EffectComposer, Bloom } from "@react-three/postprocessing"
import * as THREE from "three"
import { DemoBuilding } from "./demo-building"
import { DemoGround } from "./demo-ground"
import { SAMPLE_CITY_DATA } from "@/lib/sample-city-data"

function DemoSceneInner() {
  // Build a color lookup from districts
  const districtColorMap = new Map(
    SAMPLE_CITY_DATA.districts.map((d) => [d.name, d.color])
  )

  return (
    <Canvas
      gl={{
        antialias: true,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.1,
      }}
      camera={{ position: [30, 25, 30], fov: 50 }}
      style={{ width: "100%", height: "100%" }}
    >
      <ambientLight color="#303050" intensity={0.7} />
      <directionalLight
        color="#ffeedd"
        intensity={0.7}
        position={[40, 60, 30]}
      />
      <directionalLight
        color="#4d94ff"
        intensity={0.2}
        position={[-30, 20, -10]}
      />

      <DemoGround />

      {SAMPLE_CITY_DATA.files.map((file) => (
        <DemoBuilding
          key={file.path}
          file={file}
          color={districtColorMap.get(file.district) ?? "#888888"}
        />
      ))}

      <OrbitControls
        autoRotate
        autoRotateSpeed={0.5}
        enableZoom={false}
        enablePan={false}
        enableRotate={false}
      />

      <fog attach="fog" args={["#07070c", 20, 80]} />

      <EffectComposer>
        <Bloom luminanceThreshold={0.8} intensity={0.3} />
      </EffectComposer>
    </Canvas>
  )
}

export default dynamic(() => Promise.resolve(DemoSceneInner), { ssr: false })
