"use client"

import { StyleGuideHeader } from "./header"
import { StyleGuideNav } from "./nav"
import { ColorsSection } from "./sections/colors-section"
import { TypographySection } from "./sections/typography-section"
import { SpacingSection } from "./sections/spacing-section"
import { RadiusElevationSection } from "./sections/radius-elevation-section"
import { BreakpointsSection } from "./sections/breakpoints-section"

export function StyleGuide() {
  return (
    <div className="page-shell">
      <div className="content-container py-12">
        <StyleGuideHeader />
        <StyleGuideNav />
        <ColorsSection />
        <TypographySection />
        <SpacingSection />
        <RadiusElevationSection />
        <BreakpointsSection />
        <footer className="mt-20 pt-8 border-t border-border/30 text-center">
          <p className="text-xs text-muted-foreground">
            CodeCity Design System v1.0 — Tokens extracted from{" "}
            <code className="text-primary/80">packages/ui/src/styles/globals.css</code>
          </p>
        </footer>
      </div>
    </div>
  )
}
