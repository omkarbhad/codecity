"use client"

import type { SpaceData } from "@/lib/magnova/types"
import { useMagnovaStore } from "../use-magnova-store"

// ── Shared styles ──

const PANEL_STYLE: React.CSSProperties = {
  background: "linear-gradient(180deg, rgba(45, 30, 15, 0.92) 0%, rgba(35, 22, 10, 0.95) 100%)",
  border: "1px solid rgba(180, 140, 80, 0.4)",
  borderRadius: "6px",
  color: "#FFF8E1",
  fontFamily: "'Segoe UI', system-ui, sans-serif",
  boxShadow: "0 4px 20px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,215,0,0.1)",
}

const GOLD = "#D4A34B"
const DIM = "rgba(255,248,225,0.5)"

// ── Resource Bar (top) ──

interface ResourceBarProps {
  spaces: SpaceData[]
}

function ResourceBar({ spaces }: ResourceBarProps) {
  const activeCount = spaces.filter((s) => s.status === "active").length
  const totalRuns = spaces.reduce((sum, s) => sum + s.stats.runs, 0)

  const now = new Date()
  const timeStr = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })

  return (
    <div
      style={{
        ...PANEL_STYLE,
        position: "absolute",
        top: 12,
        left: "50%",
        transform: "translateX(-50%)",
        display: "flex",
        gap: 24,
        padding: "8px 20px",
        fontSize: 13,
        zIndex: 10,
      }}
    >
      <span>
        <span style={{ color: GOLD, marginRight: 6 }}>&#9733;</span>
        {totalRuns} runs
      </span>
      <span style={{ color: "rgba(255,255,255,0.2)" }}>|</span>
      <span>
        <span style={{ color: "#4CAF50", marginRight: 6 }}>&#9679;</span>
        {activeCount} active
      </span>
      <span style={{ color: "rgba(255,255,255,0.2)" }}>|</span>
      <span>
        <span style={{ color: "#FF9800", marginRight: 6 }}>&#9651;</span>
        {spaces.filter((s) => s.status === "building").length} building
      </span>
      <span style={{ color: "rgba(255,255,255,0.2)" }}>|</span>
      <span style={{ color: DIM }}>{timeStr}</span>
    </div>
  )
}

// ── Building Info Panel (bottom right) ──

function BuildingInfoPanel({ spaces }: { spaces: SpaceData[] }) {
  const { selectedSlug, startTransition } = useMagnovaStore()

  const space = spaces.find((s) => s.slug === selectedSlug)
  if (!space) return null

  return (
    <div
      style={{
        ...PANEL_STYLE,
        position: "absolute",
        bottom: 20,
        right: 20,
        width: 280,
        padding: "16px",
        zIndex: 10,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: "#FFF8E1" }}>
          {space.name}
        </h3>
        <span
          style={{
            fontSize: 10,
            padding: "2px 8px",
            borderRadius: 10,
            background: space.status === "active" ? "rgba(76,175,80,0.3)" :
                        space.status === "building" ? "rgba(255,152,0,0.3)" : "rgba(158,158,158,0.3)",
            color: space.status === "active" ? "#81C784" :
                   space.status === "building" ? "#FFB74D" : "#BDBDBD",
          }}
        >
          {space.status}
        </span>
      </div>

      <p style={{ margin: "0 0 12px", fontSize: 12, color: DIM, lineHeight: 1.4 }}>
        {space.description}
      </p>

      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: DIM, marginBottom: 12 }}>
        <span>{space.stats.runs} runs</span>
        {space.stats.lastActive && (
          <span>Last: {space.stats.lastActive}</span>
        )}
      </div>

      {space.status === "active" && (
        <button
          onClick={() => startTransition(space.slug)}
          style={{
            width: "100%",
            padding: "8px 0",
            background: `linear-gradient(180deg, ${GOLD} 0%, #B8862D 100%)`,
            border: "none",
            borderRadius: 4,
            color: "#1A0F00",
            fontWeight: 600,
            fontSize: 13,
            cursor: "pointer",
            letterSpacing: "0.5px",
          }}
        >
          Enter Space
        </button>
      )}

      {space.status === "building" && (
        <div
          style={{
            width: "100%",
            padding: "8px 0",
            textAlign: "center",
            background: "rgba(255,152,0,0.15)",
            borderRadius: 4,
            color: "#FFB74D",
            fontSize: 12,
          }}
        >
          Under Construction
        </div>
      )}

      {space.status === "locked" && (
        <div
          style={{
            width: "100%",
            padding: "8px 0",
            textAlign: "center",
            background: "rgba(158,158,158,0.15)",
            borderRadius: 4,
            color: "#BDBDBD",
            fontSize: 12,
          }}
        >
          Locked
        </div>
      )}
    </div>
  )
}

// ── Space Roster (left sidebar) ──

function SpaceRoster({ spaces }: { spaces: SpaceData[] }) {
  const { showRoster, selectedSlug, selectSpace } = useMagnovaStore()

  if (!showRoster) return null

  return (
    <div
      style={{
        ...PANEL_STYLE,
        position: "absolute",
        left: 12,
        top: 60,
        width: 200,
        maxHeight: "calc(100vh - 120px)",
        overflow: "auto",
        padding: "12px",
        zIndex: 10,
      }}
    >
      <div style={{ fontSize: 11, fontWeight: 600, color: GOLD, marginBottom: 8, letterSpacing: 1 }}>
        COWORK SPACES
      </div>
      {spaces.map((space) => (
        <div
          key={space.slug}
          onClick={() => selectSpace(space.slug)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "6px 8px",
            marginBottom: 2,
            borderRadius: 4,
            cursor: space.status === "locked" ? "not-allowed" : "pointer",
            background: selectedSlug === space.slug ? "rgba(212, 163, 75, 0.2)" : "transparent",
            opacity: space.status === "locked" ? 0.4 : 1,
            transition: "background 0.15s",
          }}
        >
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: space.status === "active" ? "#4CAF50" :
                          space.status === "building" ? "#FF9800" : "#9E9E9E",
              flexShrink: 0,
            }}
          />
          <span style={{ fontSize: 12, color: selectedSlug === space.slug ? "#FFF8E1" : DIM }}>
            {space.name}
          </span>
        </div>
      ))}
    </div>
  )
}

// ── Transition Overlay ──

function TransitionOverlay() {
  const { isTransitioning, transitionTarget } = useMagnovaStore()

  if (!isTransitioning) return null

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "rgba(10, 5, 0, 0.95)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
        animation: "fadeIn 0.4s ease-in",
        color: "#FFF8E1",
        fontFamily: "'Segoe UI', system-ui, sans-serif",
      }}
    >
      <div style={{ fontSize: 24, fontWeight: 600, marginBottom: 12 }}>
        Entering workspace...
      </div>
      <div style={{ fontSize: 14, color: DIM }}>
        {transitionTarget}
      </div>
    </div>
  )
}

// ── Main HUD Export ──

interface HudOverlayProps {
  spaces: SpaceData[]
}

export function HudOverlay({ spaces }: HudOverlayProps) {
  return (
    <>
      <ResourceBar spaces={spaces} />
      <SpaceRoster spaces={spaces} />
      <BuildingInfoPanel spaces={spaces} />
      <TransitionOverlay />
    </>
  )
}
