import { inngest } from "./inngest"
import { parseGitHubUrl, fetchRepoTree, fetchFileBatch } from "./analysis/github"
import { parseAllFiles } from "./analysis/parser"
import { computeDistricts, layoutCity, computeStats } from "./analysis/layout"
import { setAnalysisProgress, setAnalysisSnapshot } from "./redis"
import { updateProject, saveSnapshot } from "./project-store"

/**
 * Inngest function: analyze a GitHub repository in the background.
 * Each step.run() gets its own serverless invocation timeout,
 * so large repos won't hit Vercel's function timeout.
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

    try {
      // Step 1: Parse URL and fetch tree
      const tree = await step.run("fetch-tree", async () => {
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
            `No supported source files found. Supported: TypeScript, JavaScript, Python, CSS, HTML, JSON, Go, Rust, Java, and more.`
          )
        }

        await setAnalysisProgress(projectId, {
          stage: "downloading-files",
          progress: 10,
          message: `Found ${treeItems.length} source files`,
          completed: false,
        })

        return { owner, repo, paths: treeItems.map((f) => f.path) }
      })

      // Step 2: Download files
      const filesEntries = await step.run("download-files", async () => {
        const { owner, repo, paths } = tree

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

        // Convert Map to array for serialization (Inngest serializes step results)
        return Array.from(files.entries())
      })

      // Step 3: Parse and compute layout
      const snapshot = await step.run("parse-and-layout", async () => {
        const files = new Map(filesEntries)

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

        return {
          files: laidOut,
          districts,
          stats,
          warnings: warnings.length > 0 ? warnings : undefined,
        }
      })

      // Step 4: Save results
      await step.run("save-results", async () => {
        // Store in Redis for retrieval
        await setAnalysisSnapshot(projectId, snapshot)

        // Update project status
        await updateProject(projectId, {
          status: "COMPLETED",
          fileCount: snapshot.stats.totalFiles,
          lineCount: snapshot.stats.totalLines,
        })
        await saveSnapshot(projectId, snapshot).catch(() => {})

        await setAnalysisProgress(projectId, {
          stage: "complete",
          progress: 100,
          message: "Analysis complete!",
          completed: true,
        })
      })

      return { success: true, projectId }
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

      throw err // Let Inngest handle retries
    }
  }
)
