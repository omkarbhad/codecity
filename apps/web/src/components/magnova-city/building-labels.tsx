"use client"

import { useMemo } from "react"
import { Html } from "@react-three/drei"
import type { SpaceData } from "@/lib/magnova/types"
import { useMagnovaStore } from "./use-magnova-store"

interface BuildingLabelsProps {
  spaces: SpaceData[]
}

const STATUS_ICONS: Record<string, string> = {
  active: "\u2022",    // bullet
  building: "\u25B3",  // triangle
  locked: "\u2716",    // X mark
}

const STATUS_COLORS: Record<string, string> = {
  active: "#4CAF50",
  building: "#FF9800",
  locked: "#9E9E9E",
}

export function BuildingLabels({ spaces }: BuildingLabelsProps) {
  const { hoveredSlug, selectedSlug } = useMagnovaStore()

  return (
    <group>
      {spaces.map((space) => {
        const isHighlighted = hoveredSlug === space.slug || selectedSlug === space.slug
        const labelHeight = space.buildingType === "tower" ? 9 :
                           space.buildingType === "castle" ? 8 :
                           space.buildingType === "temple" ? 6 :
                           space.buildingType === "library" ? 6.5 :
                           space.buildingType === "archive" ? 5 : 5

        return (
          <Html
            key={space.slug}
            position={[space.position.x, labelHeight, space.position.z]}
            center
            occlude={false}
            style={{
              pointerEvents: "none",
              transition: "opacity 0.2s",
              opacity: isHighlighted ? 1 : 0.7,
            }}
          >
            <div
              style={{
                background: isHighlighted
                  ? "rgba(30, 20, 10, 0.9)"
                  : "rgba(30, 20, 10, 0.6)",
                color: "#FFF8E1",
                padding: isHighlighted ? "6px 12px" : "3px 8px",
                borderRadius: "4px",
                fontSize: isHighlighted ? "13px" : "11px",
                fontFamily: "'Segoe UI', system-ui, sans-serif",
                fontWeight: isHighlighted ? 600 : 400,
                whiteSpace: "nowrap",
                border: isHighlighted
                  ? "1px solid rgba(255, 215, 0, 0.5)"
                  : "1px solid rgba(255, 255, 255, 0.1)",
                boxShadow: isHighlighted
                  ? "0 2px 12px rgba(0,0,0,0.4)"
                  : "none",
                textAlign: "center",
                transform: "translateY(-50%)",
              }}
            >
              <span style={{ color: STATUS_COLORS[space.status], marginRight: "4px" }}>
                {STATUS_ICONS[space.status]}
              </span>
              {space.name}
            </div>
          </Html>
        )
      })}
    </group>
  )
}
