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
 * Full analysis pipeline: fetches a GitHub repository, parses TypeScript files,
 * and computes a city layout visualization.
 *
 * Stages:
 *   1. fetching-tree   — resolve repo URL and fetch file tree
 *   2. downloading-files — download TypeScript source files
 *   3. parsing          — parse AST with ts-morph
 *   4. computing-layout — arrange files into city districts
 *   5. complete         — done
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
    `Found ${tree.length} TypeScript files`
  )

  if (tree.length === 0) {
    throw new Error(
      `No TypeScript files found in ${owner}/${repo}. ` +
        `The repository may not contain .ts or .tsx files, or all files are in excluded directories.`
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
  onProgress("parsing", 0.5, "Parsing TypeScript...")

  // 4. Parse all files
  const parsed = parseAllFiles(files, (p) =>
    onProgress(
      "parsing",
      0.5 + p * 0.3,
      `Parsing files... ${Math.round(p * 100)}%`
    )
  )

  // 5. Compute layout
  onProgress("computing-layout", 0.8, "Computing city layout...")
  const districts = computeDistricts(parsed)
  const laidOut = layoutCity(parsed, districts)
  const stats = computeStats(laidOut)

  onProgress("complete", 1, "Analysis complete!")
  return { files: laidOut, districts, stats }
}
