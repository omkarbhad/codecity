"use client"

import { useMemo, useState, useEffect, useCallback } from "react"
import { ChevronRight, ChevronDown, Folder, FolderOpen, Maximize2, Minimize2, Eye, EyeOff } from "lucide-react"
import type { CitySnapshot } from "@/lib/types/city"
import { useCityStore } from "./use-city-store"

interface FileTreeProps {
  snapshot: CitySnapshot
}

interface TreeNode {
  name: string
  path: string
  isFile: boolean
  children: TreeNode[]
  districtColor?: string
  fileCount: number
}

function buildTree(snapshot: CitySnapshot): TreeNode {
  const root: TreeNode = { name: "root", path: "", isFile: false, children: [], fileCount: 0 }

  const districtColorMap = new Map<string, string>()
  for (const file of snapshot.files) {
    const district = snapshot.districts.find((d) => d.name === file.district)
    if (district) {
      districtColorMap.set(file.path, district.color)
    }
  }

  for (const file of snapshot.files) {
    const parts = file.path.split("/")
    let current = root

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]
      const isLast = i === parts.length - 1
      const currentPath = parts.slice(0, i + 1).join("/")

      let child = current.children.find((c) => c.name === part)
      if (!child) {
        child = {
          name: part,
          path: currentPath,
          isFile: isLast,
          children: [],
          districtColor: isLast ? districtColorMap.get(file.path) : undefined,
          fileCount: 0,
        }
        current.children.push(child)
      }
      current = child
    }
  }

  function sortAndCount(node: TreeNode): number {
    if (node.isFile) {
      node.fileCount = 1
      return 1
    }
    node.children.sort((a, b) => {
      if (a.isFile !== b.isFile) return a.isFile ? 1 : -1
      return a.name.localeCompare(b.name)
    })
    let total = 0
    for (const child of node.children) {
      total += sortAndCount(child)
    }
    node.fileCount = total
    return total
  }
  sortAndCount(root)

  return root
}

function getAllFolderPaths(node: TreeNode): string[] {
  const paths: string[] = []
  if (!node.isFile && node.path) paths.push(node.path)
  for (const child of node.children) {
    paths.push(...getAllFolderPaths(child))
  }
  return paths
}

function getAncestorPaths(filePath: string): Set<string> {
  const parts = filePath.split("/")
  const paths = new Set<string>()
  for (let i = 1; i < parts.length; i++) {
    paths.add(parts.slice(0, i).join("/"))
  }
  return paths
}

function TreeNodeItem({
  node,
  depth,
  expandedFolders,
  toggleFolder,
  searchQuery,
}: {
  node: TreeNode
  depth: number
  expandedFolders: Set<string>
  toggleFolder: (path: string) => void
  searchQuery: string
}) {
  const selectedFile = useCityStore((s) => s.selectedFile)
  const selectFile = useCityStore((s) => s.selectFile)
  const hiddenPaths = useCityStore((s) => s.hiddenPaths)
  const togglePathVisibility = useCityStore((s) => s.togglePathVisibility)
  const isSelected = selectedFile === node.path
  const isExpanded = expandedFolders.has(node.path)
  const isHidden = hiddenPaths.has(node.path)

  // Highlight search matches
  const isMatch = searchQuery && node.name.toLowerCase().includes(searchQuery.toLowerCase())

  if (node.isFile) {
    return (
      <div
        className={`
          flex items-center gap-1 group py-0.5 px-1.5 rounded-md
          font-sans text-[11px] transition-colors duration-100
          ${isSelected
            ? "bg-white/10 text-white"
            : isHidden
              ? "text-white/20"
              : isMatch
                ? "text-primary/80 bg-primary/[0.06]"
                : "text-white/50 hover:text-white/80 hover:bg-white/[0.04]"
          }
        `}
        style={{ paddingLeft: `${depth * 12 + 6}px` }}
      >
        <button
          onClick={() => selectFile(node.path)}
          className="flex items-center gap-1 flex-1 min-w-0 cursor-pointer"
        >
          {node.districtColor ? (
            <span
              className={`inline-block w-1.5 h-1.5 rounded-full shrink-0 ${isHidden ? "opacity-30" : ""}`}
              style={{ backgroundColor: node.districtColor }}
            />
          ) : (
            <span className="inline-block w-1.5 h-1.5 rounded-full shrink-0 bg-white/20" />
          )}
          <span className={`truncate ${isHidden ? "line-through opacity-50" : ""}`}>{node.name}</span>
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation()
            togglePathVisibility(node.path)
          }}
          className={`shrink-0 p-0.5 rounded hover:bg-white/10 transition-all cursor-pointer
            ${isHidden
              ? "text-white/30 opacity-100"
              : "text-white/15 hover:text-white/50 opacity-0 group-hover:opacity-100"
            }`}
          title={isHidden ? "Show file" : "Hide file"}
        >
          {isHidden ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
        </button>
      </div>
    )
  }

  return (
    <div>
      <div
        className={`flex items-center gap-0.5 group py-0.5 px-1.5 rounded-md
          font-sans text-[11px] hover:bg-white/[0.04]
          transition-colors duration-100
          ${isHidden
            ? "text-white/25"
            : isMatch
              ? "text-primary/80"
              : "text-white/60 hover:text-white/80"
          }`}
        style={{ paddingLeft: `${depth * 12 + 6}px` }}
      >
        <button
          onClick={() => toggleFolder(node.path)}
          className="flex items-center gap-0.5 flex-1 min-w-0 cursor-pointer"
        >
          {isExpanded ? (
            <FolderOpen className={`w-3.5 h-3.5 shrink-0 ${isHidden ? "text-amber-400/20" : "text-amber-400/60"}`} />
          ) : (
            <Folder className={`w-3.5 h-3.5 shrink-0 ${isHidden ? "text-amber-400/15" : "text-amber-400/40"}`} />
          )}
          <span className={`truncate flex-1 ${isHidden ? "line-through opacity-50" : ""}`}>{node.name}</span>
          <span className="text-white/20 text-[10px] shrink-0 ml-1">
            {node.fileCount}
          </span>
          {isExpanded ? (
            <ChevronDown className="w-3 h-3 shrink-0 text-white/20" />
          ) : (
            <ChevronRight className="w-3 h-3 shrink-0 text-white/20" />
          )}
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation()
            togglePathVisibility(node.path)
          }}
          className={`shrink-0 p-0.5 rounded hover:bg-white/10 transition-all cursor-pointer
            ${isHidden
              ? "text-white/30 opacity-100"
              : "text-white/15 hover:text-white/50 opacity-0 group-hover:opacity-100"
            }`}
          title={isHidden ? "Show folder" : "Hide folder"}
        >
          {isHidden ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
        </button>
      </div>
      {isExpanded &&
        node.children.map((child) => (
          <TreeNodeItem
            key={child.path}
            node={child}
            depth={depth + 1}
            expandedFolders={expandedFolders}
            toggleFolder={toggleFolder}
            searchQuery={searchQuery}
          />
        ))}
    </div>
  )
}

export function FileTree({ snapshot }: FileTreeProps) {
  const selectedFile = useCityStore((s) => s.selectedFile)
  const searchQuery = useCityStore((s) => s.searchQuery)
  const hiddenPaths = useCityStore((s) => s.hiddenPaths)
  const showAllPaths = useCityStore((s) => s.showAllPaths)
  const tree = useMemo(() => buildTree(snapshot), [snapshot])
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set<string>())

  const allFolderPaths = useMemo(() => getAllFolderPaths(tree), [tree])

  // Auto-expand parent folders when a file is selected
  useEffect(() => {
    if (selectedFile) {
      const ancestors = getAncestorPaths(selectedFile)
      setExpandedFolders((prev) => {
        const next = new Set(prev)
        let changed = false
        ancestors.forEach((p) => {
          if (!next.has(p)) {
            next.add(p)
            changed = true
          }
        })
        return changed ? next : prev
      })
    }
  }, [selectedFile])

  // Auto-expand all when search is active
  useEffect(() => {
    if (searchQuery) {
      setExpandedFolders(new Set(allFolderPaths))
    }
  }, [searchQuery, allFolderPaths])

  const toggleFolder = useCallback((path: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev)
      if (next.has(path)) {
        next.delete(path)
      } else {
        next.add(path)
      }
      return next
    })
  }, [])

  const expandAll = useCallback(() => {
    setExpandedFolders(new Set(allFolderPaths))
  }, [allFolderPaths])

  const collapseAll = useCallback(() => {
    setExpandedFolders(new Set())
  }, [])

  return (
    <div className="bg-white/[0.02] rounded-lg border border-white/[0.06] overflow-hidden">
      <div className="px-3 py-1.5 border-b border-white/[0.06] flex items-center justify-between">
        <span className="font-sans text-[10px] font-medium text-white/40 uppercase tracking-wider">
          Files
          <span className="ml-1.5 text-white/20">{snapshot.files.length}</span>
        </span>
        <div className="flex items-center gap-1">
          {hiddenPaths.size > 0 && (
            <button
              onClick={showAllPaths}
              className="text-[9px] font-sans text-amber-400/50 hover:text-amber-400 transition-colors px-1"
              title="Show All Hidden"
            >
              Show all
            </button>
          )}
          <button
            onClick={expandAll}
            className="p-0.5 rounded hover:bg-white/10 text-white/25 hover:text-white/50 transition-colors"
            title="Expand All"
          >
            <Maximize2 className="w-3 h-3" />
          </button>
          <button
            onClick={collapseAll}
            className="p-0.5 rounded hover:bg-white/10 text-white/25 hover:text-white/50 transition-colors"
            title="Collapse All"
          >
            <Minimize2 className="w-3 h-3" />
          </button>
        </div>
      </div>
      <div className="overflow-y-auto scroll-thin max-h-[50vh] py-0.5">
        {tree.children.map((child) => (
          <TreeNodeItem
            key={child.path}
            node={child}
            depth={0}
            expandedFolders={expandedFolders}
            toggleFolder={toggleFolder}
            searchQuery={searchQuery}
          />
        ))}
      </div>
      {hiddenPaths.size > 0 && (
        <div className="px-3 py-1 border-t border-white/[0.06]">
          <span className="font-sans text-[9px] text-amber-400/40">
            {hiddenPaths.size} hidden
          </span>
        </div>
      )}
    </div>
  )
}
