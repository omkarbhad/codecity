"use client"

import { useEffect, useState, type CSSProperties, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeftIcon, ChevronRightIcon, MoonIcon, SunIcon } from "@/components/ui/icons"
import { SidebarProvider, SidebarTrigger } from "@codecity/ui/components/sidebar"
import { AppIcon } from "@/components/ui/app-icon"
import { isTauri } from "@/lib/tauri"
import { useResolvedTheme, useSettings } from "@/lib/settings"

/** Space the macOS window buttons take at the top of the sidebar (titleBarStyle "Overlay"). */
export const TRAFFIC_LIGHTS_HEIGHT = 38

export const shellIconButton =
  "flex size-7 shrink-0 items-center justify-center rounded-[6px] text-(--muted) transition-[color,background-color,transform] duration-150 hover:bg-(--bg-raised) hover:text-(--cream) active:translate-y-px aria-pressed:text-(--cream) [&_svg]:size-4"

/** True in the desktop app on macOS, where the window buttons overlay the window's top-left corner. */
export function useReserveTrafficLights() {
  const [reserve, setReserve] = useState(false)
  useEffect(() => {
    setReserve(isTauri() && /Mac/i.test(navigator.userAgent))
  }, [])
  return reserve
}

/** Back and forward, for the start of a page card's top bar. */
export function FrameNav({ children }: { children?: ReactNode }) {
  const router = useRouter()
  return (
    <div className="flex shrink-0 items-center gap-0.5">
      {children}
      <button type="button" className={shellIconButton} title="Back" aria-label="Back" onClick={() => router.back()}>
        <AppIcon icon={ChevronLeftIcon} />
      </button>
      <button type="button" className={shellIconButton} title="Forward" aria-label="Forward" onClick={() => router.forward()}>
        <AppIcon icon={ChevronRightIcon} />
      </button>
    </div>
  )
}

/** FrameNav with the sidebar toggle, for pages inside WindowFrame. */
export function SidebarFrameNav() {
  return (
    <FrameNav>
      <SidebarTrigger className={shellIconButton} title="Toggle sidebar" />
    </FrameNav>
  )
}

/**
 * Ghostly's workspace frame for the sidebar pages: the sidebar runs to the top
 * of the window on the near-black frame (the macOS window buttons sit over its
 * top), and the page is a rounded inset card beside it.
 */
export function WindowFrame({ children }: { children: ReactNode }) {
  // Collapsed rail width: the inset variant adds 16px, giving 92px on macOS
  // (room for the window buttons) and 64px elsewhere, matching the project page.
  const reserveLights = useReserveTrafficLights()
  return (
    <SidebarProvider
      className="min-h-svh bg-(--bg-deep)"
      style={{ "--sidebar-width-icon": reserveLights ? "76px" : "48px" } as CSSProperties}
    >
      {children}
    </SidebarProvider>
  )
}

/** Light/dark switch for the top bars (Settings also offers "System"). */
export function ThemeToggle() {
  const theme = useResolvedTheme()
  const setAppearance = useSettings((s) => s.setAppearance)
  const next = theme === "dark" ? "light" : "dark"
  return (
    <button
      type="button"
      className={shellIconButton}
      title={`Switch to ${next} mode`}
      aria-label={`Switch to ${next} mode`}
      onClick={() => setAppearance(next)}
    >
      <AppIcon icon={theme === "dark" ? SunIcon : MoonIcon} />
    </button>
  )
}
