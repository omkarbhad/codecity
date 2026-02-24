"use client"

import * as THREE from "three"

export function Ground() {
  return (
    <group>
      {/* Dark ground plane */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0, 0]}
        receiveShadow
      >
        <planeGeometry args={[300, 300]} />
        <meshStandardMaterial color="#0d0d14" roughness={0.95} />
      </mesh>

      {/* Grid overlay */}
      <gridHelper
        args={[
          300,
          60,
          new THREE.Color("#1a1a2e"),
          new THREE.Color("#0d0d14"),
        ]}
        position={[0, 0.01, 0]}
      />
    </group>
  )
}
