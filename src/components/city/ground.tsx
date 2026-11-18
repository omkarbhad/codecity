"use client"

import { useEffect, useMemo } from "react"
import * as THREE from "three"
import type { CitySnapshot } from "@/lib/types/city"
import type { CityBounds } from "@/lib/visualization/city-bounds"
import { getCityBounds } from "@/lib/visualization/city-bounds"
import { useSceneLook } from "@/lib/theme"

/**
 * Side of one grid square for a city of this size: about a fortieth of the city,
 * snapped to a power of two so squares stay whole numbers of world units.
 * A 60-wide city gets 2 (one building lot); a 600-wide one gets 16.
 */
function gridCell(spread: number): number {
  return Math.max(1, 2 ** Math.round(Math.log2(spread / 40)))
}

interface GroundProps {
  snapshot?: CitySnapshot
  cityBounds?: CityBounds
  /** Camera far plane; the ground fades out well before it so its edge never shows. */
  farPlane: number
}

/**
 * Asphalt ground that extends past the city; streets are the gaps between district blocks.
 * Past the city it fades into the fog colour, which is also the sky's horizon colour,
 * so the ground melts into the horizon instead of ending in a hard edge.
 */
export function Ground({ snapshot, cityBounds, farPlane }: GroundProps) {
  const look = useSceneLook()
  const { center, fadeStart, fadeEnd, cell } = useMemo(() => {
    const bounds = cityBounds ?? (snapshot ? getCityBounds(snapshot.files) : null)
    const spread = Math.max(bounds?.spread ?? 100, 100)
    const fadeEnd = Math.min(farPlane * 0.6, spread * 3)
    return {
      cell: gridCell(bounds?.spread ?? 100),
      center: [bounds?.centerX ?? 0, bounds?.centerZ ?? 0] as const,
      fadeStart: Math.min(spread * 0.9, fadeEnd * 0.5),
      fadeEnd,
    }
  }, [cityBounds, snapshot, farPlane])

  const material = useMemo(() => {
    const m = new THREE.MeshStandardMaterial({ roughness: 0.92, metalness: 0.05 })
    const uniforms = {
      uCenter: { value: new THREE.Vector2() },
      uFade: { value: new THREE.Vector2() },
      uLine: { value: new THREE.Color() },
      uCell: { value: 2 },
    }
    m.userData.ground = uniforms
    m.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, uniforms)
      shader.vertexShader = shader.vertexShader
        .replace("#include <common>", "#include <common>\nvarying vec2 vGroundXZ;")
        .replace("#include <begin_vertex>", "#include <begin_vertex>\nvGroundXZ = (modelMatrix * vec4(transformed, 1.0)).xz;")
      shader.fragmentShader = shader.fragmentShader
        .replace("#include <common>", "#include <common>\nvarying vec2 vGroundXZ;\nuniform vec2 uCenter;\nuniform vec2 uFade;\nuniform vec3 uLine;\nuniform float uCell;")
        .replace(
          "#include <color_fragment>",
          `#include <color_fragment>
// Around the city the asphalt carries a faint grid, sized to the city, that fades out
// with distance and before its lines get thinner than a pixel.
float ccNear = 1.0 - smoothstep(uFade.x * 0.2, uFade.x * 1.15, length(vGroundXZ - uCenter));
vec2 ccGp = vGroundXZ / uCell;
vec2 ccGw = max(fwidth(ccGp), vec2(1e-4));
vec2 ccGd = abs(fract(ccGp - 0.5) - 0.5) / ccGw;
float ccGrid = (1.0 - min(min(ccGd.x, ccGd.y), 1.0)) * (1.0 - smoothstep(0.08, 0.3, max(ccGw.x, ccGw.y)));
diffuseColor.rgb = mix(diffuseColor.rgb, uLine, 0.3 * ccGrid * ccNear);`
        )
        .replace(
          "#include <fog_fragment>",
          `#include <fog_fragment>
#ifdef USE_FOG
gl_FragColor.rgb = mix(gl_FragColor.rgb, fogColor, smoothstep(uFade.x, uFade.y, length(vGroundXZ - uCenter)));
#endif`
        )
    }
    m.customProgramCacheKey = () => "codecity-ground-fade-v3"
    return m
  }, [])
  useEffect(() => () => material.dispose(), [material])

  useEffect(() => {
    material.color.set(look.ground)
    material.userData.ground.uLine.value.set(look.groundLine)
    material.userData.ground.uCell.value = cell
    const u = material.userData.ground
    u.uCenter.value.set(center[0], center[1])
    u.uFade.value.set(fadeStart, fadeEnd)
  }, [material, look.ground, look.groundLine, center, fadeStart, fadeEnd, cell])

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[center[0], 0, center[1]]} receiveShadow material={material}>
      <planeGeometry args={[fadeEnd * 2.4, fadeEnd * 2.4]} />
    </mesh>
  )
}
