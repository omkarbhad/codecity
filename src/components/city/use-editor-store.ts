"use client"

import { create } from "zustand"
import { createFile, deleteFile, getSourceFile, renameFile, writeFile } from "@/lib/tauri"
import { cleanErrorMessage } from "./editor-utils"

export interface EditorTab {
  path: string
  /** What the editor shows (may have unsaved edits). */
  content: string
  /** Last loaded or saved content; `content !== saved` means unsaved changes. */
  saved: string
  loading: boolean
  error: string | null
  /** Function to scroll to once loaded (from "view source" on a function). */
  revealFunction: string | null
}

export type FileDialog =
  | { kind: "create"; path: string }
  | { kind: "rename"; path: string }
  | { kind: "delete"; path: string }
  | { kind: "unsaved"; path: string }

interface EditorState {
  repoUrl: string
  /** The open create/rename/delete/unsaved dialog, if any. */
  dialog: FileDialog | null
  /** Called after files are created, renamed or deleted (refreshes the city). */
  filesChanged: (() => void) | null
  tabs: EditorTab[]
  /** Path of the tab in front, or null for the City tab. */
  active: string | null
  setRepoUrl: (repoUrl: string) => void
  open: (path: string, revealFunction?: string | null) => void
  activate: (path: string | null) => void
  close: (path: string) => void
  /** Close, but ask first when the tab has unsaved changes. */
  requestClose: (path: string) => void
  requestDialog: (dialog: FileDialog | null) => void
  setFilesChanged: (fn: (() => void) | null) => void
  clearReveal: (path: string) => void
  edit: (path: string, content: string) => void
  save: (path: string) => Promise<void>
  create: (path: string, content?: string) => Promise<void>
  remove: (path: string) => Promise<void>
  rename: (from: string, to: string) => Promise<void>
  reset: () => void
}

export const isDirty = (tab: EditorTab) => !tab.loading && !tab.error && tab.content !== tab.saved

/** Open files as tabs beside the City tab, with save/create/rename/delete. */
export const useEditorStore = create<EditorState>()((set, get) => {
  const patch = (path: string, changes: Partial<EditorTab>) =>
    set((s) => ({ tabs: s.tabs.map((t) => (t.path === path ? { ...t, ...changes } : t)) }))

  const load = (path: string) => {
    const { repoUrl } = get()
    if (!repoUrl) {
      patch(path, { loading: false, error: "No source available for this project." })
      return
    }
    getSourceFile(repoUrl, path)
      .then((text) => patch(path, { content: text, saved: text, loading: false, error: null }))
      .catch((e) => patch(path, { loading: false, error: cleanErrorMessage(e instanceof Error ? e.message : String(e)) }))
  }

  return {
    repoUrl: "",
    dialog: null,
    filesChanged: null,
    tabs: [],
    active: null,
    setRepoUrl: (repoUrl) => {
      if (repoUrl !== get().repoUrl) set({ repoUrl, tabs: [], active: null })
    },
    open: (path, revealFunction = null) => {
      const existing = get().tabs.find((t) => t.path === path)
      if (existing) {
        set({ active: path })
        if (revealFunction) patch(path, { revealFunction })
        return
      }
      set((s) => ({
        active: path,
        tabs: [...s.tabs, { path, content: "", saved: "", loading: true, error: null, revealFunction }],
      }))
      load(path)
    },
    activate: (path) => set({ active: path }),
    close: (path) =>
      set((s) => {
        const index = s.tabs.findIndex((t) => t.path === path)
        const tabs = s.tabs.filter((t) => t.path !== path)
        // Closing the front tab shows its neighbour, else the City.
        const active = s.active !== path ? s.active : (tabs[index] ?? tabs[index - 1])?.path ?? null
        return { tabs, active }
      }),
    requestClose: (path) => {
      const tab = get().tabs.find((t) => t.path === path)
      if (tab && isDirty(tab)) set({ dialog: { kind: "unsaved", path } })
      else get().close(path)
    },
    requestDialog: (dialog) => set({ dialog }),
    setFilesChanged: (filesChanged) => set({ filesChanged }),
    clearReveal: (path) => patch(path, { revealFunction: null }),
    edit: (path, content) => patch(path, { content }),
    save: async (path) => {
      const tab = get().tabs.find((t) => t.path === path)
      if (!tab || !isDirty(tab)) return
      const content = tab.content
      await writeFile(get().repoUrl, path, content)
      patch(path, { saved: content })
    },
    create: async (path, content = "") => {
      await createFile(get().repoUrl, path, content)
      set((s) => ({
        active: path,
        tabs: [...s.tabs.filter((t) => t.path !== path), { path, content, saved: content, loading: false, error: null, revealFunction: null }],
      }))
    },
    remove: async (path) => {
      await deleteFile(get().repoUrl, path)
      get().close(path)
    },
    rename: async (from, to) => {
      await renameFile(get().repoUrl, from, to)
      set((s) => ({
        active: s.active === from ? to : s.active,
        tabs: s.tabs.map((t) => (t.path === from ? { ...t, path: to } : t)),
      }))
    },
    reset: () => set({ tabs: [], active: null }),
  }
})
