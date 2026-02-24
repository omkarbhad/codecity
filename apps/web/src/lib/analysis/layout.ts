import type { FileData, DistrictData, CityStats } from "../types/city"
import { DISTRICT_COLORS } from "../types/city"
import type { ParsedFile } from "./parser"

/**
 * Group parsed files into districts based on their top-level directory.
 * Files in the root directory are placed in a "root" district.
 * Colors are assigned from DISTRICT_COLORS, cycling if more than 12 districts.
 */
export function computeDistricts(files: ParsedFile[]): DistrictData[] {
  const districtMap = new Map<string, string[]>()

  for (const file of files) {
    const segments = file.path.split("/")
    const districtName = segments.length > 1 ? segments[0] : "root"

    if (!districtMap.has(districtName)) {
      districtMap.set(districtName, [])
    }
    districtMap.get(districtName)!.push(file.path)
  }

  // Sort districts by file count (largest first)
  const sortedEntries = Array.from(districtMap.entries()).sort(
    (a, b) => b[1].length - a[1].length
  )

  return sortedEntries.map(([name, filePaths], index) => ({
    name,
    color: DISTRICT_COLORS[index % DISTRICT_COLORS.length],
    files: filePaths,
    bounds: { x: 0, z: 0, width: 0, depth: 0 }, // computed in layoutCity
  }))
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

/**
 * Compute 3D building dimensions from file metrics.
 * Height scales with lines of code, width/depth scale with function count.
 */
export function computeBuildingDimensions(file: ParsedFile): {
  height: number
  width: number
  depth: number
} {
  const height = clamp(file.lines / 50, 0.4, 18)
  const width = clamp(1.2 + file.functions.length * 0.15, 1.2, 2.8)
  return { height, width, depth: width }
}

/**
 * Arrange files into a city layout with districts positioned in a meta-grid.
 * Each district contains a sub-grid of buildings.
 *
 * Returns FileData[] with computed positions, district assignments, and importedBy.
 */
export function layoutCity(
  files: ParsedFile[],
  districts: DistrictData[]
): FileData[] {
  const BUILDING_SPACING = 1.5
  const DISTRICT_SPACING = 4

  // Build a quick lookup: filePath -> district name
  const fileToDistrict = new Map<string, string>()
  for (const district of districts) {
    for (const fp of district.files) {
      fileToDistrict.set(fp, district.name)
    }
  }

  // Build import reverse-lookup (importedBy)
  const importedByMap = new Map<string, string[]>()
  for (const file of files) {
    for (const imp of file.imports) {
      if (!importedByMap.has(imp)) {
        importedByMap.set(imp, [])
      }
      importedByMap.get(imp)!.push(file.path)
    }
  }

  // Determine meta-grid layout for districts
  const districtCount = districts.length
  const districtsPerRow = Math.ceil(Math.sqrt(districtCount))

  // First pass: compute each district's sub-grid dimensions
  const districtLayouts: Array<{
    district: DistrictData
    files: ParsedFile[]
    cols: number
    rows: number
    gridWidth: number
    gridDepth: number
  }> = []

  const filesByPath = new Map<string, ParsedFile>()
  for (const file of files) {
    filesByPath.set(file.path, file)
  }

  for (const district of districts) {
    const districtFiles = district.files
      .map((fp) => filesByPath.get(fp))
      .filter((f): f is ParsedFile => f !== undefined)

    const cols = Math.ceil(Math.sqrt(districtFiles.length))
    const rows = Math.ceil(districtFiles.length / cols)
    const gridWidth = cols * BUILDING_SPACING
    const gridDepth = rows * BUILDING_SPACING

    districtLayouts.push({
      district,
      files: districtFiles,
      cols,
      rows,
      gridWidth,
      gridDepth,
    })
  }

  // Second pass: position districts in the meta-grid and place buildings
  const result: FileData[] = []
  let districtOffsetX = 0
  let districtOffsetZ = 0
  let rowMaxDepth = 0

  for (let i = 0; i < districtLayouts.length; i++) {
    const col = i % districtsPerRow
    if (col === 0 && i > 0) {
      // Move to next row
      districtOffsetZ += rowMaxDepth + DISTRICT_SPACING
      districtOffsetX = 0
      rowMaxDepth = 0
    }

    const layout = districtLayouts[i]
    const { district, cols } = layout

    // Update district bounds
    district.bounds = {
      x: districtOffsetX - BUILDING_SPACING * 0.5,
      z: districtOffsetZ - BUILDING_SPACING * 0.5,
      width: layout.gridWidth + BUILDING_SPACING,
      depth: layout.gridDepth + BUILDING_SPACING,
    }

    // Place buildings within this district
    for (let j = 0; j < layout.files.length; j++) {
      const file = layout.files[j]
      const fileCol = j % cols
      const fileRow = Math.floor(j / cols)

      const x = districtOffsetX + fileCol * BUILDING_SPACING
      const z = districtOffsetZ + fileRow * BUILDING_SPACING

      const importedBy = importedByMap.get(file.path) ?? []

      result.push({
        path: file.path,
        lines: file.lines,
        functions: file.functions,
        types: file.types,
        classes: file.classes,
        imports: file.imports,
        importedBy,
        complexity: file.complexity,
        isReactComponent: file.isReactComponent,
        hasUnusedExports: file.hasUnusedExports,
        position: { x, z },
        district: district.name,
      })
    }

    rowMaxDepth = Math.max(rowMaxDepth, layout.gridDepth)
    districtOffsetX += layout.gridWidth + DISTRICT_SPACING
  }

  return result
}

/**
 * Compute aggregate statistics for the city.
 */
export function computeStats(files: FileData[]): CityStats {
  return {
    totalFiles: files.length,
    totalFunctions: files.reduce((sum, f) => sum + f.functions.length, 0),
    totalLines: files.reduce((sum, f) => sum + f.lines, 0),
    totalTypes: files.reduce((sum, f) => sum + f.types.length, 0),
    totalImports: files.reduce((sum, f) => sum + f.imports.length, 0),
    unusedExports: files.filter((f) => f.hasUnusedExports).length,
  }
}
