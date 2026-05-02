"use client"

import { useMemo, useState, useEffect, useCallback, memo, useRef } from "react"
import { ChevronRight, ChevronDown, Eye, EyeOff } from "lucide-react"
import { getIconForFile as _getIconForFile, getIconForFolder as _getIconForFolder, getIconForOpenFolder as _getIconForOpenFolder } from "vscode-icons-js"

// vscode-icons-js returns "light_" variants by default, which are invisible on dark backgrounds.
// Remap to dark variants when available.
function darkIcon(icon: string): string {
  if (!icon.includes("_light_")) return icon
  const dark = icon.replace("_light_", "_")
  return dark
}
function getFileIcon(name: string): string {
  return darkIcon(_getIconForFile(name) ?? "default_file.svg")
}
function getFolderIcon(name: string): string {
  return darkIcon(_getIconForFolder(name))
}
function getOpenFolderIcon(name: string): string {
  return darkIcon(_getIconForOpenFolder(name))
}
import type { CitySnapshot } from "@/lib/types/city"
import { isPathHidden as isStorePathHidden, useCityStore } from "./use-city-store"
import { getExtension } from "./extension-filter"

interface FileTreeProps {
  snapshot: CitySnapshot
  selectionSnapshot?: CitySnapshot
}

interface TreeNode {
  name: string
  path: string
  isFile: boolean
  parsed: boolean
  children: TreeNode[]
  districtColor?: string
  fileCount: number
}

function buildTree(snapshot: CitySnapshot, hiddenExtensions: Set<string>): TreeNode {
  const root: TreeNode = { name: "root", path: "", isFile: false, parsed: false, children: [], fileCount: 0 }

  const districtColorMap = new Map<string, string>()
  const parsedPaths = new Set(snapshot.files.map((file) => file.path))
  for (const file of snapshot.files) {
    const district = snapshot.districts.find((d) => d.name === file.district)
    if (district) {
      districtColorMap.set(file.path, district.color)
    }
  }

  const entries =
    snapshot.sourceTree && snapshot.sourceTree.length > 0
      ? snapshot.sourceTree
      : snapshot.files.map((file) => ({ path: file.path, isFile: true, parsed: true }))

  for (const entry of entries) {
    if (entry.isFile && hiddenExtensions.has(getExtension(entry.path))) {
      continue
    }

    const parts = entry.path.split("/").filter(Boolean)
    let current = root

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]
      const isLast = i === parts.length - 1
      const currentPath = parts.slice(0, i + 1).join("/")
      const isFile = isLast ? entry.isFile : false

      let child = current.children.find((c) => c.name === part)
      if (!child) {
        child = {
          name: part,
          path: currentPath,
          isFile,
          parsed: isFile ? parsedPaths.has(currentPath) || entry.parsed : false,
          children: [],
          districtColor: isFile ? districtColorMap.get(currentPath) : undefined,
          fileCount: 0,
        }
        current.children.push(child)
      } else if (isLast) {
        child.isFile = isFile
        child.parsed = isFile ? parsedPaths.has(currentPath) || entry.parsed : child.parsed
      }
      current = child
    }
  }

  function sortAndCount(node: TreeNode): number {
    if (node.isFile) {
      node.parsed = parsedPaths.has(node.path) || node.parsed
      node.fileCount = node.parsed ? 1 : 0
      return node.fileCount
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
    node.parsed = total > 0
    return total
  }
  sortAndCount(root)

  function pruneEmptyFolders(node: TreeNode): boolean {
    if (node.isFile) return true

    node.children = node.children.filter(pruneEmptyFolders)
    node.fileCount = node.children.reduce((total, child) => total + child.fileCount, 0)
    node.parsed = node.fileCount > 0
    return node.children.length > 0
  }
  pruneEmptyFolders(root)

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

const TreeNodeItem = memo(function TreeNodeItem({
  node,
  depth,
  expandedFolders,
  toggleFolder,
  searchQuery,
  selectableFiles,
}: {
  node: TreeNode
  depth: number
  expandedFolders: Set<string>
  toggleFolder: (path: string) => void
  searchQuery: string
  selectableFiles: Map<string, number>
}) {
  const selectedFile = useCityStore((s) => s.selectedFile)
  const selectFile = useCityStore((s) => s.selectFile)
  const openCodeViewer = useCityStore((s) => s.openCodeViewer)
  const hiddenPaths = useCityStore((s) => s.hiddenPaths)
  const togglePathVisibility = useCityStore((s) => s.togglePathVisibility)
  const isSelected = selectedFile === node.path
  const isExpanded = expandedFolders.has(node.path)
  const isPathHidden = isStorePathHidden(node.path, hiddenPaths)
  const isHidden = isPathHidden
  const isUnparsed = !node.parsed
  const selectableIndex = node.isFile ? selectableFiles.get(node.path) : undefined
  const isSelectable = selectableIndex !== undefined && !isHidden

  // Highlight search matches
  const isMatch = searchQuery && node.name.toLowerCase().includes(searchQuery.toLowerCase())

  // Indent: 8px base + 16px per depth level
  // Files get extra 16px to align with folder content (past the chevron)
  const indent = node.isFile ? depth * 16 + 24 : depth * 16 + 8

  if (node.isFile) {
    return (
      <div
        className={`group flex h-7 select-none items-center border-l-2 pr-2 text-[12px] transition-colors ${isSelectable ? "cursor-pointer" : "cursor-default"} ${
          isSelected
            ? "border-primary bg-white/[0.08] text-white"
            : isHidden
              ? "border-transparent text-white/22"
              : isUnparsed
                ? "border-transparent text-white/28"
              : isMatch
                ? "border-primary/45 bg-primary/[0.06] text-primary/80"
                : "border-transparent text-white/58 hover:bg-white/[0.045] hover:text-white/90"
        }`}
        style={{ paddingLeft: indent }}
        data-file-path={node.path}
        data-selected-file={isSelected ? "true" : undefined}
        onClick={() => {
          if (isSelectable) selectFile(node.path, selectableIndex)
        }}
        onDoubleClick={() => {
          if (isSelectable) openCodeViewer(node.path)
        }}
      >
        <img
          src={`/icons/vscode/${getFileIcon(node.name)}`}
          alt=""
          className={`w-[14px] h-[14px] shrink-0 mr-[6px] ${isHidden ? "opacity-30" : isUnparsed ? "opacity-35 grayscale" : ""}`}
        />
        <span className={`truncate flex-1 font-mono text-[11px] ${isHidden ? "line-through opacity-55" : isUnparsed ? "opacity-60" : ""}`}>{node.name}</span>
        {isUnparsed && !isHidden && (
          <span className="ml-1 shrink-0 rounded border border-white/[0.06] px-1 py-px font-sans text-[9px] text-white/24">
            skipped
          </span>
        )}
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation()
            togglePathVisibility(node.path)
          }}
          className="ml-1 flex size-5 shrink-0 items-center justify-center rounded text-white/24 opacity-0 transition-colors hover:bg-white/[0.05] hover:text-white/65 group-hover:opacity-100 focus:opacity-100"
          title={isPathHidden ? "Show path" : "Hide path"}
          aria-label={isPathHidden ? `Show ${node.name}` : `Hide ${node.name}`}
        >
          {isPathHidden ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
        </button>
      </div>
    )
  }

  return (
    <div>
      <div
        className={`group flex h-7 cursor-pointer select-none items-center border-l-2 pr-2 text-[12px] transition-colors ${
          isHidden
            ? "border-transparent text-white/25"
            : isUnparsed
              ? "border-transparent text-white/30"
            : isMatch
              ? "border-primary/45 text-primary/80"
              : "border-transparent text-white/60 hover:bg-white/[0.045] hover:text-white/90"
        }`}
        style={{ paddingLeft: indent }}
        onClick={() => toggleFolder(node.path)}
      >
        {isExpanded
          ? <ChevronDown className="w-4 h-4 shrink-0 text-white/30 -ml-0.5" />
          : <ChevronRight className="w-4 h-4 shrink-0 text-white/30 -ml-0.5" />
        }
        <img
          src={`/icons/vscode/${isExpanded ? getOpenFolderIcon(node.name) : getFolderIcon(node.name)}`}
          alt=""
          className={`w-[14px] h-[14px] shrink-0 mr-[6px] ${isHidden ? "opacity-30" : isUnparsed ? "opacity-35 grayscale" : ""}`}
        />
        <span className={`truncate flex-1 font-medium ${isHidden ? "line-through opacity-55" : isUnparsed ? "opacity-60" : ""}`}>{node.name}</span>
        <span className="mr-1 rounded border border-white/[0.06] bg-white/[0.025] px-1 py-px font-mono text-[9px] text-white/32">
          {node.fileCount}
        </span>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation()
            togglePathVisibility(node.path)
          }}
          className="flex size-5 shrink-0 items-center justify-center rounded text-white/24 opacity-0 transition-colors hover:bg-white/[0.05] hover:text-white/65 group-hover:opacity-100 focus:opacity-100"
          title={isPathHidden ? "Show path" : "Hide path"}
          aria-label={isPathHidden ? `Show ${node.name}` : `Hide ${node.name}`}
        >
          {isPathHidden ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
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
            selectableFiles={selectableFiles}
          />
        ))}
    </div>
  )
})

export function FileTree({ snapshot, selectionSnapshot = snapshot }: FileTreeProps) {
  const selectedFile = useCityStore((s) => s.selectedFile)
  const searchQuery = useCityStore((s) => s.searchQuery)
  const hiddenPaths = useCityStore((s) => s.hiddenPaths)
  const hiddenExtensions = useCityStore((s) => s.hiddenExtensions)
  const showAllPaths = useCityStore((s) => s.showAllPaths)
  const scrollRef = useRef<HTMLDivElement>(null)
  const tree = useMemo(() => buildTree(snapshot, hiddenExtensions), [hiddenExtensions, snapshot])
  const selectableFiles = useMemo(() => {
    const files = new Map<string, number>()
    selectionSnapshot.files.forEach((file, index) => files.set(file.path, index))
    return files
  }, [selectionSnapshot.files])
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

  useEffect(() => {
    if (!selectedFile) return

    const timeoutId = window.setTimeout(() => {
      const container = scrollRef.current
      const selectedRow = container?.querySelector<HTMLElement>('[data-selected-file="true"]')
      selectedRow?.scrollIntoView({ block: "nearest", behavior: "smooth" })
    }, 40)

    return () => window.clearTimeout(timeoutId)
  }, [expandedFolders, selectedFile])

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

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#0b0b0c]">
      <div ref={scrollRef} className="flex-1 overflow-y-auto overscroll-contain py-1.5 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10">
        {tree.children.map((child) => (
          <TreeNodeItem
            key={child.path}
            node={child}
            depth={0}
            expandedFolders={expandedFolders}
            toggleFolder={toggleFolder}
            searchQuery={searchQuery}
            selectableFiles={selectableFiles}
          />
        ))}
      </div>
      {hiddenPaths.size > 0 && (
        <div className="flex shrink-0 items-center justify-between border-t border-white/[0.08] bg-[#0d0d0f] px-3 py-2">
          <span className="font-sans text-[10px] text-amber-300/55">
            {hiddenPaths.size} hidden
          </span>
          <button
            onClick={showAllPaths}
            className="rounded border border-amber-300/10 bg-amber-300/[0.04] px-1.5 py-0.5 font-sans text-[10px] text-amber-300/65 transition-colors hover:text-amber-200"
          >
            Show all
          </button>
        </div>
      )}
    </div>
  )
}
