"use client"

import { useMemo, useState } from "react"
import { TriangleAlertIcon, ChevronDownIcon, ChevronRightIcon, XIcon, CopyIcon, LoaderCircleIcon, ShieldCheckIcon, CheckIcon, RefreshCwIcon } from "@/components/ui/icons"
import { AppIcon } from "@/components/ui/app-icon"
import { cn } from "@codecity/ui/lib/utils"
import type { SecurityScanResult, SecurityFinding, Severity } from "@/lib/tauri"

interface SecuritySidebarProps {
  result: SecurityScanResult | null
  loading: boolean
  error: string | null
  /** Runs the scan again; shown on errors when scanning is possible. */
  onRetry?: () => void
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

  function handleCopy() {
    const text = `[${SEV_LABEL[finding.severity]}] ${finding.file_path}:${finding.start_line} — ${finding.message} (${finding.rule_id})${finding.snippet ? `\n\n${finding.snippet.trim()}` : ""}`
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  return (
    <div className="border-b border-(--border-pixel)">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="flex w-full items-stretch gap-3 px-3 py-3 text-left transition-colors hover:bg-(--bg-raised)/40"
      >
        <span
          className={cn(
            "flex h-9 w-12 shrink-0 items-center justify-center text-[11px] font-semibold text-primary-foreground",
            SEV_BG[finding.severity]
          )}
        >
          {SEV_LABEL[finding.severity]}
        </span>

        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-[12px] text-primary" title={finding.rule_id}>
              {shortRule(finding.rule_id)}
            </span>
            <AppIcon icon={expanded ? ChevronDownIcon : ChevronRightIcon} className="size-3.5 shrink-0 text-(--muted)" />
          </div>

          <div className="flex items-baseline gap-2 text-[11px] leading-snug">
            <span className="truncate text-(--cream-dark)" title={finding.file_path}>
              {expanded ? finding.file_path : fileName}:{finding.start_line}
              {expanded && finding.end_line !== finding.start_line && `–${finding.end_line}`}
            </span>
            <span className="shrink-0 text-(--dim)">//</span>
            <span className={cn("text-(--cream-dark)", expanded ? "" : "truncate")}>
              {finding.message}
            </span>
          </div>
        </div>
      </button>

      {expanded && (
        <div className="space-y-2 pb-3 pl-[72px] pr-3">
          {finding.snippet && (
            <pre className="overflow-x-auto border border-(--border-pixel) bg-(--bg-deep) p-2 text-[11px] leading-relaxed text-(--cream) rounded-md">
              {finding.snippet.trim()}
            </pre>
          )}
          <div className="flex items-center justify-between gap-2">
            <span className="min-w-0 truncate text-[11px] text-(--muted)" title={finding.rule_id}>
              rule: {finding.rule_id}
            </span>
            <button
              type="button"
              onClick={handleCopy}
              aria-label="Copy finding"
              className="flex shrink-0 items-center gap-1 px-1.5 py-0.5 text-[11px] text-(--cream-dark) transition-colors hover:text-(--cream) active:translate-y-px bg-(--bg-card) hover:bg-(--bg-raised) rounded-full"
            >
              <AppIcon icon={copied ? CheckIcon : CopyIcon} className={cn("size-3.5", copied && "text-(--lime)")} />
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export function SecuritySidebar({ result, loading, error, onRetry, onClose }: SecuritySidebarProps) {
  const [copied, setCopied] = useState(false)
  const scan = result?.scan
  const findings = result?.findings ?? []

  const sortedFindings = useMemo(
    () => [...findings].sort((a, b) => SEV_ORDER[a.severity] - SEV_ORDER[b.severity]),
    [findings]
  )

  const isRunning = loading || scan?.status === "RUNNING" || scan?.status === "PENDING"
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
    <div className="flex h-full flex-col overflow-hidden bg-transparent">
      {/* Header */}
      <div className="flex h-11 shrink-0 items-center border-b border-(--border-pixel) bg-(--bg) px-3">
        <div className="flex w-full items-center gap-3">
          <span className="flex min-w-0 flex-1 items-center gap-1.5 truncate text-[12px] font-semibold text-(--cream)">
            <AppIcon icon={ShieldCheckIcon} className="size-3.5 shrink-0 text-primary" />
            Security scan
            <span className="rounded-full bg-(--bg-raised) px-1.5 py-px text-[10.5px] font-medium text-(--cream-dark)" title="Still being worked on: findings can be incomplete">Beta</span>
          </span>

          {/* Status + actions */}
          <div className="flex shrink-0 items-center gap-2">
            {isRunning && <AppIcon icon={LoaderCircleIcon} className="size-3.5 animate-spin text-primary" />}
            <span className="flex items-center gap-1.5 text-[11px] text-(--cream-dark)">
              <span className={cn("size-1.5", statusDotClass)} />
              {statusLabel}
            </span>
            {totalFindings > 0 && (
              <button
                onClick={handleCopyAll}
                aria-label="Copy all findings"
                title="Copy all findings"
                className="flex items-center gap-1 px-1.5 py-0.5 text-[11px] text-(--cream-dark) transition-colors hover:text-(--cream) active:translate-y-px bg-(--bg-card) hover:bg-(--bg-raised) rounded-full"
              >
                <AppIcon icon={copied ? CheckIcon : CopyIcon} className={cn("size-3.5", copied && "text-(--lime)")} />
                {copied ? "Copied" : "Copy all"}
              </button>
            )}
            <button
              onClick={onClose}
              aria-label="Close security panel"
              title="Close"
              className="flex size-6 items-center justify-center border border-transparent text-(--muted) transition-colors hover:border-(--border-pixel) hover:bg-(--bg-raised) hover:text-(--cream)"
            >
              <AppIcon icon={XIcon} className="size-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto overscroll-contain scroll-thin">
        {isRunning && !result && (
          <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
            <AppIcon icon={LoaderCircleIcon} className="size-5 animate-spin text-primary" />
            <p className="text-[12px] text-(--cream-dark)">Scanning…</p>
            <p className="text-[11px] text-(--muted)">{`> opengrep --lang auto --json`}</p>
          </div>
        )}

        {error && (
          <div className="m-3 flex items-start gap-2 border border-(--sev-high) bg-[color-mix(in_srgb,var(--sev-high)_8%,transparent)] p-3 rounded-md">
            <AppIcon icon={TriangleAlertIcon} className="mt-px size-3.5 shrink-0 text-(--sev-high)" />
            <div className="min-w-0">
              <p className="break-words text-[12px] text-(--sev-high)">{error}</p>
              {onRetry && (
                <button
                  type="button"
                  onClick={onRetry}
                  className="mt-2 inline-flex h-7 items-center gap-1.5 rounded-full border border-(--sev-high) px-3 text-[12px] font-medium text-(--sev-high) hover:bg-[color-mix(in_srgb,var(--sev-high)_12%,transparent)] focus-visible:outline-2 focus-visible:outline-(--sev-high)"
                >
                  <AppIcon icon={RefreshCwIcon} className="size-3" />
                  Scan again
                </button>
              )}
            </div>
          </div>
        )}

        {isFailed && scan?.error && (
          <div className="m-3 flex items-start gap-2 border border-(--sev-high) bg-[color-mix(in_srgb,var(--sev-high)_8%,transparent)] p-3 rounded-md">
            <AppIcon icon={TriangleAlertIcon} className="mt-px size-3.5 shrink-0 text-(--sev-high)" />
            <div className="min-w-0">
              <p className="break-words text-[12px] text-(--sev-high)">{scan.error}</p>
              {onRetry && (
                <button
                  type="button"
                  onClick={onRetry}
                  className="mt-2 inline-flex h-7 items-center gap-1.5 rounded-full border border-(--sev-high) px-3 text-[12px] font-medium text-(--sev-high) hover:bg-[color-mix(in_srgb,var(--sev-high)_12%,transparent)] focus-visible:outline-2 focus-visible:outline-(--sev-high)"
                >
                  <AppIcon icon={RefreshCwIcon} className="size-3" />
                  Scan again
                </button>
              )}
            </div>
          </div>
        )}

        {scan?.status === "COMPLETED" && totalFindings === 0 && (
          <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
            <div className="flex size-12 items-center justify-center border border-(--bg) bg-(--lime) text-primary-foreground rounded-md">
              <AppIcon icon={CheckIcon} className="size-6" />
            </div>
            <p className="text-[12px] font-semibold text-(--lime)">No issues</p>
            <p className="text-[11px] text-(--muted)">scan complete · 0 findings</p>
          </div>
        )}

        {sortedFindings.map((f) => (
          <FindingRow key={f.id} finding={f} />
        ))}
      </div>

      {/* Terminal footer */}
      <div className="shrink-0 border-t border-(--border-pixel) bg-(--bg-card) px-3 py-1.5">
        <div className="flex items-center justify-between gap-2 text-[11px] text-(--muted)">
          <span className="truncate">
            <span className="text-(--dim)">{">"}</span>{" "}
            {totalFindings > 0 ? `showing ${sortedFindings.length} of ${totalFindings}` : "no findings"}
          </span>
          <span className="shrink-0 truncate text-(--muted)">
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
