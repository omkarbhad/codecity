"use client"

import { APPEARANCES, FILE_ICON_THEMES, useSettings } from "@/lib/settings"
import { FileIcon } from "./file-icons"
import { DISTRICT_PALETTE as P } from "@/lib/theme"

// Sample names shown beside each icon set.
const SAMPLES: { name: string; folder?: boolean; color?: string }[] = [
  { name: "src", folder: true },
  { name: "index.tsx", color: P[0] },
  { name: "main.rs", color: P[4] },
  { name: "app.py", color: P[1] },
  { name: "package.json", color: P[3] },
  { name: "README.md", color: P[2] },
  { name: "Dockerfile", color: P[5] },
]

function SectionLabel({ children }: { children: string }) {
  return (
    <p className="mb-2 text-[11px] font-semibold text-(--cream)">{children}</p>
  )
}

export function SettingsPanel() {
  const appearance = useSettings((s) => s.appearance)
  const setAppearance = useSettings((s) => s.setAppearance)
  const fileIconTheme = useSettings((s) => s.fileIconTheme)
  const setFileIconTheme = useSettings((s) => s.setFileIconTheme)
  const indentGuides = useSettings((s) => s.indentGuides)
  const setIndentGuides = useSettings((s) => s.setIndentGuides)

  return (
    <div className="flex-1 overflow-y-auto px-3 py-2 scroll-thin">
      <section className="mb-5">
        <SectionLabel>Appearance</SectionLabel>
        <div className="cc-seg w-full" role="group" aria-label="Appearance">
          {APPEARANCES.map((a) => (
            <button key={a.key} type="button" aria-pressed={appearance === a.key} onClick={() => setAppearance(a.key)} className="cc-seg-btn h-7 flex-1 justify-center">
              {a.label}
            </button>
          ))}
        </div>
      </section>

      <section>
        <SectionLabel>File icons</SectionLabel>
        <div role="radiogroup" aria-label="File icons" className="flex flex-col gap-1.5">
          {FILE_ICON_THEMES.map((t) => {
            const active = fileIconTheme === t.key
            return (
              <button
                key={t.key}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setFileIconTheme(t.key)}
                className={`flex flex-col gap-2 rounded-[10px] border px-2.5 py-2 text-left transition-[border-color,background-color,transform] duration-100 active:translate-y-px ${
                  active
                    ? "border-[color-mix(in_srgb,var(--cream)_70%,transparent)] bg-(--bg-card)"
                    : "border-transparent bg-(--bg-card)/50 hover:bg-(--bg-card)"
                }`}
              >
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className={`text-[12px] font-semibold text-(--cream)`}>
                    {t.label}
                  </span>
                  <span className="truncate text-[11px] text-(--muted)">{t.description}</span>
                </span>
                <span className="flex items-center gap-2" aria-hidden="true">
                  {SAMPLES.map((s) => (
                    <FileIcon key={s.name} name={s.name} folder={s.folder} color={s.color} theme={t.key} />
                  ))}
                </span>
              </button>
            )
          })}
        </div>
      </section>

      <section className="mt-5">
        <SectionLabel>File tree</SectionLabel>
        <label className="flex cursor-pointer items-center justify-between gap-3 border border-(--border-pixel) px-2.5 py-2 transition-colors hover:border-(--border-light) rounded-md">
          <span className="flex flex-col">
            <span className="text-[12px] text-(--cream)">Indent guides</span>
            <span className="text-[11px] text-(--muted)">Lines that show nesting depth</span>
          </span>
          <input
            type="checkbox"
            checked={indentGuides}
            onChange={(e) => setIndentGuides(e.target.checked)}
            className="size-4 shrink-0 cursor-pointer accent-(--lime)"
          />
        </label>
      </section>

      <p className="mt-5 text-[11px] leading-relaxed text-(--muted)">Saved on this device.</p>
    </div>
  )
}
