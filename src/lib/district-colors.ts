// District colours. The palette lives in Rust (crates/codecity-core/src/layout/color.rs);
// snapshots saved before a palette change carry older colours, so they are
// remapped here as they load, keeping each sub-district's hue/lightness offset.

/** Old neon palette, in palette order. */
const OLD = ["#00e5ff", "#00e676", "#448aff", "#ffea00", "#b388ff", "#ff9100", "#ff4081", "#1de9b6", "#aeea00", "#ff1744", "#8c9eff", "#ffc400"]
/** Calm palette used before the current one, also in palette order. */
const CALM = ["#38bdf8", "#34d399", "#60a5fa", "#fbbf24", "#a78bfa", "#fb923c", "#f472b6", "#2dd4bf", "#a3e635", "#fb7185", "#818cf8", "#facc15"]
/** Current palette, same order (keep in sync with color.rs DISTRICT_COLORS). */
export const DISTRICT_COLORS = ["#38bdf8", "#fb923c", "#34d399", "#f472b6", "#facc15", "#818cf8", "#f87171", "#2dd4bf", "#a3e635", "#c084fc", "#f59e0b", "#94a3b8"]

const NEON_REMAP = new Map(OLD.map((c, i) => [c, DISTRICT_COLORS[i]]))
const CALM_REMAP = new Map(CALM.map((c, i) => [c, DISTRICT_COLORS[i]]))

/**
 * The calm and current palettes share some colours, so a colour alone can't say
 * which palette made it. Districts are coloured in palette order, so count which
 * palette the district order matches; ties stay on the current palette.
 */
function isCalmSnapshot(districts: Colored[]): boolean {
  let calm = 0
  let current = 0
  districts.forEach((d, i) => {
    const c = d.color.toLowerCase()
    if (c === CALM[i % CALM.length]) calm++
    if (c === DISTRICT_COLORS[i % DISTRICT_COLORS.length]) current++
  })
  return calm > current
}

type Hsl = [number, number, number]

function toHsl(hex: string): Hsl {
  const n = parseInt(hex.replace("#", ""), 16)
  const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2
  if (max === min) return [0, 0, l]
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4
  return [h / 6, s, l]
}

function toHex([h, s, l]: Hsl): string {
  const f = (n: number) => {
    const k = (n + h * 12) % 12
    const a = s * Math.min(l, 1 - l)
    return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)))).toString(16).padStart(2, "0")
  }
  return `#${f(0)}${f(8)}${f(4)}`
}

interface Colored { color: string; subDistricts?: Colored[] }

/** Re-tint `node` (old palette) from `oldBase` → `newBase`, keeping its offset. */
function shift(node: Colored, oldBase: string, newBase: string) {
  const oldColor = node.color
  const [oh, , ol] = toHsl(oldBase), [ch, , cl] = toHsl(oldColor), [nh, ns, nl] = toHsl(newBase)
  node.color = toHex([(nh + (ch - oh) + 1) % 1, Math.min(1, Math.max(0.3, ns)), Math.min(0.8, Math.max(0.25, nl + (cl - ol)))])
  node.subDistricts?.forEach((child) => shift(child, oldColor, node.color))
}

/** In place: moves a snapshot from an older palette to the current one. */
export function recolorSnapshot<T>(snapshot: T): T {
  const districts = (snapshot as { districts?: Colored[] } | null)?.districts
  if (!districts) return snapshot
  const remap = isCalmSnapshot(districts) ? CALM_REMAP : NEON_REMAP
  districts.forEach((district) => {
    const next = remap.get(district.color.toLowerCase())
    if (!next) return
    const old = district.color
    district.color = next
    district.subDistricts?.forEach((sub) => shift(sub, old, next))
  })
  return snapshot
}
