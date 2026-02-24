"use client"

import { useMemo, useState, useEffect, useCallback } from "react"
import { ChevronRight, ChevronDown, FileCode } from "lucide-react"
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
}

function buildTree(snapshot: CitySnapshot): TreeNode {
  const root: TreeNode = { name: "root", path: "", isFile: false, children: [] }

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
        }
        current.children.push(child)
      }
      current = child
    }
  }

  // Sort: folders first, then alphabetically
  function sortTree(node: TreeNode) {
    node.children.sort((a, b) => {
      if (a.isFile !== b.isFile) return a.isFile ? 1 : -1
      return a.name.localeCompare(b.name)
    })
    node.children.forEach(sortTree)
  }
  sortTree(root)

  return root
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
}: {
  node: TreeNode
  depth: number
  expandedFolders: Set<string>
  toggleFolder: (path: string) => void
}) {
  const { selectedFile, selectFile } = useCityStore()
  const isSelected = selectedFile === node.path
  const isExpanded = expandedFolders.has(node.path)

  if (node.isFile) {
    return (
      <button
        onClick={() => selectFile(node.path)}
        className={`
          flex items-center gap-1.5 w-full text-left py-1 px-2 rounded-sm
          font-mono text-xs transition-colors duration-100 cursor-pointer
          ${
            isSelected
              ? "bg-white/10 text-white"
              : "text-white/60 hover:text-white/90 hover:bg-white/5"
          }
        `}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
      >
        {node.districtColor ? (
          <span
            className="inline-block w-2 h-2 rounded-full shrink-0"
            style={{ backgroundColor: node.districtColor }}
          />
        ) : (
          <FileCode className="w-3 h-3 shrink-0 text-white/30" />
        )}
        <span className="truncate">{node.name}</span>
      </button>
    )
  }

  return (
    <div>
      <button
        onClick={() => toggleFolder(node.path)}
        className="flex items-center gap-1 w-full text-left py-1 px-2 rounded-sm
          font-mono text-xs text-white/70 hover:text-white/90 hover:bg-white/5
          transition-colors duration-100 cursor-pointer"
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
      >
        {isExpanded ? (
          <ChevronDown className="w-3 h-3 shrink-0" />
        ) : (
          <ChevronRight className="w-3 h-3 shrink-0" />
        )}
        <span className="truncate">{node.name}</span>
        <span className="text-white/30 ml-auto text-[10px] shrink-0">
          {node.children.length}
        </span>
      </button>
      {isExpanded &&
        node.children.map((child) => (
          <TreeNodeItem
            key={child.path}
            node={child}
            depth={depth + 1}
            expandedFolders={expandedFolders}
            toggleFolder={toggleFolder}
          />
        ))}
    </div>
  )
}

export function FileTree({ snapshot }: FileTreeProps) {
  const { selectedFile } = useCityStore()
  const tree = useMemo(() => buildTree(snapshot), [snapshot])
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set<string>()
  )

  // Auto-expand parent folders when a file is selected in 3D
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

  return (
    <div className="bg-card/30 backdrop-blur-xl rounded-lg border border-border/30 overflow-hidden">
      <div className="px-3 py-2 border-b border-border/30">
        <span className="font-mono text-xs text-white/50 uppercase tracking-wider">
          Files
        </span>
      </div>
      <div className="overflow-y-auto max-h-[60vh] py-1">
        {tree.children.map((child) => (
          <TreeNodeItem
            key={child.path}
            node={child}
            depth={0}
            expandedFolders={expandedFolders}
            toggleFolder={toggleFolder}
          />
        ))}
      </div>
    </div>
  )
}
