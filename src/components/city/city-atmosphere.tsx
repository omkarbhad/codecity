"use client"

import { useEffect, useMemo } from "react"
import * as THREE from "three"
import type { DistrictData } from "@/lib/types/city"

/** Night horizon color; the scene fog uses the same color so distant buildings fade into the sky. */
export const NIGHT_HORIZON = "#0d1222"

/** Gradient night sky with a faint city glow on the horizon and sparse stars. */
export function NightSky({ centerX, centerZ, radius }: { centerX: number; centerZ: number; radius: number }) {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        uniforms: {
          uZenith: { value: new THREE.Color("#03040a") },
          uHorizon: { value: new THREE.Color(NIGHT_HORIZON) },
          uGlow: { value: new THREE.Color("#2b2742") },
        },
        vertexShader: /* glsl */ `
          varying vec3 vDir;
          void main() {
            vDir = normalize(position);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: /* glsl */ `
          uniform vec3 uZenith;
          uniform vec3 uHorizon;
          uniform vec3 uGlow;
          varying vec3 vDir;
          float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
          void main() {
            vec3 d = normalize(vDir);
            float h = d.y;
            vec3 col = mix(uHorizon, uZenith, smoothstep(0.0, 0.55, h));
            col += uGlow * (1.0 - smoothstep(0.0, 0.2, abs(h))) * 0.7;
            vec2 sp = vec2(atan(d.z, d.x) * 95.0, h * 190.0);
            vec2 id = floor(sp);
            float star = step(0.993, hash(id)) * smoothstep(0.38, 0.0, length(fract(sp) - 0.5)) * smoothstep(0.12, 0.45, h);
            col += vec3(0.85, 0.9, 1.0) * star * (0.35 + 0.65 * hash(id + 3.1));
            gl_FragColor = vec4(col, 1.0);
            #include <tonemapping_fragment>
            #include <colorspace_fragment>
          }
        `,
      }),
    []
  )
  useEffect(() => () => material.dispose(), [material])

  return (
    <mesh position={[centerX, 0, centerZ]} material={material} renderOrder={-1} frustumCulled={false}>
      <sphereGeometry args={[radius, 48, 24]} />
    </mesh>
  )
}

const LAMP_SPACING = 2.4
const LAMP_OFFSET = 0.45
const LAMP_HEIGHT = 0.55
const MAX_LAMPS = 4000

/** Warm street lamps along the streets around each district block. */
export function StreetLights({ districts }: { districts: DistrictData[] }) {
  const positions = useMemo(() => {
    const points: number[] = []
    for (const { bounds } of districts) {
      if (points.length / 3 >= MAX_LAMPS) break
      if (bounds.width * bounds.depth < 6) continue
      const x0 = bounds.x - LAMP_OFFSET
      const z0 = bounds.z - LAMP_OFFSET
      const x1 = bounds.x + bounds.width + LAMP_OFFSET
      const z1 = bounds.z + bounds.depth + LAMP_OFFSET
      const edges = [
        [x0, z0, x1, z0],
        [x1, z0, x1, z1],
        [x1, z1, x0, z1],
        [x0, z1, x0, z0],
      ]
      for (const [ax, az, bx, bz] of edges) {
        const steps = Math.max(1, Math.floor(Math.hypot(bx - ax, bz - az) / LAMP_SPACING))
        for (let i = 0; i < steps; i++) {
          const t = i / steps
          points.push(ax + (bx - ax) * t, LAMP_HEIGHT, az + (bz - az) * t)
        }
      }
    }
    return new Float32Array(points)
  }, [districts])

  const glow = useMemo(() => {
    const size = 64
    const canvas = document.createElement("canvas")
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext("2d")!
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
    g.addColorStop(0, "rgba(255,255,255,1)")
    g.addColorStop(0.18, "rgba(255,255,255,0.85)")
    g.addColorStop(0.45, "rgba(255,255,255,0.18)")
    g.addColorStop(1, "rgba(255,255,255,0)")
    ctx.fillStyle = g
    ctx.fillRect(0, 0, size, size)
    return new THREE.CanvasTexture(canvas)
  }, [])
  useEffect(() => () => glow.dispose(), [glow])

  if (positions.length === 0) return null

  return (
    <points frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        map={glow}
        color="#e8954a"
        size={0.55}
        sizeAttenuation
        transparent
        opacity={0.7}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  )
}
