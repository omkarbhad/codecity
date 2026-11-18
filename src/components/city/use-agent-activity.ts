"use client"

import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { getAgentActivity, type AgentActivity, type AgentSession } from "@/lib/tauri"
import { useCityStore } from "./use-city-store"

/** How each agent is named and coloured, in the sidebar and in the city. */
export const AGENTS: Record<AgentSession["agent"], { name: string; color: string }> = {
  claude: { name: "Claude", color: "#e0875f" },
  codex: { name: "Codex", color: "#4fc3a1" },
}

/** How often the session logs are read again while agent mode is on. */
const POLL_MS = 2500

/**
 * Agent activity for the open project, re-read every few seconds while agent
 * mode is on. `error` is set when the project is not a local folder (agents
 * only work in those) or the desktop backend is not there.
 */
export function useAgentActivity() {
  const repoUrl = useCityStore((s) => s.repoUrl)
  const agentMode = useCityStore((s) => s.agentMode)
  const { data, error, isLoading } = useQuery<AgentActivity, Error>({
    queryKey: ["agent-activity", repoUrl],
    queryFn: () => getAgentActivity(repoUrl),
    enabled: agentMode && !!repoUrl,
    refetchInterval: POLL_MS,
    staleTime: 0,
    retry: false,
  })

  return useMemo(() => {
    const sessions = agentMode ? data?.sessions ?? [] : []
    const uncommitted = new Set(agentMode ? data?.uncommitted ?? [] : [])
    return { sessions, uncommitted, error: agentMode ? error : null, isLoading: agentMode && isLoading }
  }, [agentMode, data, error, isLoading])
}

/** "now", "5m ago", "3h ago" from a number of seconds. */
export function idleLabel(seconds: number): string {
  if (seconds < 90) return "now"
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  return `${Math.round(minutes / 60)}h ago`
}
