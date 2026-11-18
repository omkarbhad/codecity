"use client"

import { useEffect, useMemo } from "react"
import * as THREE from "three"
import { DUSK_SCENE, useSceneLook } from "@/lib/theme"
import type { DistrictData } from "@/lib/types/city"

/** Gradient night sky with a faint city glow on the horizon and sparse stars. */
export function NightSky({ centerX, centerZ, radius }: { centerX: number; centerZ: number; radius: number }) {
  const look = useSceneLook()
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        // Fog and the background colour are not tone-mapped; matching them keeps the horizon seamless
        toneMapped: false,
        uniforms: {
          uZenith: { value: new THREE.Color(DUSK_SCENE.sky.zenith) },
          uHorizon: { value: new THREE.Color(DUSK_SCENE.sky.horizon) },
          uGlow: { value: new THREE.Color(DUSK_SCENE.sky.glow) },
          uStars: { value: 1 },
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
          uniform float uStars;
          varying vec3 vDir;
          float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
          void main() {
            vec3 d = normalize(vDir);
            float h = d.y;
            vec3 col = mix(uHorizon, uZenith, smoothstep(0.0, 0.55, h));
            // The glow starts at zero on the horizon line, where the sky meets the fogged ground,
            // so no seam shows there; it peaks just above and fades out.
            col += uGlow * smoothstep(0.0, 0.05, h) * (1.0 - smoothstep(0.05, 0.26, h)) * 0.7;
            vec2 sp = vec2(atan(d.z, d.x) * 95.0, h * 190.0);
            vec2 id = floor(sp);
            float star = step(0.993, hash(id)) * smoothstep(0.38, 0.0, length(fract(sp) - 0.5)) * smoothstep(0.12, 0.45, h);
            star *= uStars;
            col += vec3(0.85, 0.9, 1.0) * star * (0.35 + 0.65 * hash(id + 3.1));
            gl_FragColor = vec4(col, 1.0);
            #include <tonemapping_fragment>
            #include <colorspace_fragment>
          }
        `,
      }),
    []
  )
  useEffect(() => {
    material.uniforms.uZenith.value.set(look.sky.zenith)
    material.uniforms.uHorizon.value.set(look.sky.horizon)
    material.uniforms.uGlow.value.set(look.sky.glow)
    material.uniforms.uStars.value = look.streetLights > 0 ? 1 : 0
  }, [material, look])
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

/** Soft white street lamps along the streets around each district block. */
export function StreetLights({ districts }: { districts: DistrictData[] }) {
  const look = useSceneLook()
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

  if (positions.length === 0 || look.streetLights === 0) return null

  return (
    <points frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        map={glow}
        color="#dfe6f5"
        size={0.55}
        sizeAttenuation
        transparent
        opacity={look.streetLights}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  )
}
