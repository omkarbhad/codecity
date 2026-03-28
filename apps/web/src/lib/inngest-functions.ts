import { inngest } from "./inngest"
import { parseGitHubUrl, fetchRepoTree, fetchFileBatch } from "./analysis/github"
import { parseAllFiles } from "./analysis/parser"
import { computeDistricts, layoutCity, computeStats } from "./analysis/layout"
import { setAnalysisProgress, setAnalysisSnapshot } from "./redis"
import { updateProject, saveSnapshot } from "./project-store"

/**
 * Inngest function: analyze a GitHub repository in the background.
 *
 * Runs as a single step to avoid Inngest's ~4MB inter-step serialization
 * limit (file contents + snapshot data easily exceed this for real repos).
 * Progress is tracked via Redis SSE so the client still sees live updates.
 */
export const analyzeRepo = inngest.createFunction(
  { id: "analyze-repo", retries: 1 },
  { event: "codecity/analyze.requested" },
  async ({ event, step }) => {
    const { repoUrl, projectId, githubToken } = event.data as {
      repoUrl: string
      projectId: string
      githubToken: string | null
    }

    await step.run("analyze", async () => {
      try {
        // 1. Fetch tree
        await setAnalysisProgress(projectId, {
          stage: "fetching-tree",
          progress: 0,
          message: "Fetching repository tree...",
          completed: false,
        })

        const { owner, repo } = parseGitHubUrl(repoUrl)
        const treeItems = await fetchRepoTree(owner, repo, githubToken ?? undefined)

        if (treeItems.length === 0) {
          throw new Error(
            "No supported source files found. Supported: TypeScript, JavaScript, Python, CSS, HTML, JSON, Go, Rust, Java, and more."
          )
        }

        await setAnalysisProgress(projectId, {
          stage: "downloading-files",
          progress: 10,
          message: `Found ${treeItems.length} source files`,
          completed: false,
        })

        // 2. Download files
        const paths = treeItems.map((f) => f.path)

        await setAnalysisProgress(projectId, {
          stage: "downloading-files",
          progress: 20,
          message: `Downloading ${paths.length} files...`,
          completed: false,
        })

        const files = await fetchFileBatch(owner, repo, paths, undefined, githubToken ?? undefined)

        await setAnalysisProgress(projectId, {
          stage: "parsing",
          progress: 50,
          message: "Parsing source files...",
          completed: false,
        })

        // 3. Parse and compute layout
        const { parsed, warnings } = parseAllFiles(files)

        await setAnalysisProgress(projectId, {
          stage: "computing-layout",
          progress: 80,
          message: "Computing city layout...",
          completed: false,
        })

        const districts = computeDistricts(parsed)
        const laidOut = layoutCity(parsed, districts)
        const stats = computeStats(laidOut)

        const snapshot = {
          files: laidOut,
          districts,
          stats,
          warnings: warnings.length > 0 ? warnings : undefined,
        }

        // 4. Save results — Postgres first (no size limit), Redis as optional cache
        await updateProject(projectId, {
          status: "COMPLETED",
          fileCount: snapshot.stats.totalFiles,
          lineCount: snapshot.stats.totalLines,
        })
        await saveSnapshot(projectId, snapshot)

        // Redis cache is optional — may fail for large repos (10MB limit)
        await setAnalysisSnapshot(projectId, snapshot).catch((err) => {
          console.warn(`Redis snapshot cache skipped for ${projectId}: ${err instanceof Error ? err.message : err}`)
        })

        await setAnalysisProgress(projectId, {
          stage: "complete",
          progress: 100,
          message: "Analysis complete!",
          completed: true,
        })
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Analysis failed"

        await updateProject(projectId, { status: "FAILED", error: errorMsg }).catch(() => {})
        await setAnalysisProgress(projectId, {
          stage: "error",
          progress: 0,
          message: errorMsg,
          error: errorMsg,
          completed: false,
        }).catch(() => {})

        throw err
      }
    })

    return { success: true, projectId }
  }
)
