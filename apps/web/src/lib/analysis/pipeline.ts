import type { CitySnapshot } from "../types/city"
import { parseGitHubUrl, fetchRepoTree, fetchFileBatch } from "./github"
import { parseAllFiles } from "./parser"
import { computeDistricts, layoutCity, computeStats } from "./layout"

export type ProgressCallback = (
  stage: string,
  progress: number,
  message: string
) => void

/**
 * Full analysis pipeline: fetches a GitHub repository, parses source files,
 * and computes a city layout visualization.
 *
 * Stages:
 *   1. fetching-tree    — resolve repo URL and fetch file tree
 *   2. downloading-files — download source files
 *   3. parsing           — parse AST / regex
 *   4. computing-layout  — arrange files into city districts
 *   5. complete          — done
 */
export async function analyzeRepository(
  repoUrl: string,
  onProgress: ProgressCallback = () => {}
): Promise<CitySnapshot> {
  // 1. Parse URL
  const { owner, repo } = parseGitHubUrl(repoUrl)
  onProgress("fetching-tree", 0, "Fetching repository tree...")

  // 2. Fetch tree
  const tree = await fetchRepoTree(owner, repo)
  onProgress(
    "downloading-files",
    0.1,
    `Found ${tree.length} source files`
  )

  if (tree.length === 0) {
    throw new Error(
      `No supported source files found in ${owner}/${repo}. ` +
        `Supported: TypeScript, JavaScript, Python, CSS, HTML, JSON, Go, Rust, Java, and more.`
    )
  }

  // 3. Download files (with progress)
  const files = await fetchFileBatch(
    owner,
    repo,
    tree.map((f) => f.path),
    (p) =>
      onProgress(
        "downloading-files",
        0.1 + p * 0.4,
        `Downloading files... ${Math.round(p * 100)}%`
      )
  )
  onProgress("parsing", 0.5, "Parsing source files...")

  // 4. Parse all files
  const { parsed, warnings } = parseAllFiles(files, (p) =>
    onProgress(
      "parsing",
      0.5 + p * 0.3,
      `Parsing files... ${Math.round(p * 100)}%`
    )
  )

  if (warnings.length > 0) {
    console.warn(`${warnings.length} file(s) had parse errors (still included as stubs)`)
  }

  // 5. Compute layout
  onProgress("computing-layout", 0.8, "Computing city layout...")
  const districts = computeDistricts(parsed)
  const laidOut = layoutCity(parsed, districts)
  const stats = computeStats(laidOut)

  onProgress("complete", 1, "Analysis complete!")
  return { files: laidOut, districts, stats, warnings: warnings.length > 0 ? warnings : undefined }
}
