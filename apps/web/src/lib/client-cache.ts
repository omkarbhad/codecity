"use client"

import type { CitySnapshot } from "./types/city"

const STORAGE_PREFIX = "codecity:"
const MAX_PROJECTS = 20

export interface CachedProject {
  id: string
  name: string
  repoUrl: string
  visibility: "PUBLIC" | "PRIVATE"
  status: "COMPLETED" | "FAILED"
  fileCount: number
  lineCount: number
  createdAt: string
  snapshot?: CitySnapshot
}

function getStorage(): Storage | null {
  if (typeof window === "undefined") return null
  return window.localStorage
}

export function cacheProject(project: CachedProject): void {
  const storage = getStorage()
  if (!storage) return

  // Store project metadata
  const projects = getProjectList()
  const existing = projects.findIndex((p) => p.id === project.id)
  if (existing >= 0) {
    projects[existing] = project
  } else {
    projects.unshift(project)
  }

  // Keep only the latest N projects
  const trimmed = projects.slice(0, MAX_PROJECTS)
  storage.setItem(`${STORAGE_PREFIX}projects`, JSON.stringify(trimmed.map(({ snapshot: _s, ...p }) => p)))

  // Store snapshot separately (can be large)
  if (project.snapshot) {
    storage.setItem(`${STORAGE_PREFIX}snapshot:${project.id}`, JSON.stringify(project.snapshot))
  }
}

export function getProjectList(): CachedProject[] {
  const storage = getStorage()
  if (!storage) return []

  try {
    const raw = storage.getItem(`${STORAGE_PREFIX}projects`)
    return raw ? (JSON.parse(raw) as CachedProject[]) : []
  } catch {
    return []
  }
}

export function getCachedProject(id: string): CachedProject | null {
  const projects = getProjectList()
  return projects.find((p) => p.id === id) ?? null
}

export function getCachedSnapshot(id: string): CitySnapshot | null {
  const storage = getStorage()
  if (!storage) return null

  try {
    const raw = storage.getItem(`${STORAGE_PREFIX}snapshot:${id}`)
    return raw ? (JSON.parse(raw) as CitySnapshot) : null
  } catch {
    return null
  }
}

export function deleteCachedProject(id: string): void {
  const storage = getStorage()
  if (!storage) return

  const projects = getProjectList().filter((p) => p.id !== id)
  storage.setItem(`${STORAGE_PREFIX}projects`, JSON.stringify(projects))
  storage.removeItem(`${STORAGE_PREFIX}snapshot:${id}`)
}
