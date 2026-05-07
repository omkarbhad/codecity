"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Network, type Data, type Options } from "vis-network/standalone"
import { DataSet } from "vis-data/standalone"

import type { CitySnapshot } from "@/lib/types/city"
import { isPathHidden, useCityStore } from "./use-city-store"
import { getExtension } from "./extension-filter"

// Tableau-10 + extras palette (graphify's). Stable per-rank assignment.
const COMMUNITY_PALETTE = [
  "#4E79A7", "#F28E2B", "#E15759", "#76B7B2", "#59A14F",
  "#EDC948", "#B07AA1", "#FF9DA7", "#9C755F", "#BAB0AC",
  "#86BCB6", "#D37295", "#A0CBE8", "#FFBE7D", "#8CD17D",
  "#B6992D", "#499894", "#F1CE63", "#FABFD2", "#D7B5A6",
] as const

interface NodeRecord {
  id: string
  label: string
  color: { background: string; border: string; highlight: { background: string; border: string } }
  size: number
  font: { size: number; color: string }
  title?: string
  baseColor: string
  x?: number
  y?: number
  fixed?: boolean
}
interface EdgeRecord {
  id: string
  from: string
  to: string
  color: { color: string; opacity: number }
  arrows?: string
  width?: number
}

/** Stabilization status emitted to the parent so it can render the same
 *  bottom-center progress strip the city uses. `null` means "no work in
 *  flight" — the parent should hide the strip. */
export interface NetworkStabilizationProgress {
  /** 0-100. */
  percent: number
  /** True until vis-network reports `stabilizationIterationsDone`. */
  active: boolean
}

interface Props {
  snapshot: CitySnapshot
  onStabilizationProgress?: (progress: NetworkStabilizationProgress | null) => void
}

export function CityNetworkCanvas({ snapshot, onStabilizationProgress }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const networkRef = useRef<Network | null>(null)
  const nodesDsRef = useRef<DataSet<NodeRecord> | null>(null)
  const edgesDsRef = useRef<DataSet<EdgeRecord> | null>(null)
  const [phase, setPhase] = useState<"stabilizing" | "ready">("stabilizing")
  const [progress, setProgress] = useState(0)
  const [expandedCommunity, setExpandedCommunity] = useState<number | null>(null)
  const [panelOpen, setPanelOpen] = useState(true)
  const [panelTab, setPanelTab] = useState<"insights" | "communities">("insights")
  const [traceFrom, setTraceFrom] = useState<string | null>(null)
  const [traceDepth, setTraceDepth] = useState<number>(Infinity)

  // Surface stabilization to the parent so it can render the same load
  // strip the city uses. Held in a ref so the effect's deps stay stable
  // even if the parent recreates the callback identity each render.
  const onStabilizationProgressRef = useRef(onStabilizationProgress)
  onStabilizationProgressRef.current = onStabilizationProgress
  useEffect(() => {
    const cb = onStabilizationProgressRef.current
    if (!cb) return
    if (phase === "ready") {
      cb({ percent: 100, active: false })
      // Brief tail so the parent can play the same fade-out the city does
      // before unmounting the strip.
      const timeoutId = setTimeout(() => cb(null), 600)
      return () => clearTimeout(timeoutId)
    }
    cb({ percent: progress, active: true })
  }, [phase, progress])

  const selectedFile = useCityStore((s) => s.selectedFile)
  const hiddenPaths = useCityStore((s) => s.hiddenPaths)
  const hiddenExtensions = useCityStore((s) => s.hiddenExtensions)
  const selectFile = useCityStore((s) => s.selectFile)
  const hoverFile = useCityStore((s) => s.hoverFile)

  const selectFileRef = useRef(selectFile)
  const hoverFileRef = useRef(hoverFile)
  selectFileRef.current = selectFile
  hoverFileRef.current = hoverFile

  // Network analysis comes pre-baked from the Rust analyzer. The frontend never
  // re-runs Louvain or BFS; it just filters the snapshot for visibility.
  const dataset = useMemo(() => {
    // Defensive default: older cached snapshots predate the `network` field.
    const network = snapshot.network ?? { communities: [], entryPoints: [], hubs: [] }
    const visiblePaths = new Set<string>()
    for (const f of snapshot.files) {
      if (isPathHidden(f.path, hiddenPaths)) continue
      if (hiddenExtensions.has(getExtension(f.path))) continue
      visiblePaths.add(f.path)
    }

    // Find file metadata by path quickly
    const filesByPath = new Map(snapshot.files.map((f) => [f.path, f]))

    // Map community id → rank for color (rank 0 = largest = palette[0])
    const rankByCommunity = new Map<number, number>()
    const sizeByCommunity = new Map<number, number>()
    for (const c of network.communities) {
      rankByCommunity.set(c.id, c.rank)
      sizeByCommunity.set(c.id, c.size)
    }

    const colorForCommunity = (id: number): string => {
      const rank = rankByCommunity.get(id) ?? 0
      return COMMUNITY_PALETTE[rank % COMMUNITY_PALETTE.length]
    }

    // Render the symbol-rich graph that Rust ships in `network.nodes` /
    // `network.edges` — same data shape graphify uses (files + functions +
    // types as nodes, calls + contains as edges). We previously rendered
    // only files with a derived edge list, which threw away the structure
    // the analyzer worked to extract.
    const symbolNodes = network.nodes ?? []
    const symbolEdges = network.edges ?? []

    // Visibility: a symbol node is visible when its owning file is visible.
    const isNodeVisible = (n: { filePath: string }) => visiblePaths.has(n.filePath)

    // File nodes sized larger than symbol nodes — same convention as graphify.
    const sizeFor = (kind: string, degree: number): number => {
      const base = kind === "file" ? 8 : 4
      return Math.max(base, Math.min(16, base + Math.sqrt(degree) * 1.0))
    }

    // Function/type/class symbols stay anonymous in the rendered view (no
    // label text) to keep the canvas readable; file nodes get their basename.
    const labelFor = (n: { kind: string; label: string; filePath: string }): string => {
      if (n.kind !== "file") return ""
      const slash = n.filePath.lastIndexOf("/")
      return slash >= 0 ? n.filePath.slice(slash + 1) : n.filePath
    }

    const nodes: NodeRecord[] = []
    for (const sn of symbolNodes) {
      if (!isNodeVisible(sn)) continue
      const total = (sn.inDegree ?? 0) + (sn.outDegree ?? 0)
      // Skip leaf-and-isolate noise:
      //   - degree-0 nodes (isolated files, unconnected symbols) have no
      //     edges to position them, so ForceAtlas2 strands them on a
      //     regular grid as a side effect of `avoidOverlap` — visible as
      //     a "starfield" above the cluster.
      //   - degree-1 symbols are single-call leaves (e.g. a helper called
      //     once and never seen again) — they add a spike per file but no
      //     architectural information. Keep degree-1 *files* though, since
      //     a file connected to one other file is still a real edge in the
      //     dependency view.
      if (total === 0) continue
      if (total === 1 && sn.kind !== "file") continue
      const cid = sn.community ?? -1
      const color = cid >= 0 ? colorForCommunity(cid) : "#888888"

      // Baked positions come from `networkX`/`networkY` on each node when
      // the snapshot ships them; otherwise vis-network places + stabilizes.
      const x = sn.position?.x ?? sn.networkX
      const y = sn.position?.y ?? sn.networkY
      const hasBaked = typeof x === "number" && typeof y === "number" && Number.isFinite(x) && Number.isFinite(y)

      // No `title` field — vis-network's built-in tooltip would stack on
      // top of CityTooltip (the React-rendered file card). The React card
      // already shows the file name, line count, complexity, etc., which
      // is strictly more useful than the symbol-name string.
      nodes.push({
        id: sn.id,
        label: labelFor(sn),
        color: {
          background: color,
          border: color,
          highlight: { background: "#ffffff", border: color },
        },
        size: sizeFor(sn.kind, total),
        font: { size: sn.kind === "file" ? 11 : 0, color: "#ffffff" },
        baseColor: color,
        ...(hasBaked ? { x, y } : {}),
      })
    }
    const visibleIds = new Set(nodes.map((n) => n.id))

    // Edges come straight from the symbol graph. `contains` edges are dropped
    // visually — every file already visually owns its symbols via co-location,
    // so drawing the link adds noise without information.
    const nodeColor = new Map(nodes.map((n) => [n.id, n.baseColor]))
    const edges: EdgeRecord[] = []
    const seenEdge = new Set<string>()
    for (const e of symbolEdges) {
      if (e.kind === "contains") continue
      if (!visibleIds.has(e.source) || !visibleIds.has(e.target)) continue
      if (e.source === e.target) continue
      const id = `${e.source}->${e.target}`
      if (seenEdge.has(id)) continue
      seenEdge.add(id)
      edges.push({
        id,
        from: e.source,
        to: e.target,
        color: { color: nodeColor.get(e.source) ?? "#888888", opacity: 0.5 },
        arrows: "to",
        width: 0.8,
      })
    }

    // Filter community summaries to only members that are still visible.
    // Members come pre-sorted by degree desc from the Rust side.
    const communitySummaries = network.communities
      .map((c) => {
        const members = c.members
          .filter((p) => visibleIds.has(p))
          .map((p) => {
            const f = filesByPath.get(p)
            const slash = p.lastIndexOf("/")
            const label = slash >= 0 ? p.slice(slash + 1) : p
            const degree = f ? (f.inDegree ?? 0) + (f.outDegree ?? 0) : 0
            return { path: p, label, degree }
          })
        const hubs = members.slice(0, 5)
        return {
          id: c.id,
          rank: c.rank,
          color: colorForCommunity(c.id),
          size: members.length,
          members,
          hubs,
        }
      })
      .filter((c) => c.size > 0)

    // Filter entry points + hubs to visible set; data is already pre-ranked.
    const entryPoints = network.entryPoints
      .filter((e) => visibleIds.has(e.path))
      .map((e) => {
        const slash = e.path.lastIndexOf("/")
        return {
          path: e.path,
          label: slash >= 0 ? e.path.slice(slash + 1) : e.path,
          outDegree: e.outDegree,
          reachable: e.reachable,
        }
      })

    const hubs = network.hubs
      .filter((h) => visibleIds.has(h.path))
      .map((h) => {
        const slash = h.path.lastIndexOf("/")
        return {
          path: h.path,
          label: slash >= 0 ? h.path.slice(slash + 1) : h.path,
          inDegree: h.inDegree,
        }
      })

    // Build outAdj only for trace BFS at runtime (cheap to construct from filtered set)
    const outAdj = new Map<string, string[]>()
    for (const e of edges) {
      const arr = outAdj.get(e.from)
      if (arr) arr.push(e.to)
      else outAdj.set(e.from, [e.to])
    }

    // Map every rendered node id back to its owning file path. For file
    // nodes this is identity; for symbol nodes (functions/types/classes)
    // it's the file the symbol lives in. Used by click/hover so selection
    // routes to the file even when the user clicks a tiny symbol dot.
    const nodeIdToPath = new Map<string, string>()
    for (const sn of symbolNodes) {
      if (!visibleIds.has(sn.id)) continue
      nodeIdToPath.set(sn.id, sn.filePath)
    }

    return {
      nodes,
      edges,
      communityCount: communitySummaries.length,
      communitySummaries,
      entryPoints,
      hubs,
      outAdj,
      nodeIdToPath,
    }
  }, [snapshot, hiddenPaths, hiddenExtensions])

  const pathIndex = useMemo(() => {
    const m = new Map<string, number>()
    for (let i = 0; i < snapshot.files.length; i++) m.set(snapshot.files[i].path, i)
    return m
  }, [snapshot.files])

  // Mount the network when we have data + container.
  //
  // NOTE: this effect re-runs on every dataset change (filter toggle,
  // snapshot swap), which destroys + rebuilds the vis-network instance and
  // triggers a fresh ForceAtlas2 stabilization. That's a 1-3s freeze on
  // each filter click. A previous attempt to keep the instance alive and
  // diff entries into the existing DataSets caused continuous physics
  // jitter ("vibrating canvas") because vis-network treats any `update`
  // on an existing node as a position impulse. Reverted to the simpler
  // remount path until we have a proper "freeze positions, then patch"
  // strategy.
  useEffect(() => {
    if (!containerRef.current) return
    if (dataset.nodes.length === 0) {
      // Nothing to render — flip out of the loading spinner so the user
      // sees the empty-state instead of a permanent "Stabilizing 0%".
      setPhase("ready")
      setProgress(100)
      return
    }

    setPhase("stabilizing")
    setProgress(0)

    const nodesDs = new DataSet<NodeRecord>(dataset.nodes)
    const edgesDs = new DataSet<EdgeRecord>(dataset.edges)
    nodesDsRef.current = nodesDs
    edgesDsRef.current = edgesDs

    const data: Data = { nodes: nodesDs as unknown as Data["nodes"], edges: edgesDs as unknown as Data["edges"] }
    // ForceAtlas2 constants match graphify's HTML viewer 1:1 — same library
    // (vis-network), same iteration cap.
    const options: Options = {
      physics: {
        enabled: true,
        solver: "forceAtlas2Based",
        forceAtlas2Based: {
          gravitationalConstant: -60,
          centralGravity: 0.005,
          springLength: 120,
          springConstant: 0.08,
          damping: 0.4,
          avoidOverlap: 0.8,
        },
        stabilization: { enabled: true, iterations: 200, fit: true, updateInterval: 25 },
      },
      interaction: {
        hover: true,
        tooltipDelay: 150,
        hideEdgesOnDrag: true,
        hideEdgesOnZoom: true,
        navigationButtons: false,
        keyboard: false,
      },
      nodes: { shape: "dot", borderWidth: 1.5 },
      edges: { smooth: { enabled: true, type: "continuous", roundness: 0.2 }, selectionWidth: 3 },
    }

    const network = new Network(containerRef.current, data, options)
    networkRef.current = network

    network.on("stabilizationProgress", (params: { iterations: number; total: number }) => {
      setProgress(Math.round((params.iterations / params.total) * 100))
    })
    network.once("stabilizationIterationsDone", () => {
      network.setOptions({ physics: { enabled: false } })
      setPhase("ready")
      setProgress(100)
    })

    network.on("click", (params: { nodes: string[] }) => {
      const id = params.nodes[0]
      if (!id) {
        selectFileRef.current(null, null)
        return
      }
      // Symbol nodes (function/type/class) route their selection to the
      // owning file — same UX as clicking the file dot directly.
      const path = dataset.nodeIdToPath.get(id) ?? id
      const idx = pathIndex.get(path)
      selectFileRef.current(path, idx ?? null)
    })

    network.on("hoverNode", (params: { node: string }) => {
      if (containerRef.current) containerRef.current.style.cursor = "pointer"
      const path = dataset.nodeIdToPath.get(params.node) ?? params.node
      const idx = pathIndex.get(path)
      hoverFileRef.current(path, idx ?? null)
    })
    network.on("blurNode", () => {
      if (containerRef.current) containerRef.current.style.cursor = "default"
      hoverFileRef.current(null, null)
    })

    return () => {
      network.destroy()
      networkRef.current = null
      nodesDsRef.current = null
      edgesDsRef.current = null
    }
  }, [dataset, pathIndex])

  // Trace set: BFS from selected entry point through the visible adjacency.
  // Cheap (just runtime traversal — no algorithms here, no computation per render).
  const traceSet = useMemo(() => {
    if (!traceFrom) return null
    const adj = dataset.outAdj
    const visited = new Set<string>([traceFrom])
    const depths = new Map<string, number>([[traceFrom, 0]])
    const queue: string[] = [traceFrom]
    while (queue.length > 0) {
      const cur = queue.shift()!
      const d = depths.get(cur) ?? 0
      if (d >= traceDepth) continue
      const targets = adj.get(cur)
      if (!targets) continue
      for (const t of targets) {
        if (visited.has(t)) continue
        visited.add(t)
        depths.set(t, d + 1)
        queue.push(t)
      }
    }
    return { nodes: visited, depths }
  }, [traceFrom, traceDepth, dataset.outAdj])

  // Combined paint effect: trace beats selection beats rest-state.
  useEffect(() => {
    const nodes = nodesDsRef.current
    const edges = edgesDsRef.current
    if (!edges || !nodes) return

    if (traceSet) {
      const { nodes: traced } = traceSet
      const nodeUpdates: Partial<NodeRecord>[] = []
      nodes.forEach((n) => {
        if (n.id === traceFrom) {
          nodeUpdates.push({
            id: n.id,
            color: { background: "#ffffff", border: "#22d3ee", highlight: { background: "#ffffff", border: "#22d3ee" } },
          })
        } else if (traced.has(n.id)) {
          nodeUpdates.push({
            id: n.id,
            color: { background: n.baseColor, border: "#22d3ee", highlight: { background: "#ffffff", border: "#22d3ee" } },
          })
        } else {
          nodeUpdates.push({
            id: n.id,
            color: { background: `${n.baseColor}33`, border: `${n.baseColor}33`, highlight: { background: "#ffffff", border: n.baseColor } },
          })
        }
      })
      nodes.update(nodeUpdates)

      const edgeUpdates: Partial<EdgeRecord>[] = []
      edges.forEach((e) => {
        const inTrace = traced.has(e.from) && traced.has(e.to)
        if (inTrace) {
          edgeUpdates.push({ id: e.id, color: { color: "#22d3ee", opacity: 0.85 }, width: 1.4 })
        } else {
          edgeUpdates.push({ id: e.id, color: { color: e.color.color, opacity: 0.04 }, width: 0.3 })
        }
      })
      edges.update(edgeUpdates)
      return
    }

    // No selection: paint everything at rest state.
    if (!selectedFile) {
      const nodeRestore: Partial<NodeRecord>[] = []
      nodes.forEach((n) => {
        nodeRestore.push({
          id: n.id,
          color: { background: n.baseColor, border: n.baseColor, highlight: { background: "#ffffff", border: n.baseColor } },
        })
      })
      nodes.update(nodeRestore)

      const edgeRestore: Partial<EdgeRecord>[] = []
      edges.forEach((e) => {
        edgeRestore.push({ id: e.id, color: { color: e.color.color, opacity: 0.5 }, width: 0.8 })
      })
      edges.update(edgeRestore)
      return
    }

    // A file is selected. Symbol nodes use IDs like `path::fn::name`, so
    // we resolve membership through `dataset.nodeIdToPath` rather than
    // string-matching on the node id. An edge "touches the selection"
    // when at least one endpoint's owning file is the selected file —
    // that catches calls between any two symbols where one of them
    // lives in the selected file.
    const idToPath = dataset.nodeIdToPath
    const touchedNodes = new Set<string>()
    const incoming = new Set<string>()
    const outgoing = new Set<string>()
    edges.forEach((e) => {
      const fromFile = idToPath.get(e.from) ?? e.from
      const toFile = idToPath.get(e.to) ?? e.to
      if (fromFile === selectedFile) {
        outgoing.add(e.id)
        touchedNodes.add(e.from)
        touchedNodes.add(e.to)
      } else if (toFile === selectedFile) {
        incoming.add(e.id)
        touchedNodes.add(e.from)
        touchedNodes.add(e.to)
      }
    })
    // Always include the selected file's own symbols in the highlighted set
    // so they stay bright even when none of their edges escape the file.
    nodes.forEach((n) => {
      if ((idToPath.get(n.id) ?? n.id) === selectedFile) touchedNodes.add(n.id)
    })

    // Paint nodes: bright for touched, dimmed but visible for the rest
    // (~25% alpha — high enough to keep architectural context, low enough
    // to make the selection's neighborhood pop).
    const nodeUpdates: Partial<NodeRecord>[] = []
    nodes.forEach((n) => {
      if (touchedNodes.has(n.id)) {
        nodeUpdates.push({
          id: n.id,
          color: { background: n.baseColor, border: n.baseColor, highlight: { background: "#ffffff", border: n.baseColor } },
        })
      } else {
        nodeUpdates.push({
          id: n.id,
          color: { background: `${n.baseColor}40`, border: `${n.baseColor}40`, highlight: { background: "#ffffff", border: n.baseColor } },
        })
      }
    })
    nodes.update(nodeUpdates)

    // Paint edges: red outgoing, blue incoming, dimmed gray for the rest.
    const edgeUpdates: Partial<EdgeRecord>[] = []
    edges.forEach((e) => {
      if (outgoing.has(e.id)) {
        edgeUpdates.push({ id: e.id, color: { color: "#ff6b6b", opacity: 0.95 }, width: 1.6 })
      } else if (incoming.has(e.id)) {
        edgeUpdates.push({ id: e.id, color: { color: "#4dabf7", opacity: 0.95 }, width: 1.6 })
      } else {
        edgeUpdates.push({ id: e.id, color: { color: e.color.color, opacity: 0.04 }, width: 0.3 })
      }
    })
    edges.update(edgeUpdates)
  }, [selectedFile, traceFrom, traceSet, dataset.nodeIdToPath])

  const focusCommunity = (memberPaths: string[]) => {
    const network = networkRef.current
    if (!network || memberPaths.length === 0) return
    network.fit({ nodes: memberPaths, animation: { duration: 600, easingFunction: "easeInOutQuad" } })
  }

  const focusFile = (path: string) => {
    const network = networkRef.current
    if (!network) return
    network.focus(path, { scale: 1.4, animation: { duration: 500, easingFunction: "easeInOutQuad" } })
    network.selectNodes([path])
    const idx = pathIndex.get(path)
    selectFile(path, idx ?? null)
  }

  return (
    <div className="absolute inset-0 bg-[#070708]">
      <div ref={containerRef} className="absolute inset-0" />

      {phase === "ready" && dataset.communityCount > 0 && (
        <div className="pointer-events-none absolute top-4 left-4 rounded-md border border-white/10 bg-[#0b0b0c]/85 px-3 py-1.5 backdrop-blur-md">
          <span className="flex items-center gap-3 text-[11px] font-medium text-white/65">
            <span>{dataset.nodes.length.toLocaleString()} nodes</span>
            <span className="text-white/25">·</span>
            <span>{dataset.edges.length.toLocaleString()} edges</span>
            <span className="text-white/25">·</span>
            <span>{dataset.communityCount} communities</span>
          </span>
        </div>
      )}

      {phase === "ready" && traceFrom && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-3 rounded-md border border-cyan-400/30 bg-[#0b0b0c]/92 px-3 py-1.5 backdrop-blur-md shadow-lg shadow-cyan-400/10">
          <span className="size-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.85)]" />
          <span className="text-[11px] font-medium text-white/85">
            Tracing from <span className="font-mono text-cyan-300">{traceFrom.split("/").pop()}</span>
          </span>
          <span className="font-mono text-[10px] text-white/45">
            {traceSet ? `${traceSet.nodes.size - 1} reached` : ""}
          </span>
          <div className="ml-1 flex items-center gap-1 border-l border-white/10 pl-2">
            <span className="text-[10px] text-white/40">depth</span>
            {[1, 2, 3, Infinity].map((d) => (
              <button
                key={String(d)}
                onClick={() => setTraceDepth(d)}
                className={`rounded px-1.5 py-0.5 font-mono text-[10px] transition-colors ${
                  traceDepth === d ? "bg-cyan-400/20 text-cyan-200" : "text-white/40 hover:bg-white/[0.05] hover:text-white/80"
                }`}
              >
                {d === Infinity ? "∞" : d}
              </button>
            ))}
          </div>
          <button
            onClick={() => setTraceFrom(null)}
            className="ml-1 rounded p-1 text-white/45 hover:bg-white/[0.05] hover:text-white/85"
            aria-label="Clear trace"
            title="Clear trace"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      )}

      {phase === "ready" && dataset.nodes.length > 0 && (
        <div
          className={`absolute right-4 top-4 bottom-4 w-[300px] flex flex-col rounded-lg border border-white/[0.08] bg-[#0b0b0c]/92 shadow-2xl shadow-black/40 backdrop-blur-xl transition-transform ${panelOpen ? "translate-x-0" : "translate-x-[316px]"}`}
        >
          <div className="flex items-center border-b border-white/[0.06] px-1.5 py-1.5">
            {([
              { key: "insights" as const, label: "Insights" },
              { key: "communities" as const, label: "Communities" },
            ]).map((t) => (
              <button
                key={t.key}
                onClick={() => setPanelTab(t.key)}
                className={`flex-1 rounded px-2 py-1 text-[11px] font-semibold uppercase tracking-wide transition-colors ${
                  panelTab === t.key ? "bg-white/[0.06] text-white/90" : "text-white/45 hover:bg-white/[0.03] hover:text-white/70"
                }`}
              >
                {t.label}
              </button>
            ))}
            <button
              onClick={() => setPanelOpen(false)}
              className="ml-1 rounded p-1 text-white/40 hover:bg-white/[0.05] hover:text-white/80"
              aria-label="Hide panel"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-1.5 py-1.5">
            {panelTab === "insights" && (
              <>
                <div className="px-2 pt-1 pb-1.5">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-white/40">Entry points</div>
                  <div className="text-[10px] text-white/30">Files nothing imports — top of the call tree.</div>
                </div>
                {dataset.entryPoints.length === 0 ? (
                  <div className="px-2 py-3 text-[11px] text-white/35">No clear entry points detected.</div>
                ) : (
                  dataset.entryPoints.map((e) => {
                    const isActive = traceFrom === e.path
                    return (
                      <div
                        key={e.path}
                        className={`mb-0.5 flex items-center gap-1 rounded px-1 py-1 transition-colors ${
                          isActive ? "bg-cyan-400/10 ring-1 ring-cyan-400/30" : "hover:bg-white/[0.04]"
                        }`}
                      >
                        <button
                          onClick={() => focusFile(e.path)}
                          className="group flex flex-1 items-center gap-2 truncate rounded px-1.5 py-0.5 text-left"
                          title={e.path}
                        >
                          <span className="size-1.5 shrink-0 rounded-full bg-cyan-400/70" />
                          <span className={`flex-1 truncate font-mono text-[11px] ${isActive ? "text-cyan-200" : "text-white/75 group-hover:text-white"}`}>
                            {e.label}
                          </span>
                          <span className="font-mono text-[9px] tabular-nums text-white/35">{e.reachable} reach</span>
                        </button>
                        <button
                          onClick={() => {
                            setTraceFrom(isActive ? null : e.path)
                            if (!isActive) {
                              const network = networkRef.current
                              if (network) {
                                network.fit({ nodes: [e.path], animation: { duration: 500, easingFunction: "easeInOutQuad" } })
                              }
                            }
                          }}
                          className={`rounded px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wide transition-colors ${
                            isActive ? "bg-cyan-400/30 text-cyan-100" : "text-white/40 hover:bg-cyan-400/15 hover:text-cyan-200"
                          }`}
                          title="Trace downstream from this file"
                        >
                          {isActive ? "On" : "Trace"}
                        </button>
                      </div>
                    )
                  })
                )}

                <div className="mt-3 px-2 pt-1 pb-1.5">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-white/40">Hubs</div>
                  <div className="text-[10px] text-white/30">Most-imported files — load-bearing utilities.</div>
                </div>
                {dataset.hubs.length === 0 ? (
                  <div className="px-2 py-3 text-[11px] text-white/35">No hubs detected.</div>
                ) : (
                  dataset.hubs.map((h) => (
                    <button
                      key={h.path}
                      onClick={() => focusFile(h.path)}
                      className="group mb-0.5 flex w-full items-center gap-2 rounded px-2 py-1 text-left transition-colors hover:bg-white/[0.04]"
                      title={h.path}
                    >
                      <span className="size-1.5 shrink-0 rounded-full bg-amber-400/70" />
                      <span className="flex-1 truncate font-mono text-[11px] text-white/75 group-hover:text-white">
                        {h.label}
                      </span>
                      <span className="font-mono text-[9px] tabular-nums text-white/35">← {h.inDegree}</span>
                    </button>
                  ))
                )}
              </>
            )}

            {panelTab === "communities" &&
              dataset.communitySummaries.map((c) => {
                const isExpanded = expandedCommunity === c.id
                const visibleMembers = isExpanded ? c.members : c.hubs
                return (
                  <div key={c.id} className="mb-1 rounded-md border border-transparent hover:border-white/[0.05]">
                    <button
                      onClick={() => focusCommunity(c.members.map((m) => m.path))}
                      className="flex w-full items-center gap-2 rounded-t-md px-2 py-1.5 text-left transition-colors hover:bg-white/[0.04]"
                    >
                      <span
                        className="size-2 shrink-0 rounded-sm"
                        style={{ background: c.color, boxShadow: `0 0 6px ${c.color}80` }}
                      />
                      <span className="flex-1 truncate text-[12px] font-medium text-white/85">
                        Community {c.rank + 1}
                      </span>
                      <span className="font-mono text-[10px] tabular-nums text-white/40">{c.size}</span>
                    </button>
                    <div className="px-1 pb-1">
                      {visibleMembers.map((m) => (
                        <button
                          key={m.path}
                          onClick={() => focusFile(m.path)}
                          className={`group flex w-full items-center gap-2 rounded px-2 py-0.5 text-left transition-colors hover:bg-white/[0.05] ${
                            selectedFile === m.path ? "bg-white/[0.06]" : ""
                          }`}
                          title={m.path}
                        >
                          <span className="size-1 shrink-0 rounded-full bg-white/30 group-hover:bg-white/60" />
                          <span className={`flex-1 truncate font-mono text-[10.5px] ${
                            selectedFile === m.path ? "text-white" : "text-white/55 group-hover:text-white/85"
                          }`}>
                            {m.label}
                          </span>
                          <span className="font-mono text-[9px] tabular-nums text-white/30">{m.degree}</span>
                        </button>
                      ))}
                      {c.size > 5 && (
                        <button
                          onClick={() => setExpandedCommunity(isExpanded ? null : c.id)}
                          className="ml-1 mt-0.5 px-2 py-0.5 text-[10px] text-white/35 hover:text-white/70"
                        >
                          {isExpanded ? "Show less" : `+ ${c.size - 5} more`}
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
          </div>
        </div>
      )}

      {phase === "ready" && !panelOpen && dataset.nodes.length > 0 && (
        <button
          onClick={() => setPanelOpen(true)}
          className="absolute right-4 top-4 rounded-md border border-white/10 bg-[#0b0b0c]/85 px-3 py-1.5 text-[11px] font-medium text-white/70 backdrop-blur-md hover:bg-[#0b0b0c]/95 hover:text-white"
        >
          Insights
        </button>
      )}
    </div>
  )
}
