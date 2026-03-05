import type { Metadata } from "next"
import { StyleGuide } from "@/designsystem/docs/styleguide"

export const metadata: Metadata = {
  title: "Design System — CodeCity",
  description: "CodeCity design tokens, typography, colors, spacing, and component reference.",
}

export default function DesignSystemPage() {
  return <StyleGuide />
}
