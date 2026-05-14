"use client"

import { useState } from "react"
import { X, AlertTriangle, AlertCircle, Info, ShieldCheck, Loader2, Copy, Check, ChevronDown, ChevronRight } from "lucide-react"
import { cn } from "@codecity/ui/lib/utils"
import type { SecurityScanResult, SecurityFinding, Severity } from "@/lib/tauri"

interface SecuritySidebarProps {
  result: SecurityScanResult | null
  loading: boolean
  error: string | null
  onClose: () => void
}

const SEVERITY_CONFIG: Record<Severity, { label: string; icon: typeof AlertCircle; className: string; badgeClass: string }> = {
  ERROR: {
    label: "Errors",
    icon: AlertCircle,
    className: "text-red-400",
    badgeClass: "border-red-500/20 bg-red-500/10 text-red-400",
  },
  WARNING: {
    label: "Warnings",
    icon: AlertTriangle,
    className: "text-yellow-400",
    badgeClass: "border-yellow-500/20 bg-yellow-500/10 text-yellow-400",
  },
  INFO: {
    label: "Info",
    icon: Info,
    className: "text-blue-400",
    badgeClass: "border-blue-500/20 bg-blue-500/10 text-blue-400",
  },
}

function FindingRow({ finding }: { finding: SecurityFinding }) {
  const cfg = SEVERITY_CONFIG[finding.severity]
  const Icon = cfg.icon
  const fileName = finding.file_path.split("/").pop() ?? finding.file_path
  const [expanded, setExpanded] = useState(false)
  const [copied, setCopied] = useState(false)

  function handleCopy(e: React.MouseEvent) {
    e.stopPropagation()
    const text = `${finding.severity}: ${finding.message}\n${finding.file_path}:${finding.start_line}\nRule: ${finding.rule_id}${finding.snippet ? `\n\n${finding.snippet.trim()}` : ""}`
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const Chevron = expanded ? ChevronDown : ChevronRight

  return (
    <div
      className="group cursor-pointer rounded-lg border border-white/[0.06] bg-white/[0.02] p-2.5 transition-colors hover:bg-white/[0.04]"
      onClick={() => setExpanded((v) => !v)}
    >
      <div className="flex items-start gap-2">
        <Icon className={cn("mt-0.5 size-3.5 shrink-0", cfg.className)} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-1">
            <p className={cn("text-[11px] text-white/80", expanded ? "whitespace-normal break-words" : "truncate")}>
              {finding.message}
            </p>
            <div className="ml-1 flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
              <button
                onClick={handleCopy}
                aria-label="Copy finding"
                title="Copy"
                className="rounded p-0.5 text-white/40 transition-colors hover:bg-white/[0.06] hover:text-white/70"
              >
                {copied ? <Check className="size-3 text-emerald-400" /> : <Copy className="size-3" />}
              </button>
              <Chevron className="size-3 text-white/30" />
            </div>
          </div>
          <div className="mt-1 flex items-center gap-1.5 flex-wrap">
            <span
              className={cn("text-[10px] text-white/45", expanded ? "break-all" : "truncate")}
              title={finding.file_path}
            >
              {expanded ? finding.file_path : fileName}:{finding.start_line}
              {expanded && finding.end_line !== finding.start_line && `–${finding.end_line}`}
            </span>
            <span className={cn("rounded border px-1 py-px text-[9px] font-medium", cfg.badgeClass)}>
              {expanded ? finding.rule_id : finding.rule_id.split(".").slice(-2).join(".")}
            </span>
          </div>
          {finding.snippet && (expanded ? (
            <pre className="mt-1.5 overflow-x-auto rounded bg-white/[0.03] p-1.5 text-[9px] text-white/55 leading-relaxed">
              {finding.snippet.trim()}
            </pre>
          ) : (
            <pre className="mt-1.5 max-h-10 overflow-hidden rounded bg-white/[0.03] p-1.5 text-[9px] text-white/55 leading-relaxed">
              {finding.snippet.trim()}
            </pre>
          ))}
        </div>
      </div>
    </div>
  )
}

function SeveritySection({ severity, findings }: { severity: Severity; findings: SecurityFinding[] }) {
  const cfg = SEVERITY_CONFIG[severity]
  const Icon = cfg.icon

  if (findings.length === 0) return null

  return (
    <div>
      <div className="flex items-center gap-2 border-t border-white/[0.06] bg-[#0d0d0f] px-3 py-2">
        <Icon className={cn("size-3 shrink-0", cfg.className)} />
        <span className="flex-1 text-[11px] font-semibold text-white/65">{cfg.label}</span>
        <span className="rounded border border-white/[0.07] bg-white/[0.03] px-1.5 py-0.5 text-[10px] tabular-nums text-white/48">
          {findings.length}
        </span>
      </div>
      <div className="space-y-1.5 px-3 py-2">
        {findings.map((f) => (
          <FindingRow key={f.id} finding={f} />
        ))}
      </div>
    </div>
  )
}

export function SecuritySidebar({ result, loading, error, onClose }: SecuritySidebarProps) {
  const [copied, setCopied] = useState(false)
  const scan = result?.scan
  const findings = result?.findings ?? []

  const errors = findings.filter((f) => f.severity === "ERROR")
  const warnings = findings.filter((f) => f.severity === "WARNING")
  const infos = findings.filter((f) => f.severity === "INFO")

  const isRunning = loading || scan?.status === "RUNNING"
  const isFailed = scan?.status === "FAILED"
  const totalFindings = findings.length

  function handleCopyAll() {
    if (findings.length === 0) return
    const lines = findings.map((f) =>
      `[${f.severity}] ${f.file_path}:${f.start_line} — ${f.message} (${f.rule_id})`
    )
    navigator.clipboard.writeText(lines.join("\n")).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#0b0b0c]">
      {/* Header */}
      <div className="shrink-0 border-b border-white/[0.08] bg-[#0d0d0f] px-3 py-3 shadow-[inset_0_-1px_0_rgba(255,255,255,0.02)]">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {isRunning ? (
              <Loader2 className="size-4 animate-spin text-primary" />
            ) : isFailed ? (
              <AlertCircle className="size-4 text-red-400" />
            ) : (
              <ShieldCheck className="size-4 text-white/55" />
            )}
            <span className="text-[13px] font-semibold text-white/80">Security Scan</span>
          </div>
          <div className="flex items-center gap-1">
            {totalFindings > 0 && (
              <button
                onClick={handleCopyAll}
                aria-label="Copy all findings"
                title="Copy all findings"
                className="flex items-center gap-1 rounded-md border border-transparent px-1.5 py-1 text-[10px] text-white/40 transition-colors hover:border-white/[0.06] hover:bg-white/[0.06] hover:text-white/70"
              >
                {copied ? <Check className="size-3 text-emerald-400" /> : <Copy className="size-3" />}
                <span>{copied ? "Copied" : "Copy all"}</span>
              </button>
            )}
            <button
              onClick={onClose}
              aria-label="Close security panel"
              className="rounded-md border border-transparent p-1 text-white/45 transition-colors hover:border-white/[0.06] hover:bg-white/[0.06] hover:text-white/75"
            >
              <X className="size-3.5" />
            </button>
          </div>
        </div>

        {scan && (
          <div className="mt-2 flex items-center gap-2">
            <span
              className={cn(
                "rounded border px-1.5 py-0.5 text-[10px] font-medium",
                scan.status === "COMPLETED" && totalFindings === 0 && "border-emerald-500/20 bg-emerald-500/10 text-emerald-400",
                scan.status === "COMPLETED" && totalFindings > 0 && "border-yellow-500/20 bg-yellow-500/10 text-yellow-400",
                scan.status === "RUNNING" && "border-blue-500/20 bg-blue-500/10 text-blue-400",
                scan.status === "FAILED" && "border-red-500/20 bg-red-500/10 text-red-400",
                scan.status === "CANCELLED" && "border-white/10 bg-white/5 text-white/40"
              )}
            >
              {scan.status}
            </span>
            {scan.status === "COMPLETED" && (
              <span className="text-[10px] text-white/40">
                {totalFindings === 0 ? "No issues found" : `${totalFindings} issue${totalFindings !== 1 ? "s" : ""} found`}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto overscroll-contain scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
        {isRunning && !result && (
          <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
            <Loader2 className="size-6 animate-spin text-white/30" />
            <p className="text-[12px] text-white/45">Scanning for security issues…</p>
          </div>
        )}

        {error && (
          <div className="m-3 rounded-lg border border-red-500/20 bg-red-500/10 p-3">
            <p className="text-[11px] text-red-400">{error}</p>
          </div>
        )}

        {isFailed && scan?.error && (
          <div className="m-3 rounded-lg border border-red-500/20 bg-red-500/10 p-3">
            <p className="text-[11px] text-red-400">{scan.error}</p>
          </div>
        )}

        {scan?.status === "COMPLETED" && totalFindings === 0 && (
          <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
            <ShieldCheck className="size-8 text-emerald-400" />
            <p className="text-[12px] font-medium text-emerald-400">No security issues found</p>
            <p className="text-[11px] text-white/35">Scan completed with 0 findings</p>
          </div>
        )}

        {totalFindings > 0 && (
          <>
            <SeveritySection severity="ERROR" findings={errors} />
            <SeveritySection severity="WARNING" findings={warnings} />
            <SeveritySection severity="INFO" findings={infos} />
          </>
        )}
      </div>
    </div>
  )
}
