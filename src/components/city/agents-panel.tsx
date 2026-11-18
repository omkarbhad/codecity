"use client"

import { useMemo, useState } from "react"
import type { CitySnapshot } from "@/lib/types/city"
import { useCityStore } from "./use-city-store"
import { AGENTS, idleLabel, useAgentActivity } from "./use-agent-activity"
import { FileIcon } from "./file-icons"

type Filter = "edited" | "uncommitted" | "all"

const FILTERS: { key: Filter; label: string }[] = [
  { key: "edited", label: "Edited" },
  { key: "uncommitted", label: "Uncommitted" },
  { key: "all", label: "All" },
]

/**
 * The Agents section of the sidebar: turn agent mode on, then see each agent's
 * session, the file it is on, the files it edited, and which of those are not
 * committed yet.
 */
export function AgentsPanel({ snapshot }: { snapshot: CitySnapshot }) {
  const agentMode = useCityStore((s) => s.agentMode)
  const setAgentMode = useCityStore((s) => s.setAgentMode)
  const selectFile = useCityStore((s) => s.selectFile)
  const selectedFile = useCityStore((s) => s.selectedFile)
  const { sessions, uncommitted, error, isLoading } = useAgentActivity()
  const [filter, setFilter] = useState<Filter>("edited")

  const indexByPath = useMemo(() => new Map(snapshot.files.map((f, i) => [f.path, i])), [snapshot.files])
  // Uncommitted files no agent edit accounts for: yours, or an agent's shell command
  const otherUncommitted = useMemo(() => {
    const edited = new Set(sessions.flatMap((s) => s.files.filter((f) => f.edited).map((f) => f.path)))
    return [...uncommitted].filter((path) => !edited.has(path)).sort()
  }, [sessions, uncommitted])

  const row = (path: string, trailing: React.ReactNode) => {
    const name = path.split("/").pop() ?? path
    const index = indexByPath.get(path)
    return (
      <button
        key={path}
        type="button"
        disabled={index === undefined}
        onClick={() => selectFile(path, index)}
        title={index === undefined ? `${path} is not in the city` : path}
        className={`flex h-8 w-full items-center gap-2 rounded-[8px] px-2.5 text-left text-[13px] transition-colors disabled:opacity-50 ${
          selectedFile === path ? "bg-(--bg-on) text-(--cream)" : "text-(--cream-dark) enabled:hover:bg-(--bg-raised) enabled:hover:text-(--cream)"
        }`}
      >
        <FileIcon name={name} className="!size-3.5 shrink-0" />
        <span className="min-w-0 flex-1 truncate">{name}</span>
        {trailing}
      </button>
    )
  }
  const uncommittedDot = <span className="size-1.5 shrink-0 rounded-full bg-(--sev-med)" title="Not committed" />

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <label className="mx-2.5 mb-2 flex shrink-0 cursor-pointer items-center justify-between gap-3 rounded-[10px] bg-(--bg-card) px-3 py-2.5">
        <span className="flex min-w-0 flex-col">
          <span className="text-[13px] font-medium text-(--cream)">Agent mode</span>
          <span className="text-[11.5px] leading-snug text-(--muted)">Show Claude and Codex at work in this project</span>
        </span>
        <input type="checkbox" checked={agentMode} onChange={(e) => setAgentMode(e.target.checked)} className="size-4 shrink-0 cursor-pointer accent-(--lime)" />
      </label>

      {!agentMode ? (
        <p className="px-3.5 text-[12.5px] leading-relaxed text-(--muted)">
          Reads the session logs Claude Code and Codex keep on this computer, and git, to show which files they are
          working on, which they edited, and which edits are not committed. Nothing leaves this computer.
        </p>
      ) : error ? (
        <p className="px-3.5 text-[12.5px] leading-relaxed text-(--muted)">
          Agent mode works in the desktop app, on projects opened from a local folder.
        </p>
      ) : (
        <>
          <div className="shrink-0 px-2.5 pb-2">
            <div className="cc-seg w-full" role="group" aria-label="Which files to list">
              {FILTERS.map((f) => (
                <button key={f.key} type="button" aria-pressed={filter === f.key} onClick={() => setFilter(f.key)} className="cc-seg-btn h-7 flex-1 justify-center px-1 text-[12.5px]">
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3 scroll-thin">
            {sessions.length === 0 && (
              <p className="px-1.5 py-2 text-[12.5px] leading-relaxed text-(--muted)">
                {isLoading ? "Looking for agent sessions…" : "No agent has worked in this project in the last 12 hours."}
              </p>
            )}

            {sessions.map((session) => {
              const agent = AGENTS[session.agent]
              const files = session.files.filter((f) =>
                filter === "all" ? true : filter === "edited" ? f.edited : f.edited && uncommitted.has(f.path)
              )
              const current = session.currentFile?.split("/").pop()
              return (
                <section key={`${session.agent}-${session.id}`} className="pb-3">
                  <div className="flex items-center gap-2 px-2.5 pb-1 pt-2">
                    <span className={`size-2 shrink-0 rounded-full ${session.active ? "motion-safe:animate-pulse" : "opacity-50"}`} style={{ backgroundColor: agent.color }} />
                    <span className="text-[13px] font-medium text-(--cream)">{agent.name}</span>
                    <span className="min-w-0 flex-1 truncate text-[12px] text-(--muted)">
                      {session.active ? (current ? `working on ${current}` : "working") : idleLabel(session.idleSeconds)}
                    </span>
                    <span className="shrink-0 text-[12px] tabular-nums text-(--muted)">{files.length}</span>
                  </div>
                  {files.length === 0 ? (
                    <p className="px-2.5 text-[12px] text-(--muted)">
                      {filter === "uncommitted" ? "Everything it edited is committed." : filter === "edited" ? "It has only read files so far." : "No files."}
                    </p>
                  ) : (
                    files.map((f) =>
                      row(
                        f.path,
                        <>
                          {!f.edited && <span className="shrink-0 text-[11px] text-(--muted)">read</span>}
                          {f.edited && f.edits > 1 && <span className="shrink-0 text-[11px] tabular-nums text-(--muted)">{f.edits} edits</span>}
                          {f.edited && uncommitted.has(f.path) && uncommittedDot}
                        </>
                      )
                    )
                  )}
                </section>
              )
            })}

            {filter !== "edited" && otherUncommitted.length > 0 && (
              <section>
                <div className="flex items-center gap-2 px-2.5 pb-1 pt-2">
                  <span className="size-2 shrink-0 rounded-full bg-(--sev-med)" />
                  <span className="text-[13px] font-medium text-(--cream)">Other uncommitted changes</span>
                  <span className="flex-1" />
                  <span className="shrink-0 text-[12px] tabular-nums text-(--muted)">{otherUncommitted.length}</span>
                </div>
                <p className="px-2.5 pb-1 text-[11.5px] leading-snug text-(--muted)">Changed by you, or by an agent through a shell command.</p>
                {otherUncommitted.map((path) => row(path, uncommittedDot))}
              </section>
            )}
          </div>
        </>
      )}
    </div>
  )
}
