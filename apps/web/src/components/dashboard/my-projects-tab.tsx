"use client"

import { useState } from "react"
import Link from "next/link"
import {
  Plus,
  Globe,
  Lock,
  Trash2,
  Building2,
  FileCode,
  ArrowUpRight,
  Code2,
  Clock,
  GitFork,
} from "lucide-react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { getProjectList, deleteCachedProject } from "@/lib/client-cache"
import { Button } from "@codecity/ui/components/button"

interface Project {
  id: string
  name: string
  repoUrl: string
  visibility: "PUBLIC" | "PRIVATE"
  status: string
  fileCount?: number
  lineCount?: number
  createdAt: string
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "COMPLETED":
      return (
        <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 font-medium rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Completed
        </span>
      )
    case "FAILED":
      return (
        <span className="text-[10px] px-2 py-0.5 font-medium rounded bg-red-500/10 text-red-400 border border-red-500/30">
          Failed
        </span>
      )
    case "PROCESSING":
      return (
        <span className="text-[10px] px-2 py-0.5 font-medium rounded bg-amber-500/10 text-amber-400 border border-amber-500/30">
          Processing
        </span>
      )
    default:
      return (
        <span className="text-[10px] px-2 py-0.5 font-medium rounded bg-blue-500/10 text-blue-400 border border-blue-500/30">
          Pending
        </span>
      )
  }
}

export function MyProjectsTab({ onCreateCity }: { onCreateCity?: () => void }) {
  const queryClient = useQueryClient()
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const { data: projects = [], isLoading } = useQuery<Project[]>({
    queryKey: ["projects"],
    queryFn: () => getProjectList(),
  })

  async function handleDelete(e: React.MouseEvent, id: string) {
    e.preventDefault()
    e.stopPropagation()

    if (deletingId === id) {
      try {
        await fetch(`/api/projects/${id}`, { method: "DELETE" }).catch(() => {})
        deleteCachedProject(id)
        queryClient.setQueryData<Project[]>(["projects"], (old) =>
          old ? old.filter((p) => p.id !== id) : []
        )
      } finally {
        setDeletingId(null)
      }
    } else {
      setDeletingId(id)
      setTimeout(() => setDeletingId((prev) => (prev === id ? null : prev)), 3000)
    }
  }

  async function handleToggleVisibility(e: React.MouseEvent, project: Project) {
    e.preventDefault()
    e.stopPropagation()
    const newVisibility = project.visibility === "PUBLIC" ? "PRIVATE" : "PUBLIC"
    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visibility: newVisibility }),
      })
      if (!res.ok) return
      queryClient.setQueryData<Project[]>(["projects"], (old) =>
        old
          ? old.map((p) =>
              p.id === project.id ? { ...p, visibility: newVisibility } : p
            )
          : []
      )
    } catch (err) {
      console.error("Network error updating visibility:", err)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-5">
        <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-4">
          <div className="h-3 w-20 rounded-lg bg-white/[0.04] animate-pulse mb-2" />
          <div className="h-4 w-36 rounded-lg bg-white/[0.04] animate-pulse" />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-4">
              <div className="h-4 w-3/4 rounded-lg bg-white/[0.04] animate-pulse mb-3" />
              <div className="h-3 w-full rounded-lg bg-white/[0.04] animate-pulse mb-2" />
              <div className="flex gap-3 mt-2">
                <div className="h-3 w-16 rounded-lg bg-white/[0.04] animate-pulse" />
                <div className="h-3 w-20 rounded-lg bg-white/[0.04] animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Header row */}
      <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] flex flex-col gap-4 p-4 sm:p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.16em] text-[#71717a] font-medium">
            My Cities
          </p>
          <p className="mt-1 text-sm text-[#a1a1aa]">
            {projects.length} project{projects.length !== 1 ? "s" : ""} analyzed
          </p>
        </div>
        <Button
          onClick={() => onCreateCity?.()}
          size="sm"
          className="gap-1.5 text-sm font-medium rounded-lg bg-primary hover:bg-primary/90 text-white transition-colors duration-200"
        >
          <Plus className="h-3.5 w-3.5" />
          New City
        </Button>
      </div>

      {projects.length === 0 ? (
        <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] min-h-[400px] flex items-center justify-center">
          <div className="flex flex-col items-center py-16">
            <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-primary/10">
              <Building2 className="h-7 w-7 text-primary" />
            </div>
            <p className="mt-4 text-base font-semibold text-[#fafafa]">No cities built yet</p>
            <p className="mt-1.5 text-sm text-[#a1a1aa] max-w-sm text-center leading-relaxed">
              Analyze a GitHub repository to transform its codebase into an interactive 3D city visualization.
            </p>
            <Button
              onClick={() => onCreateCity?.()}
              className="mt-6 gap-1.5 text-sm font-medium rounded-lg bg-primary hover:bg-primary/90 text-white transition-colors duration-200"
            >
              <Plus className="h-3.5 w-3.5" />
              Create Your First City
            </Button>
          </div>
        </div>
      ) : (
        <div className="mx-auto grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {projects.map((project) => (
            <Link
              key={project.id}
              href={
                project.status === "PROCESSING"
                  ? `/analyze/${project.id}`
                  : `/project/${project.id}`
              }
            >
              <div className="group relative h-full rounded-xl bg-white/[0.02] border border-white/[0.06] p-4 sm:p-5 hover:border-primary/25 hover:translate-y-[-2px] transition-all duration-300">
                {/* Header: status + arrow */}
                <div className="flex items-center justify-between mb-3">
                  <StatusBadge status={project.status} />
                  <ArrowUpRight className="h-3.5 w-3.5 text-[#52525b] transition-colors group-hover:text-primary" />
                </div>

                {/* Project name + visibility */}
                <div className="flex items-center gap-2 mb-1">
                  {project.visibility === "PUBLIC" ? (
                    <Globe className="h-3.5 w-3.5 text-[#52525b] shrink-0" />
                  ) : (
                    <Lock className="h-3.5 w-3.5 text-[#52525b] shrink-0" />
                  )}
                  <h3 className="text-sm font-semibold text-[#fafafa] truncate">
                    {project.name}
                  </h3>
                </div>

                <p className="text-[11px] text-[#52525b] truncate mb-3">
                  {project.repoUrl}
                </p>

                {/* Stats */}
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex items-center gap-1.5">
                    <FileCode className="h-3 w-3 text-[#52525b]" />
                    <span className="text-[11px] text-[#a1a1aa]">
                      {project.fileCount ?? 0} files
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Code2 className="h-3 w-3 text-[#52525b]" />
                    <span className="text-[11px] text-[#a1a1aa]">
                      {(project.lineCount ?? 0).toLocaleString()} lines
                    </span>
                  </div>
                  <div className="hidden items-center gap-1.5 md:flex">
                    <GitFork className="h-3 w-3 text-[#52525b]" />
                    <span className="text-[11px] text-[#a1a1aa]">
                      {project.visibility === "PUBLIC" ? "Shared" : "Private"}
                    </span>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between border-t border-white/[0.06] pt-3">
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3 w-3 text-[#52525b]" />
                    <span className="text-[10px] text-[#52525b]">
                      {new Date(project.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-0.5">
                    <button
                      onClick={(e) => handleToggleVisibility(e, project)}
                      className="rounded-lg p-1.5 text-[#52525b] transition-all duration-200 hover:bg-white/[0.04] hover:text-[#fafafa] opacity-50 sm:opacity-0 group-hover:opacity-100"
                      title={project.visibility === "PUBLIC" ? "Make private" : "Make public"}
                    >
                      {project.visibility === "PUBLIC" ? <Lock className="h-3 w-3" /> : <Globe className="h-3 w-3" />}
                    </button>
                    <button
                      onClick={(e) => handleDelete(e, project.id)}
                      className={`rounded-lg p-1.5 transition-all duration-200 opacity-50 sm:opacity-0 group-hover:opacity-100 ${
                        deletingId === project.id
                          ? "bg-red-500/10 text-red-400"
                          : "text-[#52525b] hover:bg-white/[0.04] hover:text-red-400"
                      }`}
                      title={deletingId === project.id ? "Click again to confirm delete" : "Delete project"}
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
