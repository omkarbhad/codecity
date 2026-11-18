"use client"

import { useEffect, useMemo, useRef } from "react"
import { useFrame } from "@react-three/fiber"
import { Html } from "@react-three/drei"
import * as THREE from "three"
import type { CitySnapshot } from "@/lib/types/city"
import type { AgentSession } from "@/lib/tauri"
import { getBuildingHeight, getBuildingWidth } from "@/lib/visualization/building-dimensions"
import { THEME } from "@/lib/theme"
import { AGENTS } from "./use-agent-activity"

interface AgentWorkersProps {
  snapshot: CitySnapshot
  sessions: AgentSession[]
  uncommitted: Set<string>
}

interface Site {
  x: number
  z: number
  width: number
  height: number
}

/** Scaffolding stands this far off a building's walls. */
const SCAFFOLD_GAP = 0.14
/** Builders are drawn larger than life so they can be found from the overview. */
const WORKER_SCALE = 1.5
const WALK_SPEED = 16

/** The twelve edges of a box around a building, as line-segment vertices. */
function pushScaffold(out: number[], site: Site) {
  const h = site.width / 2 + SCAFFOLD_GAP
  const x0 = site.x - h, x1 = site.x + h, z0 = site.z - h, z1 = site.z + h
  const y0 = 0.02, y1 = site.height + SCAFFOLD_GAP
  const corners = [[x0, z0], [x1, z0], [x1, z1], [x0, z1]]
  for (let i = 0; i < 4; i++) {
    const [ax, az] = corners[i]
    const [bx, bz] = corners[(i + 1) % 4]
    out.push(ax, y0, az, bx, y0, bz, ax, y1, az, bx, y1, bz, ax, y0, az, ax, y1, az)
    // A rail every few floors, like the decks of a scaffold
    for (let y = 2.5; y < y1 - 1; y += 2.5) out.push(ax, y, az, bx, y, bz)
  }
}

function Scaffolds({ sites, color, pulse }: { sites: Site[]; color: string; pulse: boolean }) {
  const material = useRef<THREE.LineBasicMaterial>(null)
  const geometry = useMemo(() => {
    const points: number[] = []
    sites.forEach((site) => pushScaffold(points, site))
    const g = new THREE.BufferGeometry()
    g.setAttribute("position", new THREE.Float32BufferAttribute(points, 3))
    return g
  }, [sites])
  useEffect(() => () => geometry.dispose(), [geometry])

  // Uncommitted work breathes; committed work is a quiet outline
  useFrame(({ clock }) => {
    if (material.current) material.current.opacity = pulse ? 0.6 + 0.3 * Math.sin(clock.elapsedTime * 2.4) : 0.3
  })

  if (sites.length === 0) return null
  return (
    <lineSegments geometry={geometry} frustumCulled={false}>
      <lineBasicMaterial ref={material} color={color} transparent opacity={0.5} depthWrite={false} toneMapped={false} />
    </lineSegments>
  )
}

/**
 * A small builder in the agent's colour. It works on the roof of the building
 * the agent is on, where it can be seen from above, and jumps across to the
 * next roof when the agent moves to another file.
 */
function Worker({ color, name, fileName, site }: { color: string; name: string; fileName: string; site: Site }) {
  const group = useRef<THREE.Group>(null)
  const arm = useRef<THREE.Group>(null)
  const legL = useRef<THREE.Mesh>(null)
  const legR = useRef<THREE.Mesh>(null)
  // Where the builder is, and the jump it is making (null while it is working)
  const position = useRef<THREE.Vector3 | null>(null)
  const jump = useRef<{ from: THREE.Vector3; length: number } | null>(null)
  const step = useMemo(() => new THREE.Vector3(), [])
  // On the roof, towards the corner that faces the default camera
  const stand = useMemo(() => new THREE.Vector3(site.x + site.width * 0.2, site.height, site.z + site.width * 0.2), [site])

  useEffect(() => {
    const p = position.current
    if (p && p.distanceTo(stand) > 0.05) jump.current = { from: p.clone(), length: Math.hypot(stand.x - p.x, stand.z - p.z) }
  }, [stand])

  useFrame(({ clock }, delta) => {
    const g = group.current
    if (!g) return
    if (!position.current) position.current = stand.clone()
    const p = position.current
    const t = clock.elapsedTime
    const hop = jump.current

    if (hop) {
      step.set(stand.x - p.x, 0, stand.z - p.z)
      const left = step.length()
      const speed = Math.max(WALK_SPEED, hop.length / 1.6)
      const move = Math.min(left, speed * Math.min(delta, 0.05))
      if (left > 1e-3) {
        g.rotation.y = Math.atan2(step.x, step.z)
        p.addScaledVector(step.normalize(), move)
      }
      const progress = hop.length > 1e-3 ? 1 - (left - move) / hop.length : 1
      // Up and over: an arc between the two roofs, higher for longer jumps
      p.y = THREE.MathUtils.lerp(hop.from.y, stand.y, progress) + Math.sin(progress * Math.PI) * Math.min(8, 1.5 + hop.length * 0.2)
      if (progress >= 1) {
        p.copy(stand)
        jump.current = null
      }
    } else {
      p.copy(stand)
      // Facing the middle of the roof it is working on
      g.rotation.y = Math.atan2(site.x - p.x, site.z - p.z)
    }
    g.position.copy(p)
    const stride = hop ? Math.sin(t * 12) : 0
    if (legL.current) legL.current.rotation.x = stride * 0.7
    if (legR.current) legR.current.rotation.x = -stride * 0.7
    // In the air the arm swings; on the roof it raises the hammer and brings it down
    if (arm.current) arm.current.rotation.x = hop ? -stride * 0.5 : -0.5 - Math.abs(Math.sin(t * 5.5)) * 1.5
  })

  return (
    <group ref={group} scale={WORKER_SCALE}>
      <mesh ref={legL} position={[-0.09, 0.2, 0]} castShadow>
        <boxGeometry args={[0.12, 0.4, 0.13]} />
        <meshStandardMaterial color="#2b303b" roughness={0.8} />
      </mesh>
      <mesh ref={legR} position={[0.09, 0.2, 0]} castShadow>
        <boxGeometry args={[0.12, 0.4, 0.13]} />
        <meshStandardMaterial color="#2b303b" roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.62, 0]} castShadow>
        <boxGeometry args={[0.38, 0.46, 0.24]} />
        <meshStandardMaterial color={color} roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.99, 0]} castShadow>
        <sphereGeometry args={[0.17, 16, 12]} />
        <meshStandardMaterial color="#f0dcc4" roughness={0.7} />
      </mesh>
      {/* Hard hat */}
      <mesh position={[0, 1.04, 0]}>
        <sphereGeometry args={[0.19, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={THEME.lime} roughness={0.5} />
      </mesh>
      {/* Arm and hammer, swinging from the shoulder */}
      <group ref={arm} position={[0.25, 0.8, 0]}>
        <mesh position={[0, -0.17, 0]}>
          <boxGeometry args={[0.1, 0.36, 0.1]} />
          <meshStandardMaterial color={color} roughness={0.6} />
        </mesh>
        <mesh position={[0, -0.38, 0.1]}>
          <boxGeometry args={[0.07, 0.07, 0.34]} />
          <meshStandardMaterial color="#8a6a48" roughness={0.8} />
        </mesh>
        <mesh position={[0, -0.38, 0.28]}>
          <boxGeometry args={[0.13, 0.19, 0.11]} />
          <meshStandardMaterial color="#c3cad4" roughness={0.35} metalness={0.7} />
        </mesh>
      </group>

      <Html position={[0, 2.1, 0]} zIndexRange={[14, 14]} style={{ pointerEvents: "none" }}>
        <div
          className="flex w-max -translate-x-1/2 -translate-y-full items-center gap-1.5 whitespace-nowrap rounded-full py-1 pl-2 pr-2.5 text-[12px] font-medium leading-none text-[#14130f] shadow-[0_2px_10px_rgba(0,0,0,0.45)]"
          style={{ backgroundColor: color }}
        >
          <span className="size-1.5 rounded-full bg-[#14130f] motion-safe:animate-pulse" />
          {name}
          <span className="font-normal opacity-75">{fileName}</span>
        </div>
      </Html>
    </group>
  )
}

/**
 * Agent mode in the city: scaffolding around every building an agent edited
 * (pulsing while the edit is uncommitted), an outline on other uncommitted
 * files, and one builder per working agent on the roof of the file it is on.
 */
export function AgentWorkers({ snapshot, sessions, uncommitted }: AgentWorkersProps) {
  const sites = useMemo(() => {
    const map = new Map<string, Site>()
    for (const file of snapshot.files) {
      map.set(file.path, { x: file.position.x, z: file.position.z, width: getBuildingWidth(file), height: getBuildingHeight(file) })
    }
    return map
  }, [snapshot.files])

  const { perAgent, other } = useMemo(() => {
    const edited = new Set<string>()
    const perAgent = (Object.keys(AGENTS) as AgentSession["agent"][]).map((agent) => {
      const open: Site[] = []
      const done: Site[] = []
      const seen = new Set<string>()
      for (const session of sessions) {
        if (session.agent !== agent) continue
        for (const file of session.files) {
          const site = sites.get(file.path)
          if (!file.edited || !site || seen.has(file.path)) continue
          seen.add(file.path)
          edited.add(file.path)
          ;(uncommitted.has(file.path) ? open : done).push(site)
        }
      }
      return { agent, open, done }
    })
    const other: Site[] = []
    uncommitted.forEach((path) => {
      const site = sites.get(path)
      if (site && !edited.has(path)) other.push(site)
    })
    return { perAgent, other }
  }, [sessions, sites, uncommitted])

  return (
    <group>
      {perAgent.map(({ agent, open, done }) => (
        <group key={agent}>
          <Scaffolds sites={open} color={AGENTS[agent].color} pulse />
          <Scaffolds sites={done} color={AGENTS[agent].color} pulse={false} />
        </group>
      ))}
      <Scaffolds sites={other} color={THEME.sevMed} pulse={false} />

      {sessions.map((session) => {
        const site = session.active && session.currentFile ? sites.get(session.currentFile) : undefined
        if (!site || !session.currentFile) return null
        return (
          <Worker
            key={`${session.agent}-${session.id}`}
            color={AGENTS[session.agent].color}
            name={AGENTS[session.agent].name}
            fileName={session.currentFile.split("/").pop() ?? session.currentFile}
            site={site}
          />
        )
      })}
    </group>
  )
}
