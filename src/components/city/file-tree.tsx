"use client"

import { useMemo, useState, useEffect, useCallback, memo, useRef } from "react"
import { ChevronDownIcon, ChevronRightIcon, FileSearchIcon, EyeIcon, EyeOffIcon } from "@/components/ui/icons"
import { AppIcon } from "@/components/ui/app-icon"
import { FileIcon } from "./file-icons"
import { FileContextMenu } from "./editor-pane"
import { useSettings } from "@/lib/settings"
import type { CitySnapshot } from "@/lib/types/city"
import { isPathHidden as isStorePathHidden, useCityStore } from "./use-city-store"
import { getExtension } from "./extension-filter"

interface FileTreeProps {
  snapshot: CitySnapshot
  selectionSnapshot?: CitySnapshot
  /** When set, only files whose path contains this text are listed (the Search panel). */
  filterQuery?: string
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

function buildTree(snapshot: CitySnapshot, hiddenExtensions: Set<string>, filterQuery = ""): TreeNode {
  const needle = filterQuery.trim().toLowerCase()
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
    if (needle && (!entry.isFile || !entry.path.toLowerCase().includes(needle))) {
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

/** One faint vertical line per ancestor level, centred on that level's chevron. */
function IndentGuides({ depth }: { depth: number }) {
  const show = useSettings((s) => s.indentGuides)
  if (!show || depth === 0) return null
  return (
    <>
      {Array.from({ length: depth }, (_, i) => (
        <span
          key={i}
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 w-px bg-(--border-pixel)"
          style={{ left: 8 + i * 16 + 7 }}
        />
      ))}
    </>
  )
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

  // Indent: 8px base + 16px per depth level. Files and folders share one
  // column grid: a 16px chevron slot (empty for files), then the icon.
  const indent = depth * 16 + 8

  if (node.isFile) {
    return (
      <FileContextMenu path={node.path} isFile>
      <div
        className={`group relative mx-1.5 flex h-7 select-none items-center rounded-md pr-2 text-[12px] transition-colors ${isSelectable ? "cursor-pointer" : "cursor-default"} ${
          isSelected
            ? "bg-(--bg-on) text-(--cream) shadow-[inset_0_0_0_1px_var(--border-light)]"
            : isHidden
              ? "text-(--muted)"
              : isUnparsed
                ? "text-(--muted)"
              : isMatch
                ? "bg-[color-mix(in_srgb,var(--lime)_6%,transparent)] text-primary"
                : "text-(--cream-dark) hover:bg-(--bg-raised) hover:text-(--cream)"
        }`}
        style={{ paddingLeft: indent }}
        role="treeitem"
        tabIndex={0}
        aria-selected={isSelected}
        aria-disabled={!isSelectable || undefined}
        title={node.path}
        data-file-path={node.path}
        data-selected-file={isSelected ? "true" : undefined}
        onClick={() => {
          if (isSelectable) selectFile(node.path, selectableIndex)
        }}
        onDoubleClick={() => {
          if (isSelectable) openCodeViewer(node.path)
        }}
        onKeyDown={(e) => {
          if (e.target !== e.currentTarget || !isSelectable) return
          if (e.key === "Enter") {
            e.preventDefault()
            if (isSelected) openCodeViewer(node.path)
            else selectFile(node.path, selectableIndex)
          } else if (e.key === " ") {
            e.preventDefault()
            selectFile(node.path, selectableIndex)
          }
        }}
      >
        <IndentGuides depth={depth} />
        <span className="w-4 shrink-0" aria-hidden="true" />
        <FileIcon
          name={node.name}
          color={node.districtColor}
          className={`mr-1.5 ${isHidden ? "opacity-30" : isUnparsed ? "opacity-35 grayscale" : ""}`}
        />
        <span className={`flex-1 truncate ${isHidden ? "line-through" : ""}`}>{node.name}</span>
        {isUnparsed && !isHidden && (
          <span className="ml-1 shrink-0 rounded-full bg-(--bg-card) px-1.5 py-px text-[11px] text-(--muted) rounded-md">
            skip
          </span>
        )}
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation()
            togglePathVisibility(node.path)
          }}
          className={`ml-1 flex size-5 shrink-0 items-center justify-center text-(--muted) transition-colors hover:bg-(--bg-raised) hover:text-(--cream) focus:opacity-100 group-hover:opacity-100 group-focus-within:opacity-100 ${isPathHidden ? "opacity-100" : "opacity-0"}`}
          title={isPathHidden ? "Show in city" : "Hide from city"}
          aria-label={isPathHidden ? `Show ${node.name}` : `Hide ${node.name}`}
        >
          <AppIcon icon={isPathHidden ? EyeOffIcon : EyeIcon} className="size-3.5" />
        </button>
      </div>
      </FileContextMenu>
    )
  }

  return (
    <div>
      <FileContextMenu path={node.path} isFile={false}>
      <div
        className={`group relative mx-1.5 flex h-7 cursor-pointer select-none items-center rounded-md pr-2 text-[12px] transition-colors ${
          isHidden
            ? "text-(--muted)"
            : isUnparsed
              ? "text-(--muted)"
            : isMatch
              ? "text-primary"
              : "text-(--cream-dark) hover:bg-(--bg-raised) hover:text-(--cream)"
        }`}
        style={{ paddingLeft: indent }}
        role="treeitem"
        tabIndex={0}
        aria-expanded={isExpanded}
        title={node.path}
        onClick={() => toggleFolder(node.path)}
        onKeyDown={(e) => {
          if (e.target !== e.currentTarget) return
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault()
            toggleFolder(node.path)
          } else if ((e.key === "ArrowRight" && !isExpanded) || (e.key === "ArrowLeft" && isExpanded)) {
            e.preventDefault()
            toggleFolder(node.path)
          }
        }}
      >
        <IndentGuides depth={depth} />
        <span className="flex w-4 shrink-0 items-center justify-center text-(--muted) group-hover:text-(--cream-dark)">
          <AppIcon icon={isExpanded ? ChevronDownIcon : ChevronRightIcon} className="size-3.5" />
        </span>
        <FileIcon
          name={node.name}
          folder
          expanded={isExpanded}
          className={`mr-1.5 ${isHidden ? "opacity-30" : isUnparsed ? "opacity-35 grayscale" : ""}`}
        />
        <span className={`flex-1 truncate font-semibold ${isHidden ? "line-through" : ""}`}>{node.name}</span>
        <span className="mr-1 text-[11px] tabular-nums text-(--muted)">
          {node.fileCount}
        </span>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation()
            togglePathVisibility(node.path)
          }}
          className={`flex size-5 shrink-0 items-center justify-center text-(--muted) transition-colors hover:bg-(--bg-raised) hover:text-(--cream) focus:opacity-100 group-hover:opacity-100 group-focus-within:opacity-100 ${isPathHidden ? "opacity-100" : "opacity-0"}`}
          title={isPathHidden ? "Show in city" : "Hide from city"}
          aria-label={isPathHidden ? `Show ${node.name}` : `Hide ${node.name}`}
        >
          <AppIcon icon={isPathHidden ? EyeOffIcon : EyeIcon} className="size-3.5" />
        </button>
      </div>
      </FileContextMenu>
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

export function FileTree({ snapshot, selectionSnapshot = snapshot, filterQuery }: FileTreeProps) {
  const selectedFile = useCityStore((s) => s.selectedFile)
  const searchQuery = useCityStore((s) => s.searchQuery)
  const hiddenPaths = useCityStore((s) => s.hiddenPaths)
  const hiddenExtensions = useCityStore((s) => s.hiddenExtensions)
  const showAllPaths = useCityStore((s) => s.showAllPaths)
  const scrollRef = useRef<HTMLDivElement>(null)
  const tree = useMemo(() => buildTree(snapshot, hiddenExtensions, filterQuery), [hiddenExtensions, snapshot, filterQuery])
  const isFiltering = !!filterQuery?.trim()
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
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      {isFiltering && tree.children.length > 0 && (
        <div className="shrink-0 px-3.5 pb-1.5 text-[12px] text-(--muted)">
          <span className="tabular-nums text-(--cream-dark)">{tree.fileCount}</span> {tree.fileCount === 1 ? "match" : "matches"}
        </div>
      )}
      <div ref={scrollRef} role="tree" aria-label="Project files" className="flex-1 overflow-y-auto overscroll-contain py-1.5 scroll-thin">
        {isFiltering && tree.children.length === 0 && (
          <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
            <AppIcon icon={FileSearchIcon} className="size-5 text-(--dim)" />
            <p className="text-[12px] text-(--muted)">No files match</p>
          </div>
        )}
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
        <div className="flex shrink-0 items-center justify-between border-t border-(--border-pixel) px-3.5 py-2">
          <span className="text-[12px] text-(--sev-med)">
            <span className="tabular-nums">{hiddenPaths.size}</span> hidden
          </span>
          <button
            onClick={showAllPaths}
            className="h-6 rounded-full bg-[color-mix(in_srgb,var(--sev-med)_14%,transparent)] px-2.5 text-[12px] text-(--sev-med) transition-colors active:translate-y-px hover:bg-[color-mix(in_srgb,var(--sev-med)_22%,transparent)] rounded-full"
          >
            Show all
          </button>
        </div>
      )}
    </div>
  )
}
