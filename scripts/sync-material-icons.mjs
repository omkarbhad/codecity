// Copies Material Icon Theme's SVGs into public/icons/material and writes a
// compact lookup (manifest.json) the file tree reads at runtime.
// Run after bumping the material-icon-theme dependency: pnpm icons:material
import { cpSync, mkdirSync, rmSync, writeFileSync } from "node:fs"
import { createRequire } from "node:module"
import { dirname, join, basename } from "node:path"
import { fileURLToPath } from "node:url"

const require = createRequire(import.meta.url)
const { generateManifest } = require("material-icon-theme")

const root = join(dirname(fileURLToPath(import.meta.url)), "..")
const pkgDir = dirname(require.resolve("material-icon-theme/package.json"))
const out = join(root, "public/icons/material")

const m = generateManifest()
// Icon ids → svg file names, so the client never needs iconDefinitions.
const svg = (id) => {
  const def = m.iconDefinitions[id]
  return def ? basename(def.iconPath) : undefined
}
const mapIds = (obj = {}) =>
  Object.fromEntries(Object.entries(obj).map(([k, id]) => [k.toLowerCase(), svg(id)]).filter(([, v]) => v))

const manifest = {
  file: svg(m.file),
  folder: svg(m.folder),
  folderExpanded: svg(m.folderExpanded),
  fileNames: mapIds(m.fileNames),
  fileExtensions: mapIds(m.fileExtensions),
  languageIds: mapIds(m.languageIds),
  folderNames: mapIds(m.folderNames),
  folderNamesExpanded: mapIds(m.folderNamesExpanded),
}

rmSync(out, { recursive: true, force: true })
mkdirSync(out, { recursive: true })
cpSync(join(pkgDir, "icons"), out, { recursive: true })
cpSync(join(pkgDir, "LICENSE"), join(out, "LICENSE"))
writeFileSync(join(out, "manifest.json"), JSON.stringify(manifest))
console.log(`material icons: ${Object.keys(manifest.fileExtensions).length} extensions, ${Object.keys(manifest.folderNames).length} folders → ${out}`)
