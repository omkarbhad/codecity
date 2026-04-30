"use client"

import { useRef, useMemo, useEffect, memo } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"
import type { CitySnapshot, FileData } from "@/lib/types/city"
import { useCityStore } from "./use-city-store"

interface DependencyPipesProps {
  snapshot: CitySnapshot
}

const MAX_PIPES = 32
const ROAD_Y = 0.15
const CORE_RADIUS = 0.09
const GLOW_RADIUS = 0.22
const CORE_OPACITY = 0.75
const GLOW_OPACITY = 0.14
const TRAVERSE_SPEED = 5
const PARTICLES_PER_PIPE = 3

const OUTGOING_COLOR = "#ff6b6b"
const INCOMING_COLOR = "#4dabf7"

interface PipeData {
  curve: THREE.CurvePath<THREE.Vector3>
  color: string
  key: string
  distance: number
}

/**
 * Validate that a number is finite (not NaN, Infinity, or -Infinity).
 */
function isFiniteNum(n: number): boolean {
  return Number.isFinite(n)
}

/**
 * Build a right-angle road-following path between two buildings.
 * Returns null if any position is invalid.
 */
function buildRoadCurve(
  src: FileData,
  tgt: FileData,
  srcHeight: number,
  tgtHeight: number,
  jitterIndex: number = 0
): THREE.CurvePath<THREE.Vector3> | null {
  const sx = src.position.x
  const sz = src.position.z
  const tx = tgt.position.x
  const tz = tgt.position.z

  // Validate all positions are finite
  if (!isFiniteNum(sx) || !isFiniteNum(sz) || !isFiniteNum(tx) || !isFiniteNum(tz)) {
    return null
  }
  if (!isFiniteNum(srcHeight) || !isFiniteNum(tgtHeight)) {
    return null
  }

  const jitter = jitterIndex * 0.25
  const roadY = ROAD_Y + jitter

  const path = new THREE.CurvePath<THREE.Vector3>()

  const p1 = new THREE.Vector3(sx, srcHeight * 0.3, sz)
  const p2 = new THREE.Vector3(sx, roadY, sz)
  const p3 = new THREE.Vector3(tx, roadY, sz)
  const p4 = new THREE.Vector3(tx, roadY, tz)
  const p5 = new THREE.Vector3(tx, tgtHeight * 0.3, tz)

  const sameX = Math.abs(sx - tx) < 0.01
  const sameZ = Math.abs(sz - tz) < 0.01

  path.add(new THREE.LineCurve3(p1, p2))

  if (sameX && sameZ) {
    path.add(new THREE.LineCurve3(p2, p5))
  } else if (sameX) {
    path.add(new THREE.LineCurve3(p2, p4))
    path.add(new THREE.LineCurve3(p4, p5))
  } else if (sameZ) {
    path.add(new THREE.LineCurve3(p2, p3))
    path.add(new THREE.LineCurve3(p3, p5))
  } else {
    path.add(new THREE.LineCurve3(p2, p3))
    path.add(new THREE.LineCurve3(p3, p4))
    path.add(new THREE.LineCurve3(p4, p5))
  }

  return path
}

/**
 * Sample points along a curve into a flat Float32Array for tube cross-section.
 */
function buildTubeVertices(
  curve: THREE.CurvePath<THREE.Vector3>,
  segments: number,
  radius: number,
  radialSegments: number
): Float32Array | null {
  const points: THREE.Vector3[] = []
  for (let i = 0; i <= segments; i++) {
    try {
      const pt = curve.getPointAt(i / segments)
      points.push(pt)
    } catch {
      return null
    }
  }

  // Build tube via triangle strip around the path
  const vertices: number[] = []
  const up = new THREE.Vector3(0, 1, 0)

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i]
    const p1 = points[i + 1]
    const tangent = new THREE.Vector3().subVectors(p1, p0).normalize()

    // Handle degenerate tangent
    if (tangent.lengthSq() < 0.0001) continue

    const normal = new THREE.Vector3().crossVectors(tangent, up).normalize()
    if (normal.lengthSq() < 0.0001) {
      normal.set(1, 0, 0)
    }
    const binormal = new THREE.Vector3().crossVectors(tangent, normal).normalize()

    for (let j = 0; j < radialSegments; j++) {
      const theta0 = (j / radialSegments) * Math.PI * 2
      const theta1 = ((j + 1) / radialSegments) * Math.PI * 2

      const cos0 = Math.cos(theta0) * radius
      const sin0 = Math.sin(theta0) * radius
      const cos1 = Math.cos(theta1) * radius
      const sin1 = Math.sin(theta1) * radius

      // Two triangles per quad
      const a = p0.clone().addScaledVector(normal, cos0).addScaledVector(binormal, sin0)
      const b = p0.clone().addScaledVector(normal, cos1).addScaledVector(binormal, sin1)
      const c = p1.clone().addScaledVector(normal, cos0).addScaledVector(binormal, sin0)
      const d = p1.clone().addScaledVector(normal, cos1).addScaledVector(binormal, sin1)

      vertices.push(a.x, a.y, a.z, c.x, c.y, c.z, b.x, b.y, b.z)
      vertices.push(b.x, b.y, b.z, c.x, c.y, c.z, d.x, d.y, d.z)
    }
  }

  return new Float32Array(vertices)
}

export const DependencyPipes = memo(function DependencyPipes({ snapshot }: DependencyPipesProps) {
  const selectedFile = useCityStore((s) => s.selectedFile)

  const coreMeshRef = useRef<THREE.Mesh>(null)
  const glowMeshRef = useRef<THREE.Mesh>(null)
  const particlesRef = useRef<THREE.Points>(null)
  const prevGeomRef = useRef<{ core: THREE.BufferGeometry | null; glow: THREE.BufferGeometry | null }>({ core: null, glow: null })

  const fileMap = useMemo(() => {
    const map = new Map<string, FileData>()
    for (const f of snapshot.files) map.set(f.path, f)
    return map
  }, [snapshot.files])

  const pipes: PipeData[] = useMemo(() => {
    if (!selectedFile) return []
    const src = fileMap.get(selectedFile)
    if (!src) return []

    const result: PipeData[] = []
    const seen = new Set<string>()
    const srcHeight = Math.max(0.4, Math.min(18, src.lines / 50))
    let jitterIdx = 0

    for (const imp of src.imports) {
      if (result.length >= MAX_PIPES) break
      if (seen.has(`out-${imp}`)) continue
      seen.add(`out-${imp}`)
      const target = fileMap.get(imp)
      if (!target) continue

      const tgtHeight = Math.max(0.4, Math.min(18, target.lines / 50))
      const curve = buildRoadCurve(src, target, srcHeight, tgtHeight, jitterIdx++)
      if (!curve) continue
      const distance = Math.sqrt(
        (src.position.x - target.position.x) ** 2 +
        (src.position.z - target.position.z) ** 2
      )
      result.push({ key: `out-${imp}`, color: OUTGOING_COLOR, curve, distance })
    }

    for (const dep of src.importedBy) {
      if (result.length >= MAX_PIPES) break
      if (seen.has(`in-${dep}`)) continue
      seen.add(`in-${dep}`)
      const source = fileMap.get(dep)
      if (!source) continue

      const depHeight = Math.max(0.4, Math.min(18, source.lines / 50))
      const curve = buildRoadCurve(source, src, depHeight, srcHeight, jitterIdx++)
      if (!curve) continue
      const distance = Math.sqrt(
        (src.position.x - source.position.x) ** 2 +
        (src.position.z - source.position.z) ** 2
      )
      result.push({ key: `in-${dep}`, color: INCOMING_COLOR, curve, distance })
    }

    result.sort((a, b) => a.distance - b.distance)
    return result
  }, [selectedFile, fileMap])

  // Build merged tube geometries for all pipes
  useEffect(() => {
    if (pipes.length === 0) {
      // Clear previous geometries
      if (coreMeshRef.current) {
        if (prevGeomRef.current.core) prevGeomRef.current.core.dispose()
        coreMeshRef.current.geometry = new THREE.BufferGeometry()
        prevGeomRef.current.core = coreMeshRef.current.geometry
      }
      if (glowMeshRef.current) {
        if (prevGeomRef.current.glow) prevGeomRef.current.glow.dispose()
        glowMeshRef.current.geometry = new THREE.BufferGeometry()
        prevGeomRef.current.glow = glowMeshRef.current.geometry
      }
      return
    }

    const allCoreVerts: number[] = []
    const allCoreColors: number[] = []
    const allGlowVerts: number[] = []
    const allGlowColors: number[] = []

    for (const pipe of pipes) {
      const coreVerts = buildTubeVertices(pipe.curve, 20, CORE_RADIUS, 5)
      const glowVerts = buildTubeVertices(pipe.curve, 20, GLOW_RADIUS, 5)
      if (!coreVerts || !glowVerts) continue

      const color = new THREE.Color(pipe.color)
      const vertCountCore = coreVerts.length / 3
      for (let v = 0; v < vertCountCore; v++) {
        allCoreVerts.push(coreVerts[v * 3], coreVerts[v * 3 + 1], coreVerts[v * 3 + 2])
        allCoreColors.push(color.r, color.g, color.b)
      }

      const vertCountGlow = glowVerts.length / 3
      for (let v = 0; v < vertCountGlow; v++) {
        allGlowVerts.push(glowVerts[v * 3], glowVerts[v * 3 + 1], glowVerts[v * 3 + 2])
        allGlowColors.push(color.r, color.g, color.b)
      }
    }

    // Core geometry
    if (coreMeshRef.current) {
      const geom = new THREE.BufferGeometry()
      geom.setAttribute("position", new THREE.Float32BufferAttribute(allCoreVerts, 3))
      geom.setAttribute("color", new THREE.Float32BufferAttribute(allCoreColors, 3))
      if (prevGeomRef.current.core) prevGeomRef.current.core.dispose()
      coreMeshRef.current.geometry = geom
      prevGeomRef.current.core = geom
    }

    // Glow geometry
    if (glowMeshRef.current) {
      const geom = new THREE.BufferGeometry()
      geom.setAttribute("position", new THREE.Float32BufferAttribute(allGlowVerts, 3))
      geom.setAttribute("color", new THREE.Float32BufferAttribute(allGlowColors, 3))
      if (prevGeomRef.current.glow) prevGeomRef.current.glow.dispose()
      glowMeshRef.current.geometry = geom
      prevGeomRef.current.glow = geom
    }

    return () => {
      if (prevGeomRef.current.core) { prevGeomRef.current.core.dispose(); prevGeomRef.current.core = null }
      if (prevGeomRef.current.glow) { prevGeomRef.current.glow.dispose(); prevGeomRef.current.glow = null }
    }
  }, [pipes])

  // Build particle positions + colors for flow animation
  const particleData = useMemo(() => {
    if (pipes.length === 0) return null
    const totalParticles = pipes.length * PARTICLES_PER_PIPE
    const positions = new Float32Array(totalParticles * 3)
    const colors = new Float32Array(totalParticles * 3)
    const offsets = new Float32Array(totalParticles) // per-particle offset

    let idx = 0
    for (let pi = 0; pi < pipes.length; pi++) {
      const color = new THREE.Color(pipes[pi].color)
      for (let p = 0; p < PARTICLES_PER_PIPE; p++) {
        offsets[idx] = p / PARTICLES_PER_PIPE
        colors[idx * 3] = color.r
        colors[idx * 3 + 1] = color.g
        colors[idx * 3 + 2] = color.b
        idx++
      }
    }

    return { positions, colors, offsets, count: totalParticles }
  }, [pipes])

  // Animate particles along their curves
  useFrame(({ clock }) => {
    if (!particlesRef.current || !particleData || pipes.length === 0) return
    const t = clock.getElapsedTime()
    const posAttr = particlesRef.current.geometry.getAttribute("position") as THREE.BufferAttribute
    if (!posAttr) return

    let idx = 0
    for (let pi = 0; pi < pipes.length; pi++) {
      const curve = pipes[pi].curve
      for (let p = 0; p < PARTICLES_PER_PIPE; p++) {
        const param = ((t / TRAVERSE_SPEED) + particleData.offsets[idx]) % 1
        try {
          const point = curve.getPointAt(param)
          posAttr.setXYZ(idx, point.x, point.y, point.z)
        } catch {
          posAttr.setXYZ(idx, 0, -1000, 0)
        }
        idx++
      }
    }
    posAttr.needsUpdate = true
  })

  if (pipes.length === 0) return null

  return (
    <group>
      {/* Merged core tubes */}
      <mesh ref={coreMeshRef}>
        <bufferGeometry />
        <meshBasicMaterial vertexColors transparent opacity={CORE_OPACITY} />
      </mesh>

      {/* Merged glow tubes */}
      <mesh ref={glowMeshRef}>
        <bufferGeometry />
        <meshBasicMaterial vertexColors transparent opacity={GLOW_OPACITY} depthWrite={false} />
      </mesh>

      {/* Flow particles as single Points */}
      {particleData && (
        <points ref={particlesRef}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              args={[particleData.positions, 3]}
            />
            <bufferAttribute
              attach="attributes-color"
              args={[particleData.colors, 3]}
            />
          </bufferGeometry>
          <pointsMaterial
            vertexColors
            size={0.3}
            transparent
            opacity={0.85}
            sizeAttenuation
            depthWrite={false}
          />
        </points>
      )}
    </group>
  )
})
