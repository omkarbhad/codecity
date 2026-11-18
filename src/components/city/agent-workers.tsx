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
const WORKER_SCALE = 2
/** Hammer blows per second, times pi. */
const HAMMER_RATE = 5.5
const TROUSERS = "#2b303b"
const HARD_HAT = "#f4f1ea"
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
  const legL = useRef<THREE.Group>(null)
  const legR = useRef<THREE.Group>(null)
  const ring = useRef<THREE.Mesh>(null)
  const ringMaterial = useRef<THREE.MeshBasicMaterial>(null)
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
    if (arm.current) arm.current.rotation.x = hop ? -stride * 0.5 : -0.5 - Math.abs(Math.sin(t * HAMMER_RATE)) * 1.5
    // The ring starts at each blow (the hammer is down when the sine crosses zero) and fades as it spreads
    if (ring.current && ringMaterial.current) {
      const sinceBlow = ((t * HAMMER_RATE) / Math.PI) % 1
      ring.current.visible = !hop
      ring.current.scale.setScalar(1 + sinceBlow * 2.2)
      ringMaterial.current.opacity = 0.75 * (1 - sinceBlow)
    }
  })

  return (
    <group ref={group} scale={WORKER_SCALE}>
      {/* Legs swing from the hip */}
      <group ref={legL} position={[-0.09, 0.4, 0]}>
        <mesh position={[0, -0.2, 0]} castShadow>
          <capsuleGeometry args={[0.065, 0.26, 4, 10]} />
          <meshStandardMaterial color={TROUSERS} roughness={0.85} />
        </mesh>
      </group>
      <group ref={legR} position={[0.09, 0.4, 0]}>
        <mesh position={[0, -0.2, 0]} castShadow>
          <capsuleGeometry args={[0.065, 0.26, 4, 10]} />
          <meshStandardMaterial color={TROUSERS} roughness={0.85} />
        </mesh>
      </group>

      {/* Overalls in the agent's colour, with a tool belt */}
      <mesh position={[0, 0.66, 0]} castShadow>
        <capsuleGeometry args={[0.2, 0.26, 6, 14]} />
        <meshStandardMaterial color={color} roughness={0.55} />
      </mesh>
      <mesh position={[0, 0.47, 0]}>
        <cylinderGeometry args={[0.212, 0.212, 0.07, 16]} />
        <meshStandardMaterial color="#3a2f25" roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.47, 0.2]}>
        <boxGeometry args={[0.09, 0.08, 0.04]} />
        <meshStandardMaterial color="#d9b24a" roughness={0.4} metalness={0.6} />
      </mesh>

      {/* Head, eyes, and a hard hat with a brim */}
      <mesh position={[0, 1.09, 0]} castShadow>
        <sphereGeometry args={[0.2, 20, 16]} />
        <meshStandardMaterial color="#f2dcc2" roughness={0.75} />
      </mesh>
      {[-0.075, 0.075].map((x) => (
        <mesh key={x} position={[x, 1.1, 0.175]}>
          <sphereGeometry args={[0.03, 10, 8]} />
          <meshStandardMaterial color="#1c1a17" roughness={0.3} />
        </mesh>
      ))}
      <mesh position={[0, 1.15, 0]}>
        <sphereGeometry args={[0.215, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={HARD_HAT} roughness={0.4} />
      </mesh>
      <mesh position={[0, 1.155, 0.05]}>
        <cylinderGeometry args={[0.27, 0.27, 0.025, 20]} />
        <meshStandardMaterial color={HARD_HAT} roughness={0.4} />
      </mesh>

      {/* The other arm hangs at the side */}
      <mesh position={[-0.26, 0.66, 0]} rotation={[0, 0, -0.18]}>
        <capsuleGeometry args={[0.055, 0.24, 4, 10]} />
        <meshStandardMaterial color={color} roughness={0.55} />
      </mesh>
      {/* Arm and hammer, swinging from the shoulder */}
      <group ref={arm} position={[0.26, 0.84, 0]}>
        <mesh position={[0, -0.17, 0]}>
          <capsuleGeometry args={[0.055, 0.24, 4, 10]} />
          <meshStandardMaterial color={color} roughness={0.55} />
        </mesh>
        <mesh position={[0, -0.36, 0.13]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.025, 0.025, 0.36, 8]} />
          <meshStandardMaterial color="#8a6a48" roughness={0.8} />
        </mesh>
        <mesh position={[0, -0.36, 0.32]}>
          <boxGeometry args={[0.12, 0.2, 0.11]} />
          <meshStandardMaterial color="#c9d0d9" roughness={0.3} metalness={0.75} />
        </mesh>
      </group>

      {/* Each hammer blow sends a ring across the roof */}
      <mesh ref={ring} position={[0, 0.03, 0.42]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.2, 0.26, 28]} />
        <meshBasicMaterial ref={ringMaterial} color={color} transparent opacity={0} depthWrite={false} toneMapped={false} />
      </mesh>

      <Html position={[0, 1.75, 0]} zIndexRange={[14, 14]} style={{ pointerEvents: "none" }}>
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
