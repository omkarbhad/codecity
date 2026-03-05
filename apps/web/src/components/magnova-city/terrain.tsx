"use client"

import { useRef, useMemo } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"
import type { SpaceData } from "@/lib/magnova/types"

// Minimal 2D simplex noise - adapted from Stefan Gustavson
function createNoise2D(seed = 0) {
  const perm = new Uint8Array(512)
  const grad2 = [
    [1, 1],
    [-1, 1],
    [1, -1],
    [-1, -1],
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ]

  // Simple seeded random
  let s = seed
  const random = () => {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }

  const p = Array.from({ length: 256 }, (_, i) => i)
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[p[i], p[j]] = [p[j], p[i]]
  }

  for (let i = 0; i < 512; i++) {
    perm[i] = p[i & 255]
  }

  return (x: number, y: number): number => {
    const F2 = 0.5 * (Math.sqrt(3) - 1)
    const G2 = (3 - Math.sqrt(3)) / 6
    const s = (x + y) * F2
    const i = Math.floor(x + s)
    const j = Math.floor(y + s)
    const t = (i + j) * G2
    const X0 = i - t
    const Y0 = j - t
    const x0 = x - X0
    const y0 = y - Y0
    const [i1, j1] = x0 > y0 ? [1, 0] : [0, 1]
    const x1 = x0 - i1 + G2
    const y1 = y0 - j1 + G2
    const x2 = x0 - 1 + 2 * G2
    const y2 = y0 - 1 + 2 * G2
    const ii = i & 255
    const jj = j & 255
    const gi0 = perm[ii + perm[jj]] % 8
    const gi1 = perm[ii + i1 + perm[jj + j1]] % 8
    const gi2 = perm[ii + 1 + perm[jj + 1]] % 8

    let n0 = 0
    let n1 = 0
    let n2 = 0

    let t0 = 0.5 - x0 * x0 - y0 * y0
    if (t0 > 0) {
      t0 *= t0
      n0 = t0 * t0 * (grad2[gi0][0] * x0 + grad2[gi0][1] * y0)
    }

    let t1 = 0.5 - x1 * x1 - y1 * y1
    if (t1 > 0) {
      t1 *= t1
      n1 = t1 * t1 * (grad2[gi1][0] * x1 + grad2[gi1][1] * y1)
    }

    let t2 = 0.5 - x2 * x2 - y2 * y2
    if (t2 > 0) {
      t2 *= t2
      n2 = t2 * t2 * (grad2[gi2][0] * x2 + grad2[gi2][1] * y2)
    }

    return 70 * (n0 + n1 + n2)
  }
}

interface TerrainProps {
  spaces: SpaceData[]
}

export function Terrain({ spaces }: TerrainProps) {
  const terrainRef = useRef<THREE.Mesh>(null)
  const waterRef = useRef<THREE.Mesh>(null)

  // Generate terrain geometry and colors
  const { geometry, colors } = useMemo(() => {
    const noise2D = createNoise2D(42)
    const terrainGeom = new THREE.PlaneGeometry(120, 120, 80, 80)

    const positions = terrainGeom.attributes.position.array as Float32Array
    const colors = new Float32Array(positions.length)

    // Create a map of space positions for flattening
    const spaceMap = new Map<number, { x: number; z: number; flattened: boolean }>()
    spaces.forEach((space) => {
      if (space.position) {
        spaceMap.set(0, {
          x: space.position.x,
          z: space.position.z,
          flattened: false,
        })
      }
    })

    // Generate heights using Simplex noise
    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i]
      const z = positions[i + 2]

      // Multi-octave Simplex noise
      let height = 0
      height += noise2D(x * 0.04, z * 0.04) * 2
      height += noise2D(x * 0.08, z * 0.08) * 1

      height *= 0.75 // Scale to 0-3 range approximately

      // Flatten areas near buildings
      let nearBuilding = false
      for (const space of spaces) {
        if (space.position) {
          const dx = x - space.position.x
          const dz = z - space.position.z
          const distance = Math.sqrt(dx * dx + dz * dz)

          if (distance < 5) {
            // Smooth falloff
            const falloff = 1 - distance / 5
            const targetHeight = 0.1
            height = THREE.MathUtils.lerp(height, targetHeight, falloff * falloff)
            nearBuilding = distance < 4
          }
        }
      }

      positions[i + 1] = height

      // Color vertices by height
      let color = new THREE.Color()

      if (height < -0.2) {
        // Water blue
        color.setHex(0x5b9bd5)
      } else if (height < 0.3) {
        // Sand
        color.setHex(0xe8d5b7)
      } else if (height < 1.0) {
        // Grass
        color.setHex(0x7cb342)
      } else if (height < 2.0) {
        // Dark grass
        color.setHex(0x558b2f)
      } else {
        // Rock
        color.setHex(0x78909c)
      }

      // Override with dirt/path near buildings
      if (nearBuilding) {
        color.setHex(0xa1887f)
      }

      colors[i] = color.r
      colors[i + 1] = color.g
      colors[i + 2] = color.b
    }

    terrainGeom.setAttribute("color", new THREE.BufferAttribute(colors, 3))
    terrainGeom.rotateX(-Math.PI / 2)
    terrainGeom.computeVertexNormals()

    return { geometry: terrainGeom, colors }
  }, [spaces])

  // Create water geometry
  const waterGeometry = useMemo(() => {
    const waterGeom = new THREE.PlaneGeometry(130, 130)
    waterGeom.rotateX(-Math.PI / 2)
    waterGeom.translate(0, -0.2, 0)
    return waterGeom
  }, [])

  // Animate water
  useFrame(({ clock }) => {
    if (waterRef.current) {
      waterRef.current.position.y = -0.2 + Math.sin(clock.getElapsedTime() * 0.3) * 0.05
    }
  })

  return (
    <>
      {/* Terrain mesh */}
      <mesh ref={terrainRef} geometry={geometry}>
        <meshStandardMaterial
          vertexColors
          flatShading
          roughness={0.9}
          metalness={0.05}
        />
      </mesh>

      {/* Water plane */}
      <mesh ref={waterRef} geometry={waterGeometry}>
        <meshStandardMaterial
          color={0x5b9bd5}
          transparent
          opacity={0.6}
          flatShading
          roughness={0.4}
          metalness={0.2}
        />
      </mesh>
    </>
  )
}
