"use client"

import { useMemo, useState } from "react"
import { X, Loader2, Copy, Check, ChevronDown, ChevronRight } from "lucide-react"
import { cn } from "@codecity/ui/lib/utils"
import type { SecurityScanResult, SecurityFinding, Severity } from "@/lib/tauri"

interface SecuritySidebarProps {
  result: SecurityScanResult | null
  loading: boolean
  error: string | null
  onClose: () => void
}

// ERROR → HIGH (pink) · WARNING → MED (orange) · INFO → LOW (cyan)
const SEV_ORDER: Record<Severity, number> = { ERROR: 0, WARNING: 1, INFO: 2 }
const SEV_LABEL: Record<Severity, string> = { ERROR: "HIGH", WARNING: "MED", INFO: "LOW" }
const SEV_BG: Record<Severity, string> = {
  ERROR: "bg-(--sev-high)",
  WARNING: "bg-(--sev-med)",
  INFO: "bg-(--sev-low)",
}

function shortRule(ruleId: string): string {
  const parts = ruleId.split(".")
  return parts[parts.length - 1] || ruleId
}

function FindingRow({ finding }: { finding: SecurityFinding }) {
  const [expanded, setExpanded] = useState(false)
  const [copied, setCopied] = useState(false)
  const fileName = finding.file_path.split("/").pop() ?? finding.file_path

  function handleCopy(e: React.MouseEvent) {
    e.stopPropagation()
    const text = `[${SEV_LABEL[finding.severity]}] ${finding.file_path}:${finding.start_line} — ${finding.message} (${finding.rule_id})${finding.snippet ? `\n\n${finding.snippet.trim()}` : ""}`
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  return (
    <button
      type="button"
      onClick={() => setExpanded((v) => !v)}
      className="group flex w-full items-stretch gap-3 border-b border-dashed border-(--border-pixel) px-3 py-3 text-left transition-colors hover:bg-(--bg-raised)/30"
    >
      <span
        className={cn(
          "flex h-9 w-12 shrink-0 items-center justify-center font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-[#0d0d0f]",
          SEV_BG[finding.severity]
        )}
      >
        {SEV_LABEL[finding.severity]}
      </span>

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate font-mono text-[12px] text-primary">
            {shortRule(finding.rule_id)}
          </span>
          <div className="flex shrink-0 items-center gap-1">
            <span
              onClick={handleCopy}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === "Enter") handleCopy(e as unknown as React.MouseEvent) }}
              aria-label="Copy finding"
              className="cursor-pointer rounded-none p-0.5 text-(--muted) opacity-0 transition-opacity hover:text-(--cream) group-hover:opacity-100"
            >
              {copied ? <Check className="size-3 text-(--lime)" /> : <Copy className="size-3" />}
            </span>
            <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-(--muted)">
              {expanded ? "CLOSE" : "OPEN"}
            </span>
            {expanded ? (
              <ChevronDown className="size-3 text-(--muted)" />
            ) : (
              <ChevronRight className="size-3 text-(--muted)" />
            )}
          </div>
        </div>

        <div className="flex items-baseline gap-2 font-mono text-[10px] leading-snug">
          <span className="truncate text-(--cream-dark)" title={finding.file_path}>
            {expanded ? finding.file_path : fileName}:{finding.start_line}
            {expanded && finding.end_line !== finding.start_line && `–${finding.end_line}`}
          </span>
          <span className="shrink-0 text-(--dim)">//</span>
          <span className={cn("text-(--cream-dark)", expanded ? "" : "truncate")}>
            {finding.message}
          </span>
        </div>

        {expanded && finding.snippet && (
          <pre className="mt-2 overflow-x-auto border-2 border-(--border-pixel) bg-(--bg-deep) p-2 font-mono text-[10px] leading-relaxed text-(--cream)">
            {finding.snippet.trim()}
          </pre>
        )}
        {expanded && (
          <div className="mt-1 font-mono text-[9px] uppercase tracking-[0.08em] text-(--dim)">
            rule: {finding.rule_id}
          </div>
        )}
      </div>
    </button>
  )
}

export function SecuritySidebar({ result, loading, error, onClose }: SecuritySidebarProps) {
  const [copied, setCopied] = useState(false)
  const scan = result?.scan
  const findings = result?.findings ?? []

  const sortedFindings = useMemo(
    () => [...findings].sort((a, b) => SEV_ORDER[a.severity] - SEV_ORDER[b.severity]),
    [findings]
  )

  const isRunning = loading || scan?.status === "RUNNING"
  const isFailed = scan?.status === "FAILED"
  const isCancelled = scan?.status === "CANCELLED"
  const totalFindings = findings.length

  const statusLabel = isRunning ? "LIVE" : isFailed ? "FAIL" : isCancelled ? "STOP" : scan?.status === "COMPLETED" ? "DONE" : "IDLE"
  const statusDotClass = isRunning
    ? "bg-(--lime) animate-pulse"
    : isFailed
      ? "bg-(--sev-high)"
      : isCancelled
        ? "bg-(--muted)"
        : "bg-(--lime)"

  function handleCopyAll() {
    if (findings.length === 0) return
    const lines = sortedFindings.map(
      (f) => `[${SEV_LABEL[f.severity]}] ${f.file_path}:${f.start_line} — ${f.message} (${f.rule_id})`
    )
    navigator.clipboard.writeText(lines.join("\n")).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const errors = findings.filter((f) => f.severity === "ERROR").length
  const warnings = findings.filter((f) => f.severity === "WARNING").length
  const infos = findings.filter((f) => f.severity === "INFO").length

  return (
    <div className="pixel-shadow flex h-full flex-col overflow-hidden border-2 border-(--border-light) bg-(--bg-deep)">
      {/* Terminal header */}
      <div className="shrink-0 border-b-2 border-(--border-pixel) bg-(--bg-card) px-3 py-2.5">
        <div className="flex items-center gap-3">
          {/* Traffic-light pixels */}
          <div className="flex shrink-0 items-center gap-1.5">
            <span className="size-2.5 bg-(--sev-high)" />
            <span className="size-2.5 bg-(--sev-med)" />
            <span className="size-2.5 bg-(--lime)" />
          </div>

          {/* Title */}
          <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-(--cream-dark)">
            opengrep scan <span className="text-(--dim)">~</span> findings.json
          </span>

          {/* Status + actions */}
          <div className="flex shrink-0 items-center gap-2">
            {isRunning && <Loader2 className="size-3 animate-spin text-primary" />}
            <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.08em] text-(--cream-dark)">
              <span className={cn("size-1.5", statusDotClass)} />
              {statusLabel}
            </span>
            {totalFindings > 0 && (
              <button
                onClick={handleCopyAll}
                aria-label="Copy all findings"
                title="Copy all findings"
                className="btn-press flex items-center gap-1 border-2 border-(--border-pixel) bg-(--bg-raised) px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.08em] text-(--cream-dark) transition-colors hover:border-(--border-light) hover:text-(--cream)"
              >
                {copied ? <Check className="size-2.5 text-(--lime)" /> : <Copy className="size-2.5" />}
                {copied ? "OK" : "COPY ALL"}
              </button>
            )}
            <button
              onClick={onClose}
              aria-label="Close security panel"
              className="rounded-none border-2 border-transparent p-0.5 text-(--muted) transition-colors hover:border-(--border-pixel) hover:bg-(--bg-raised) hover:text-(--cream)"
            >
              <X className="size-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto overscroll-contain scroll-thin">
        {isRunning && !result && (
          <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
            <Loader2 className="size-5 animate-spin text-primary" />
            <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-(--cream-dark)">Scanning…</p>
            <p className="font-mono text-[10px] text-(--dim)">{`> opengrep --lang auto --json`}</p>
          </div>
        )}

        {error && (
          <div className="m-3 border-2 border-(--sev-high) bg-[color-mix(in_srgb,var(--sev-high)_8%,transparent)] p-3">
            <p className="font-mono text-[11px] text-(--sev-high)">{error}</p>
          </div>
        )}

        {isFailed && scan?.error && (
          <div className="m-3 border-2 border-(--sev-high) bg-[color-mix(in_srgb,var(--sev-high)_8%,transparent)] p-3">
            <p className="font-mono text-[11px] text-(--sev-high)">{scan.error}</p>
          </div>
        )}

        {scan?.status === "COMPLETED" && totalFindings === 0 && (
          <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
            <div className="pixel-shadow-accent flex size-12 items-center justify-center border-2 border-[#0d0d0f] bg-(--lime) font-mono text-[16px] font-bold text-[#0d0d0f]">
              ✓
            </div>
            <p className="font-mono text-[12px] font-semibold uppercase tracking-[0.08em] text-(--lime)">No issues</p>
            <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-(--dim)">scan complete · 0 findings</p>
          </div>
        )}

        {sortedFindings.map((f) => (
          <FindingRow key={f.id} finding={f} />
        ))}
      </div>

      {/* Terminal footer */}
      <div className="shrink-0 border-t-2 border-(--border-pixel) bg-(--bg-card) px-3 py-1.5">
        <div className="flex items-center justify-between gap-2 font-mono text-[10px] uppercase tracking-[0.08em] text-(--muted)">
          <span className="truncate">
            <span className="text-(--dim)">{">"}</span>{" "}
            {totalFindings > 0 ? `showing ${sortedFindings.length} of ${totalFindings}` : "no findings"}
          </span>
          <span className="shrink-0 truncate text-(--dim)">
            {totalFindings > 0 ? (
              <>
                <span className="text-(--sev-high)">{errors}</span> · <span className="text-(--sev-med)">{warnings}</span> · <span className="text-(--sev-low)">{infos}</span>
                <span className="ml-2">sort: sev desc</span>
              </>
            ) : (
              "filter: severity ≥ low"
            )}
          </span>
        </div>
      </div>
    </div>
  )
}
