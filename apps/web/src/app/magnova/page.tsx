"use client"

import dynamic from "next/dynamic"
import { getMagnovaCitySnapshot } from "@/lib/magnova/spaces-config"

// Dynamic import to avoid SSR issues with Three.js
const MagnovaCity = dynamic(
  () => import("@/components/magnova-city/magnova-scene"),
  { ssr: false }
)

export default function MagnovaPage() {
  const snapshot = getMagnovaCitySnapshot()

  return <MagnovaCity snapshot={snapshot} />
}
