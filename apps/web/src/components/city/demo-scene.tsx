"use client"

import { Suspense, useMemo, useRef } from "react"
import dynamic from "next/dynamic"
import { Canvas, useFrame } from "@react-three/fiber"
import * as THREE from "three"
import { SAMPLE_CITY_DATA } from "@/lib/sample-city-data"
import { Lighting } from "./lighting"
import { Ground } from "./ground"
import { DistrictGround } from "./district-ground"
import { InstancedBuildings } from "./instanced-buildings"
import { DependencyPipes } from "./dependency-pipes"

/**
 * Auto-orbiting camera for the homepage demo.
 * Orbits around the city center to showcase the visualization.
 */
function CameraOrbit({ speed = 0.5 }: { speed?: number }) {
  const angleRef = useRef(0)

  // Compute city center and orbit radius from the snapshot
  const { center, radius, height } = useMemo(() => {
    const files = SAMPLE_CITY_DATA.files
    if (files.length === 0) return { center: [0, 0] as const, radius: 20, height: 16 }
    const xs = files.map((f) => f.position.x)
    const zs = files.map((f) => f.position.z)
    const cx = (Math.min(...xs) + Math.max(...xs)) / 2
    const cz = (Math.min(...zs) + Math.max(...zs)) / 2
    const spread = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...zs) - Math.min(...zs))
    return {
      center: [cx, cz] as const,
      radius: spread * 0.8,
      height: spread * 0.6,
    }
  }, [])

  useFrame(({ camera }, delta) => {
    angleRef.current += delta * speed * 0.4
    camera.position.x = Math.cos(angleRef.current) * radius + center[0]
    camera.position.z = Math.sin(angleRef.current) * radius + center[1]
    camera.position.y = height
    camera.lookAt(center[0], 1, center[1])
  })

  return null
}

/** Ambient floating particles for atmosphere (matches real canvas) */
function AmbientParticles({ count = 150, spread = 60 }: { count?: number; spread?: number }) {
  const mesh = useRef<THREE.Points>(null)

  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * spread
      arr[i * 3 + 1] = Math.random() * 40 + 5
      arr[i * 3 + 2] = (Math.random() - 0.5) * spread
    }
    return arr
  }, [count, spread])

  useFrame(({ clock }) => {
    if (!mesh.current) return
    mesh.current.rotation.y = clock.getElapsedTime() * 0.005
    mesh.current.position.y = Math.sin(clock.getElapsedTime() * 0.15) * 0.5
  })

  return (
    <points ref={mesh}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color="#99aaff"
        size={0.22}
        transparent
        opacity={0.55}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  )
}

/**
 * Demo scene that uses the exact same rendering components as the real product.
 * Only difference: auto-orbiting camera instead of interactive CameraController.
 */
function DemoSceneInner() {
  const snapshot = SAMPLE_CITY_DATA

  return (
    <Canvas
      gl={{
        antialias: true,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.4,
        powerPreference: "low-power",
      }}
      camera={{ position: [30, 20, 30], fov: 50, near: 0.5, far: 3000 }}
      style={{ width: "100%", height: "100%" }}
      onCreated={({ gl }) => {
        gl.setPixelRatio(Math.min(window.devicePixelRatio, 2))
        const canvas = gl.domElement
        canvas.addEventListener("webglcontextlost", (e) => {
          e.preventDefault()
        })
      }}
    >
      <color attach="background" args={["#040408"]} />
      <Suspense fallback={null}>
        <CameraOrbit speed={0.5} />

        {/* Same lighting as the real canvas */}
        <Lighting snapshot={snapshot} />

        {/* Same ground with adaptive grid */}
        <Ground snapshot={snapshot} />

        {/* Same district ground plates */}
        {snapshot.districts.map((d) => (
          <DistrictGround key={d.name} district={d} />
        ))}

        {/* Same instanced buildings (uses real InstancedMesh rendering) */}
        <InstancedBuildings snapshot={snapshot} />

        {/* Same dependency pipes */}
        <DependencyPipes snapshot={snapshot} />

        {/* Atmosphere particles */}
        <AmbientParticles count={150} spread={60} />
      </Suspense>

      <fogExp2 attach="fog" args={["#040408", 0.004]} />
    </Canvas>
  )
}

export default dynamic(() => Promise.resolve(DemoSceneInner), { ssr: false })
