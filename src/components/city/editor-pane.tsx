"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import CodeMirror, { EditorView, type Extension, type ReactCodeMirrorRef } from "@uiw/react-codemirror"
import { languages } from "@codemirror/language-data"
import { HighlightStyle, LanguageDescription, syntaxHighlighting } from "@codemirror/language"
import { tags as t } from "@lezer/highlight"
import { useQuery } from "@tanstack/react-query"
import { ContextMenu, DropdownMenu } from "radix-ui"
import { PlusIcon, TriangleAlertIcon, XIcon, Building2Icon, CopyIcon, Trash2Icon, PencilIcon, GithubIcon, LockIcon, CheckIcon, MoreIcon } from "@/components/ui/icons"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@codecity/ui/components/dialog"
import { Button } from "@codecity/ui/components/button"
import { Input } from "@codecity/ui/components/input"
import { AppIcon } from "@/components/ui/app-icon"
import { fileCapabilities } from "@/lib/tauri"
import { cn } from "@codecity/ui/lib/utils"
import { FileIcon } from "./file-icons"
import { MarkdownPreview } from "./markdown-preview"
import { cleanErrorMessage, findFunctionLine, getGitHubFileUrl, getLang } from "./editor-utils"
import { useCityStore } from "./use-city-store"
import { isDirty, useEditorStore, type EditorTab } from "./use-editor-store"

const baseName = (path: string) => path.split("/").pop() ?? path
const errorText = (e: unknown) => cleanErrorMessage(e instanceof Error ? e.message : String(e))

// ── Editor theme on the app's tokens (works in light and dark) ──────────────

const editorTheme = EditorView.theme({
  "&": { height: "100%", backgroundColor: "var(--bg)", color: "var(--cream)", fontSize: "13px" },
  ".cm-scroller": { fontFamily: "var(--font-mono-stack)", lineHeight: "1.65" },
  ".cm-content": { caretColor: "var(--lime)", padding: "10px 0" },
  ".cm-cursor, .cm-dropCursor": { borderLeftColor: "var(--lime)", borderLeftWidth: "2px" },
  ".cm-gutters": { backgroundColor: "var(--bg)", color: "var(--dim)", border: "none", paddingLeft: "6px" },
  ".cm-activeLineGutter": { backgroundColor: "transparent", color: "var(--cream-dark)" },
  ".cm-activeLine": { backgroundColor: "color-mix(in srgb, var(--cream) 4%, transparent)" },
  "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection": {
    backgroundColor: "color-mix(in srgb, var(--lime) 24%, transparent) !important",
  },
  ".cm-searchMatch": { backgroundColor: "color-mix(in srgb, var(--sev-med) 30%, transparent)" },
  ".cm-foldPlaceholder": { backgroundColor: "var(--bg-raised)", border: "none", color: "var(--muted)" },
  ".cm-panels": { backgroundColor: "var(--bg-card)", color: "var(--cream)", borderColor: "var(--border-pixel)" },
  ".cm-panels input, .cm-panels button": { fontFamily: "var(--font-display)" },
  ".cm-tooltip": { backgroundColor: "var(--bg-card)", border: "1px solid var(--border-pixel)", borderRadius: "10px" },
})

const syntax = syntaxHighlighting(
  HighlightStyle.define([
    { tag: [t.keyword, t.modifier, t.controlKeyword, t.operatorKeyword], color: "var(--syn-keyword)" },
    { tag: [t.string, t.special(t.string), t.regexp], color: "var(--syn-string)" },
    { tag: [t.number, t.bool, t.null, t.atom], color: "var(--syn-number)" },
    { tag: [t.comment, t.lineComment, t.blockComment], color: "var(--syn-comment)", fontStyle: "italic" },
    { tag: [t.function(t.variableName), t.function(t.propertyName), t.macroName], color: "var(--syn-function)" },
    { tag: [t.typeName, t.className, t.namespace], color: "var(--syn-type)" },
    { tag: [t.propertyName, t.attributeName], color: "var(--syn-property)" },
    { tag: [t.tagName, t.heading], color: "var(--syn-tag)", fontWeight: "600" },
    { tag: [t.link, t.url], color: "var(--syn-string)", textDecoration: "underline" },
    { tag: [t.punctuation, t.operator], color: "var(--muted)" },
  ])
)

function useLanguage(path: string): Extension[] {
  const [ext, setExt] = useState<Extension[]>([])
  useEffect(() => {
    let live = true
    setExt([])
    const desc = LanguageDescription.matchFilename(languages, baseName(path))
    desc?.load().then((support) => live && setExt([support]))
    return () => {
      live = false
    }
  }, [path])
  return ext
}

// ── Bridge: anything that "opens source" opens a tab ─────────────────────────

export function useEditorBridge(onFilesChanged?: () => void) {
  const codeViewer = useCityStore((s) => s.codeViewer)
  const closeCodeViewer = useCityStore((s) => s.closeCodeViewer)
  const repoUrl = useCityStore((s) => s.repoUrl)
  const setRepoUrl = useEditorStore((s) => s.setRepoUrl)
  const open = useEditorStore((s) => s.open)
  const setFilesChanged = useEditorStore((s) => s.setFilesChanged)

  useEffect(() => setRepoUrl(repoUrl), [repoUrl, setRepoUrl])
  useEffect(() => setFilesChanged(onFilesChanged ?? null), [onFilesChanged, setFilesChanged])
  useEffect(() => {
    if (!codeViewer) return
    open(codeViewer.filePath, codeViewer.functionName)
    closeCodeViewer()
  }, [codeViewer, open, closeCodeViewer])
}

/** Whether files in this project can be edited (local folders only). */
function useFileCapabilities() {
  const repoUrl = useCityStore((s) => s.repoUrl)
  const { data } = useQuery({
    queryKey: ["file-capabilities", repoUrl],
    enabled: !!repoUrl,
    queryFn: () => fileCapabilities(repoUrl),
    staleTime: Infinity,
  })
  return data ?? { editable: false, reason: null }
}

// ── Tab strip ───────────────────────────────────────────────────────────────

export function EditorTabStrip() {
  const tabs = useEditorStore((s) => s.tabs)
  const active = useEditorStore((s) => s.active)
  const activate = useEditorStore((s) => s.activate)
  const requestClose = useEditorStore((s) => s.requestClose)

  if (tabs.length === 0) return null

  const tabClass = (on: boolean) =>
    cn(
      "group flex h-7 shrink-0 items-center gap-1.5 rounded-[8px] pl-2 pr-1 text-[13px] transition-colors",
      on ? "bg-(--bg-raised) font-medium text-(--cream)" : "text-(--muted) hover:bg-(--bg-card) hover:text-(--cream)"
    )

  return (
    <div role="tablist" aria-label="Open files" className="flex h-10 shrink-0 items-center gap-0.5 overflow-x-auto border-b border-(--border-pixel) px-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <button type="button" role="tab" aria-selected={active === null} onClick={() => activate(null)} className={cn(tabClass(active === null), "pr-2.5")}>
        <AppIcon icon={Building2Icon} className="size-4" active={active === null} />
        City
      </button>
      <span className="mx-1.5 h-4 w-px shrink-0 bg-(--border-pixel)" aria-hidden="true" />
      {tabs.map((tab) => {
        const on = active === tab.path
        const dirty = isDirty(tab)
        return (
          <div
            key={tab.path}
            role="tab"
            aria-selected={on}
            tabIndex={0}
            title={tab.path}
            onClick={() => activate(tab.path)}
            onAuxClick={(e) => e.button === 1 && requestClose(tab.path)}
            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && activate(tab.path)}
            className={cn(tabClass(on), "cursor-pointer")}
          >
            <FileIcon name={baseName(tab.path)} className="!size-3.5" />
            <span className="max-w-[160px] truncate">{baseName(tab.path)}</span>
            <button
              type="button"
              aria-label={`Close ${baseName(tab.path)}`}
              onClick={(e) => {
                e.stopPropagation()
                requestClose(tab.path)
              }}
              className={cn("relative flex size-5 items-center justify-center rounded-[5px] text-(--muted) transition-opacity hover:bg-(--bg-on) hover:text-(--cream) focus-visible:opacity-100", !on && !dirty && "opacity-0 group-hover:opacity-100")}
            >
              {dirty ? (
                <>
                  <span className="size-2 rounded-full bg-(--cream-dark) group-hover:hidden" aria-label="Unsaved changes" />
                  <AppIcon icon={XIcon} className="hidden size-3.5 group-hover:block" />
                </>
              ) : (
                <AppIcon icon={XIcon} className="size-3.5" />
              )}
            </button>
          </div>
        )
      })}
    </div>
  )
}

// ── Editor for the front tab ────────────────────────────────────────────────

export function EditorPane() {
  const tabs = useEditorStore((s) => s.tabs)
  const active = useEditorStore((s) => s.active)
  const tab = tabs.find((t) => t.path === active)
  if (!tab) return null
  return <FileEditor key={tab.path} tab={tab} />
}

function FileEditor({ tab }: { tab: EditorTab }) {
  const repoUrl = useCityStore((s) => s.repoUrl)
  const edit = useEditorStore((s) => s.edit)
  const save = useEditorStore((s) => s.save)
  const requestDialog = useEditorStore((s) => s.requestDialog)
  const clearReveal = useEditorStore((s) => s.clearReveal)
  const { editable, reason } = useFileCapabilities()
  const language = useLanguage(tab.path)
  const cm = useRef<ReactCodeMirrorRef>(null)
  const lang = getLang(tab.path)
  const isMarkdown = lang === "markdown" || lang === "mdx"
  const [preview, setPreview] = useState(isMarkdown)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const dirty = isDirty(tab)

  const extensions = useMemo(() => [editorTheme, syntax, EditorView.lineWrapping, ...language], [language])

  const doSave = useCallback(async () => {
    if (!editable || !dirty) return
    setSaving(true)
    setSaveError(null)
    try {
      await save(tab.path)
    } catch (e) {
      setSaveError(errorText(e))
    } finally {
      setSaving(false)
    }
  }, [editable, dirty, save, tab.path])

  // ⌘S / Ctrl+S saves the front tab.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault()
        void doSave()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [doSave])

  // "View source" on a function: jump to its definition once loaded.
  useEffect(() => {
    if (tab.loading || !tab.revealFunction) return
    const line = findFunctionLine(tab.content, tab.revealFunction, lang)
    const view = cm.current?.view
    if (line !== null && view && line < view.state.doc.lines) {
      const pos = view.state.doc.line(line + 1).from
      view.dispatch({ selection: { anchor: pos }, effects: EditorView.scrollIntoView(pos, { y: "center" }) })
      setPreview(false)
    }
    clearReveal(tab.path)
  }, [tab.loading, tab.revealFunction, tab.content, tab.path, lang, clearReveal])

  const githubUrl = getGitHubFileUrl(repoUrl, tab.path, null)
  const menuItem =
    "flex h-8 cursor-pointer items-center gap-2.5 rounded-[9px] px-2 text-[13px] text-(--cream-dark) outline-none transition-colors data-[highlighted]:bg-(--bg-raised) data-[highlighted]:text-(--cream)"
  const folders = tab.path.split("/").slice(0, -1)

  return (
    <div className="absolute inset-0 z-30 flex flex-col bg-(--bg)">
      {/* Toolbar: where the file is, then how it is shown, its save state, and one menu for the rest */}
      <div className="flex h-11 shrink-0 items-center gap-2 border-b border-(--border-pixel) pl-4 pr-2">
        <span className="flex min-w-0 flex-1 items-center gap-1.5 text-[12.5px] text-(--muted)" title={tab.path}>
          {folders.length > 0 && <span className="min-w-0 shrink truncate">{folders.join(" / ")}</span>}
          {folders.length > 0 && <span className="shrink-0 text-(--dim)">/</span>}
          <span className="shrink-0 font-medium text-(--cream)">{baseName(tab.path)}</span>
        </span>

        {saveError && (
          <span className="flex max-w-[280px] items-center gap-1.5 truncate rounded-full bg-[color-mix(in_srgb,var(--sev-high)_14%,transparent)] px-2.5 py-0.5 text-[12px] text-(--sev-high)" title={saveError}>
            <AppIcon icon={TriangleAlertIcon} className="size-3.5 shrink-0" />
            {saveError}
          </span>
        )}
        {!editable && (
          <span className="flex shrink-0 items-center gap-1.5 text-[12px] text-(--muted)" title={reason ?? "Read-only"}>
            <AppIcon icon={LockIcon} className="size-3.5" />
            Read-only
          </span>
        )}
        {/* Saved is a quiet note; only unsaved changes get a button */}
        {editable && (dirty || saving ? (
          <Button size="xs" disabled={saving} onClick={() => void doSave()} title="Save (⌘S)">
            {saving ? "Saving…" : "Save"}
          </Button>
        ) : (
          <span className="flex shrink-0 items-center gap-1 text-[12px] text-(--muted)">
            <AppIcon icon={CheckIcon} className="size-3.5" />
            Saved
          </span>
        ))}

        {isMarkdown && (
          <div className="cc-seg" role="group" aria-label="Markdown view">
            <button type="button" className="cc-seg-btn h-6 px-2.5 text-[12.5px]" aria-pressed={preview} onClick={() => setPreview(true)}>
              Preview
            </button>
            <button type="button" className="cc-seg-btn h-6 px-2.5 text-[12.5px]" aria-pressed={!preview} onClick={() => setPreview(false)}>
              {editable ? "Edit" : "Source"}
            </button>
          </div>
        )}

        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button
              type="button"
              aria-label="File actions"
              title="File actions"
              className="flex size-7 shrink-0 items-center justify-center rounded-[7px] text-(--muted) transition-colors hover:bg-(--bg-raised) hover:text-(--cream) data-[state=open]:bg-(--bg-raised) data-[state=open]:text-(--cream)"
            >
              <AppIcon icon={MoreIcon} className="size-[18px]" />
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content align="end" sideOffset={6} className="z-50 min-w-[190px] rounded-[14px] border border-(--border-pixel) bg-(--bg-card) p-1 shadow-(--shadow-lg) outline-none">
              <DropdownMenu.Item className={menuItem} onSelect={() => void navigator.clipboard.writeText(tab.path)}>
                <AppIcon icon={CopyIcon} className="text-(--muted)" /> Copy path
              </DropdownMenu.Item>
              {githubUrl && (
                <DropdownMenu.Item asChild className={menuItem}>
                  <a href={githubUrl} target="_blank" rel="noopener noreferrer">
                    <AppIcon icon={GithubIcon} className="text-(--muted)" /> Open on GitHub
                  </a>
                </DropdownMenu.Item>
              )}
              {editable && (
                <>
                  <DropdownMenu.Separator className="mx-2 my-1 h-px bg-(--border-pixel)" />
                  <DropdownMenu.Item className={menuItem} onSelect={() => requestDialog({ kind: "rename", path: tab.path })}>
                    <AppIcon icon={PencilIcon} className="text-(--muted)" /> Rename
                  </DropdownMenu.Item>
                  <DropdownMenu.Item className={cn(menuItem, "data-[highlighted]:text-(--sev-high)")} onSelect={() => requestDialog({ kind: "delete", path: tab.path })}>
                    <AppIcon icon={Trash2Icon} className="text-(--muted)" /> Move to Trash
                  </DropdownMenu.Item>
                </>
              )}
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>

      {/* Body */}
      <div className="relative min-h-0 flex-1 overflow-auto scroll-thin">
        {tab.loading && <p className="p-6 text-[13px] text-(--muted)">Loading {baseName(tab.path)}…</p>}
        {tab.error && (
          <div className="m-6 flex max-w-lg items-start gap-2 rounded-[10px] bg-[color-mix(in_srgb,var(--sev-high)_12%,transparent)] px-4 py-3 text-[13px] text-(--sev-high)">
            <AppIcon icon={TriangleAlertIcon} className="mt-0.5 size-4 shrink-0" />
            {tab.error}
          </div>
        )}
        {!tab.loading && !tab.error && (preview && isMarkdown ? (
          <MarkdownPreview source={tab.content} mdx={lang === "mdx"} />
        ) : (
          <CodeMirror
            ref={cm}
            value={tab.content}
            height="100%"
            className="h-full"
            theme="none"
            editable={editable}
            readOnly={!editable}
            extensions={extensions}
            basicSetup={{ foldGutter: true, highlightActiveLine: true, autocompletion: false }}
            onChange={(value) => edit(tab.path, value)}
          />
        ))}
      </div>
    </div>
  )
}

// ── Create / rename / delete / unsaved-close dialogs ────────────────────────

export function FileDialogs() {
  const dialog = useEditorStore((s) => s.dialog)
  const requestDialog = useEditorStore((s) => s.requestDialog)
  const { create, rename, remove, close, save } = useEditorStore.getState()
  const filesChanged = useEditorStore((s) => s.filesChanged)
  const [value, setValue] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setError(null)
    setBusy(false)
    if (dialog?.kind === "create") setValue(dialog.path ? `${dialog.path}/` : "")
    if (dialog?.kind === "rename") setValue(dialog.path)
  }, [dialog])

  if (!dialog) return null
  const dismiss = () => requestDialog(null)
  const run = async (action: () => Promise<void>, changesTree: boolean) => {
    setBusy(true)
    setError(null)
    try {
      await action()
      dismiss()
      if (changesTree) filesChanged?.()
    } catch (e) {
      setError(errorText(e))
      setBusy(false)
    }
  }
  const cleanPath = value.trim().replace(/^\/+/, "")

  const copy = {
    create: { title: "New file", description: "Path inside the project, e.g. src/utils/format.ts. Missing folders are created." },
    rename: { title: "Rename or move", description: "New path inside the project." },
    delete: { title: `Move ${baseName(dialog.path)} to the Trash?`, description: "You can restore it from the Trash." },
    unsaved: { title: `Save changes to ${baseName(dialog.path)}?`, description: "Your changes will be lost if you don't save them." },
  }[dialog.kind]

  return (
    <Dialog open onOpenChange={(open) => !open && dismiss()}>
      <DialogContent className="overflow-hidden rounded-[16px] border border-(--border-pixel) bg-(--bg) p-5 shadow-(--shadow-lg) sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="text-[15px] font-medium text-(--cream)">{copy.title}</DialogTitle>
          <DialogDescription className="text-[13px] text-(--muted)">{copy.description}</DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (dialog.kind === "create" && cleanPath && !cleanPath.endsWith("/")) void run(() => create(cleanPath), true)
            if (dialog.kind === "rename" && cleanPath && cleanPath !== dialog.path) void run(() => rename(dialog.path, cleanPath), true)
            if (dialog.kind === "delete") void run(() => remove(dialog.path), true)
            if (dialog.kind === "unsaved") void run(async () => { await save(dialog.path); close(dialog.path) }, false)
          }}
          className="space-y-4"
        >
          {(dialog.kind === "create" || dialog.kind === "rename") && (
            <Input autoFocus value={value} onChange={(e) => setValue(e.target.value)} aria-label="File path" className="h-9 font-mono" placeholder="src/new-file.ts" />
          )}
          {error && <p className="rounded-[10px] bg-[color-mix(in_srgb,var(--sev-high)_12%,transparent)] px-3 py-2 text-[13px] text-(--sev-high)">{error}</p>}
          <DialogFooter className="gap-2">
            {dialog.kind === "unsaved" ? (
              <>
                <Button type="button" variant="ghost" onClick={() => { close(dialog.path); dismiss() }}>Don&apos;t save</Button>
                <Button type="button" variant="secondary" onClick={dismiss}>Cancel</Button>
                <Button type="submit" disabled={busy}>Save</Button>
              </>
            ) : (
              <>
                <Button type="button" variant="secondary" onClick={dismiss}>Cancel</Button>
                <Button type="submit" variant={dialog.kind === "delete" ? "destructive" : "default"} disabled={busy || ((dialog.kind === "create" || dialog.kind === "rename") && !cleanPath)}>
                  {dialog.kind === "create" ? "Create" : dialog.kind === "rename" ? "Rename" : "Move to Trash"}
                </Button>
              </>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ── Right-click menu for Explorer rows ──────────────────────────────────────


const menuItem =
  "flex h-8 cursor-pointer select-none items-center gap-2 rounded-[6px] px-2.5 text-[13px] text-(--cream-dark) outline-none data-[highlighted]:bg-(--bg-raised) data-[highlighted]:text-(--cream) data-[disabled]:pointer-events-none data-[disabled]:opacity-40"

/** Wraps a file-tree row with Open / New file / Rename / Move to Trash / Copy path. */
export function FileContextMenu({ path, isFile, children }: { path: string; isFile: boolean; children: React.ReactNode }) {
  const { editable } = useFileCapabilities()
  const requestDialog = useEditorStore((s) => s.requestDialog)
  const open = useEditorStore((s) => s.open)
  const folder = isFile ? path.split("/").slice(0, -1).join("/") : path

  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger asChild>{children}</ContextMenu.Trigger>
      <ContextMenu.Portal>
        <ContextMenu.Content className="z-[200] min-w-[200px] rounded-[10px] border border-(--border-pixel) bg-(--bg-card) p-1 shadow-(--shadow-lg)">
          {isFile && (
            <ContextMenu.Item className={menuItem} onSelect={() => open(path)}>
              Open
            </ContextMenu.Item>
          )}
          <ContextMenu.Item className={menuItem} disabled={!editable} onSelect={() => requestDialog({ kind: "create", path: folder })}>
            New file{folder ? " here" : ""}…
          </ContextMenu.Item>
          {isFile && (
            <>
              <ContextMenu.Item className={menuItem} disabled={!editable} onSelect={() => requestDialog({ kind: "rename", path })}>
                Rename…
              </ContextMenu.Item>
              <ContextMenu.Item className={cn(menuItem, "data-[highlighted]:text-(--sev-high)")} disabled={!editable} onSelect={() => requestDialog({ kind: "delete", path })}>
                Move to Trash…
              </ContextMenu.Item>
            </>
          )}
          <ContextMenu.Separator className="my-1 h-px bg-(--border-pixel)" />
          <ContextMenu.Item className={menuItem} onSelect={() => void navigator.clipboard.writeText(path)}>
            Copy path
          </ContextMenu.Item>
        </ContextMenu.Content>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  )
}

/** "New file" for the Explorer header; hidden when the project is read-only. */
export function NewFileButton() {
  const { editable } = useFileCapabilities()
  const requestDialog = useEditorStore((s) => s.requestDialog)
  if (!editable) return null
  return (
    <button
      type="button"
      title="New file"
      aria-label="New file"
      onClick={() => requestDialog({ kind: "create", path: "" })}
      className="flex size-6 items-center justify-center rounded-[6px] text-(--muted) transition-colors hover:bg-(--bg-raised) hover:text-(--cream)"
    >
      <AppIcon icon={PlusIcon} className="size-4" />
    </button>
  )
}
