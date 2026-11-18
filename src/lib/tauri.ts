/**
 * Desktop backend client.
 *
 * The frontend speaks JSON-RPC 2.0 to Rust through a single Tauri bridge
 * command (`rpc`). Tauri only transports the request; Rust owns the method
 * router and analysis contract.
 */
import { recolorSnapshot } from "@/lib/district-colors"
import { invoke } from "@tauri-apps/api/core"
import type { CitySnapshot, LayoutMode } from "@/lib/types/city"

export function isTauri(): boolean {
  if (typeof window === "undefined") return false
  return !!(window as any).__TAURI_INTERNALS__
}

type JsonRpcId = number

interface JsonRpcResponse<T> {
  jsonrpc: "2.0"
  result?: T
  error?: {
    code: number
    message: string
  }
  id: JsonRpcId
}

let rpcId = 0

class DesktopBackendUnavailableError extends Error {
  constructor() {
    super("Desktop backend unavailable. Open this screen in the Tauri app to use local analysis.")
    this.name = "DesktopBackendUnavailableError"
  }
}

function emptyWhenBackendUnavailable<T>(fallback: T) {
  return (error: unknown) => {
    if (error instanceof DesktopBackendUnavailableError) return fallback
    throw error
  }
}

async function rpc<T>(method: string, params: Record<string, unknown> = {}): Promise<T> {
  if (!isTauri()) {
    throw new DesktopBackendUnavailableError()
  }

  const id = ++rpcId
  const response = await invoke<JsonRpcResponse<T>>("rpc", {
    request: {
      jsonrpc: "2.0",
      method,
      params,
      id,
    },
  })

  if (response.error) {
    throw new Error(`${response.error.message} (${response.error.code})`)
  }

  return response.result as T
}

// ── Types ──

export interface AnalyzeResult {
  success: boolean
  project_id: string | null
  snapshot: Record<string, unknown> | null
  error: string | null
}

export interface ProjectRecord {
  id: string
  name: string
  repo_url: string
  visibility: string
  status: string
  file_count: number
  line_count: number
  progress: number
  progress_stage: string
  progress_message: string
  files_discovered: number
  files_parsed: number
  user_id: string
  error: string | null
  created_at: string
  updated_at: string
}

export interface DeviceCodeResponse {
  device_code: string
  user_code: string
  verification_uri: string
  expires_in: number
  interval: number
}

/** Device-flow poll result. The token itself stays in the backend (OS keychain). */
export interface LoginPollResult {
  connected: boolean
  login?: string
  error?: string | null
  error_description?: string | null
}

export interface GithubStatus {
  connected: boolean
  login: string | null
}

export interface GitHubUser {
  id: number
  login: string
  name: string | null
  avatar_url: string | null
}

export interface GitHubRepoSummary {
  id: number
  full_name: string
  html_url: string
  private: boolean
  owner_login: string
  owner_type: string
  updated_at: string
  default_branch: string
}

export interface CommitSummary {
  sha: string
  message: string
  author: string
  date: string
  files: string[]
}

export interface ParsedFileRecord {
  path: string
  lines: number
  sizeBytes: number
  extension: string
  language: string
  functions: unknown[]
  types: unknown[]
  classes: unknown[]
  symbols: unknown[]
  imports: string[]
  externalImports: string[]
  decorators: string[]
  complexity: number
  frontendFrameworks: string[]
  isReactComponent: boolean
  hasUnusedExports: boolean
  fileType: string
}

// ── Analysis ──

export async function analyze(
  input: string,
  options?: { githubToken?: string }
): Promise<{ projectId: string; snapshot?: Record<string, unknown> }> {
  const result = await rpc<AnalyzeResult>("analysis.analyze", {
    input,
    visibility: "PRIVATE",
    githubToken: options?.githubToken ?? null,
  })

  if (!result.success) {
    throw new Error(result.error ?? "Analysis failed")
  }

  return {
    projectId: result.project_id!,
    snapshot: result.snapshot ?? undefined,
  }
}

export async function enqueueAnalysis(
  input: string,
  options?: { githubToken?: string }
): Promise<{ projectId: string }> {
  const result = await rpc<AnalyzeResult>("analysis.enqueue", {
    input,
    visibility: "PRIVATE",
    githubToken: options?.githubToken ?? null,
  })

  if (!result.success) {
    throw new Error(result.error ?? "Failed to queue analysis")
  }

  return {
    projectId: result.project_id!,
  }
}

export async function refreshAnalysis(projectId: string): Promise<{ projectId: string }> {
  const result = await rpc<AnalyzeResult>("analysis.refresh", {
    projectId,
  })

  if (!result.success) {
    throw new Error(result.error ?? "Failed to queue refresh")
  }

  return {
    projectId: result.project_id!,
  }
}

export async function recomputeSnapshot(
  snapshot: CitySnapshot,
  hiddenPaths: string[],
  hiddenExtensions: string[],
  layoutMode: LayoutMode
): Promise<CitySnapshot> {
  return rpc<CitySnapshot>("analysis.recomputeSnapshot", {
    snapshot,
    hiddenPaths,
    hiddenExtensions,
    layoutMode,
  })
}

export async function getSourceFile(repoUrl: string, filePath: string): Promise<string> {
  return rpc<string>("analysis.getSourceFile", { repoUrl, filePath })
}

// ── File editing (local projects only; GitHub downloads are read-only) ──

export interface FileCapabilities {
  editable: boolean
  reason: string | null
}

// ── Agent mode ──

/** A file a coding agent touched in one of its sessions. */
export interface AgentFile {
  /** Project-relative path. */
  path: string
  /** True once the agent has edited the file; false while it has only read it. */
  edited: boolean
  edits: number
  /** ISO time of the latest touch. */
  at: string
}

export interface AgentSession {
  agent: "claude" | "codex"
  id: string
  /** The session's log changed in the last two minutes. */
  active: boolean
  idleSeconds: number
  currentFile: string | null
  /** Newest first. */
  files: AgentFile[]
}

export interface AgentActivity {
  sessions: AgentSession[]
  /** Project-relative paths with uncommitted changes. */
  uncommitted: string[]
}

/** What coding agents have been doing in a local project (read from their session logs and git). */
export async function getAgentActivity(repoUrl: string): Promise<AgentActivity> {
  return rpc<AgentActivity>("agents.activity", { repoUrl })
}

export async function fileCapabilities(repoUrl: string): Promise<FileCapabilities> {
  return rpc<FileCapabilities>("files.capabilities", { repoUrl }).catch(
    emptyWhenBackendUnavailable({ editable: false, reason: "Editing needs the desktop app." })
  )
}

export async function writeFile(repoUrl: string, filePath: string, content: string): Promise<void> {
  await rpc<null>("files.write", { repoUrl, filePath, content })
}

export async function createFile(repoUrl: string, filePath: string, content = ""): Promise<void> {
  await rpc<null>("files.create", { repoUrl, filePath, content })
}

/** Moves the file to the Trash. */
export async function deleteFile(repoUrl: string, filePath: string): Promise<void> {
  await rpc<null>("files.delete", { repoUrl, filePath })
}

export async function renameFile(repoUrl: string, fromPath: string, toPath: string): Promise<void> {
  await rpc<null>("files.rename", { repoUrl, fromPath, toPath })
}

// ── Projects ──

export async function getProjects(): Promise<ProjectRecord[]> {
  return rpc<ProjectRecord[]>("projects.list").catch(emptyWhenBackendUnavailable([]))
}

export async function getProject(projectId: string): Promise<ProjectRecord | null> {
  return rpc<ProjectRecord | null>("projects.get", { id: projectId }).catch(emptyWhenBackendUnavailable(null))
}

export async function getProjectSnapshot(projectId: string): Promise<Record<string, unknown> | null> {
  return rpc<Record<string, unknown> | null>("projects.getSnapshot", { projectId })
    .then(recolorSnapshot)
    .catch(emptyWhenBackendUnavailable(null))
}

export async function getProjectParsedFiles(projectId: string): Promise<ParsedFileRecord[] | null> {
  return rpc<ParsedFileRecord[] | null>("projects.getParsedFiles", { projectId }).catch(emptyWhenBackendUnavailable(null))
}

export async function deleteProject(id: string): Promise<void> {
  await rpc<null>("projects.delete", { id })
}

export async function cancelProject(id: string): Promise<void> {
  await rpc<null>("projects.cancel", { id })
}

export async function getAllPublicProjects(): Promise<ProjectRecord[]> {
  return rpc<ProjectRecord[]>("projects.listPublic").catch(emptyWhenBackendUnavailable([]))
}

// ── Git ──

export async function getCommits(repoUrl: string, page: number): Promise<CommitSummary[]> {
  return rpc<CommitSummary[]>("git.getCommits", { repoUrl, page })
}

export async function getCommitFiles(repoUrl: string, sha: string): Promise<string[]> {
  return rpc<string[]>("git.getCommitFiles", { repoUrl, sha })
}

// ── GitHub Auth ──

export async function githubLoginStart(): Promise<DeviceCodeResponse> {
  return rpc<DeviceCodeResponse>("github.loginStart")
}

export async function githubLoginPoll(deviceCode: string): Promise<LoginPollResult> {
  return rpc<LoginPollResult>("github.loginPoll", { deviceCode })
}

/** The signed-in GitHub user, or null when GitHub isn't connected. */
export async function githubGetUser(): Promise<GitHubUser | null> {
  return rpc<GitHubUser | null>("github.getUser").catch(emptyWhenBackendUnavailable(null))
}

export async function githubImportCliSession(): Promise<GitHubUser> {
  return rpc<GitHubUser>("github.importCliSession")
}

export async function githubStatus(): Promise<GithubStatus> {
  return rpc<GithubStatus>("github.status").catch(emptyWhenBackendUnavailable({ connected: false, login: null }))
}

export async function listGithubRepos(
  visibility: "all" | "private" | "public" = "all",
  page?: number
): Promise<GitHubRepoSummary[]> {
  if (page) {
    return rpc<GitHubRepoSummary[]>("github.listRepos", { visibility, page }).catch(emptyWhenBackendUnavailable([]))
  }

  const repos: GitHubRepoSummary[] = []
  for (let nextPage = 1; nextPage <= 10; nextPage += 1) {
    const batch = await rpc<GitHubRepoSummary[]>("github.listRepos", {
      visibility,
      page: nextPage,
    }).catch(emptyWhenBackendUnavailable([]))

    repos.push(...batch)
    if (batch.length < 100) break
  }

  return repos
}

export async function listTrendingGithubRepos(): Promise<GitHubRepoSummary[]> {
  return rpc<GitHubRepoSummary[]>("github.trendingRepos").catch(emptyWhenBackendUnavailable([]))
}


export async function logoutGithub(): Promise<void> {
  await rpc<null>("github.logout")
}

export async function getCurrentUser(): Promise<string | null> {
  return rpc<string | null>("user.current").catch(emptyWhenBackendUnavailable(null))
}

// ── Security ──

export type Severity = "ERROR" | "WARNING" | "INFO"

export interface SecurityFinding {
  id: string
  scan_id: string
  project_id: string
  severity: Severity
  rule_id: string
  file_path: string
  start_line: number
  end_line: number
  message: string
  snippet: string | null
}

export interface SecurityScanRecord {
  id: string
  project_id: string
  status: "PENDING" | "RUNNING" | "COMPLETED" | "FAILED" | "CANCELLED"
  ruleset: string
  total_findings: number
  error: string | null
  started_at: string
  finished_at: string | null
}

export interface SecurityScanResult {
  scan: SecurityScanRecord
  findings: SecurityFinding[]
}

export async function startSecurityScan(
  projectId: string,
  projectRoot: string
): Promise<{ scanId: string }> {
  return rpc<{ scanId: string }>("security.scan", { projectId, projectRoot })
}

export async function getSecurityScan(projectId: string): Promise<SecurityScanResult | null> {
  return rpc<SecurityScanResult | null>("security.get", { projectId }).catch(
    emptyWhenBackendUnavailable(null)
  )
}

export async function cancelSecurityScan(scanId: string): Promise<void> {
  await rpc<null>("security.cancel", { scanId })
}
