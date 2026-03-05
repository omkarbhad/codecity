"use client"

import { useRef } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"

/** Warm daylight lighting for the Magnova low-poly city */
export function Lighting() {
  const dustRef = useRef<THREE.Points>(null)

  // Warm dust mote particles
  const dustPositions = new Float32Array(150 * 3)
  for (let i = 0; i < 150; i++) {
    dustPositions[i * 3] = (Math.random() - 0.5) * 100
    dustPositions[i * 3 + 1] = Math.random() * 20 + 2
    dustPositions[i * 3 + 2] = (Math.random() - 0.5) * 100
  }

  useFrame(({ clock }) => {
    if (!dustRef.current) return
    dustRef.current.rotation.y = clock.getElapsedTime() * 0.003
    dustRef.current.position.y = Math.sin(clock.getElapsedTime() * 0.1) * 0.3
  })

  return (
    <>
      {/* Sky & ground ambient */}
      <hemisphereLight
        args={["#87CEEB", "#8B7355", 0.6]}
      />

      {/* Soft global ambient */}
      <ambientLight color="#FFE4B5" intensity={0.3} />

      {/* Main sun — warm white, casts shadows */}
      <directionalLight
        color="#FFF5E1"
        intensity={1.5}
        position={[50, 80, 30]}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={200}
        shadow-camera-left={-60}
        shadow-camera-right={60}
        shadow-camera-top={60}
        shadow-camera-bottom={-60}
        shadow-bias={-0.001}
      />

      {/* Subtle fill from opposite side */}
      <directionalLight
        color="#B0C4DE"
        intensity={0.25}
        position={[-30, 40, -20]}
      />

      {/* Warm parchment fog */}
      <fogExp2 attach="fog" args={["#E8DCC8", 0.006]} />

      {/* Golden dust motes */}
      <points ref={dustRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[dustPositions, 3]}
          />
        </bufferGeometry>
        <pointsMaterial
          color="#FFD700"
          size={0.15}
          transparent
          opacity={0.4}
          sizeAttenuation
          depthWrite={false}
        />
      </points>
    </>
  )
}
