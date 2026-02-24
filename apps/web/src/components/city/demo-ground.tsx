"use client"

import * as THREE from "three"

export function DemoGround() {
  return (
    <group>
      {/* Ground plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
        <planeGeometry args={[200, 200]} />
        <meshStandardMaterial color="#0d0d14" roughness={0.95} />
      </mesh>

      {/* Grid overlay */}
      <gridHelper
        args={[200, 100, new THREE.Color("#1a1a2e"), new THREE.Color("#1a1a2e")]}
        position={[0, 0, 0]}
      />
    </group>
  )
}
