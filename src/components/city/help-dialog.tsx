"use client"

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@codecity/ui/components/dialog"

// Legend swatches use theme colours (see src/lib/theme.ts).
const LEGEND_ITEMS = [
  { icon: "\u25AE", label: "Height = Lines of code", color: "var(--sev-low)" },
  { icon: "\u25AC", label: "Width = Functions", color: "var(--lime)" },
  { icon: "\u25AD", label: "Wide base = 200+ lines", color: "var(--cream-dark)" },
  { icon: "\u2502", label: "Mast + red beacon = High complexity", color: "var(--sev-high)" },
  { icon: "\u2312", label: "Glass dome = React component", color: "var(--sev-low)" },
  { icon: "\u25A4", label: "Rooftop units = Rich types", color: "var(--sev-med)" },
  { icon: "\u25A3", label: "City block = Directory", color: "var(--muted)" },
]

const SHORTCUTS = [
  ["Click", "Select building"],
  ["L-Drag", "Pan camera"],
  ["R-Drag", "Orbit"],
  ["Scroll", "Zoom"],
  ["WASD", "Pan"],
  ["R", "Reset camera"],
  ["1-5", "Colour mode"],
  ["B", "Toggle labels"],
  ["/", "Search files"],
  ["⌘E", "Explorer"],
  ["L", "Toggle sidebar"],
  ["⌘,", "Settings"],
  ["Tab", "Next file"],
  ["Esc", "Deselect"],
]

/** What the city's shapes mean, and the keyboard shortcuts. Opened from the sidebar or with "?". */
export function HelpDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden rounded-[16px] border border-(--border-pixel) bg-(--bg) p-0 shadow-(--shadow-lg) sm:max-w-[420px]">
        <DialogHeader className="border-b border-(--border-pixel) px-5 py-4">
          <DialogTitle className="text-[15px] font-semibold leading-none text-(--cream)">Help</DialogTitle>
          <DialogDescription className="mt-1.5 text-[13px] leading-none text-(--muted)">How to read the city, and the shortcuts</DialogDescription>
        </DialogHeader>
        <div className="max-h-[65vh] overflow-y-auto scroll-thin">
          <section className="px-5 pb-3 pt-4">
            <p className="mb-2 text-[12px] font-medium text-(--muted)">Reading the city</p>
            <div className="space-y-1.5">
              {LEGEND_ITEMS.map((item) => (
                <div key={item.label} className="flex items-center gap-2.5">
                  <span className="w-4 shrink-0 text-center text-sm" style={{ color: item.color }}>{item.icon}</span>
                  <span className="text-[13px] text-(--cream-dark)">{item.label}</span>
                </div>
              ))}
            </div>
          </section>
          <section className="border-t border-(--border-pixel) px-5 pb-5 pt-4">
            <p className="mb-2 text-[12px] font-medium text-(--muted)">Shortcuts</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
              {SHORTCUTS.map(([key, desc]) => (
                <div key={key} className="flex items-center gap-2">
                  <kbd className="min-w-[46px] rounded-[6px] bg-(--bg-raised) px-1.5 py-0.5 text-center font-sans text-[11px] text-(--cream)">{key}</kbd>
                  <span className="text-[12px] text-(--cream-dark)">{desc}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  )
}
