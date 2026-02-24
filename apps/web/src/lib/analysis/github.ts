interface GitHubTreeItem {
  path: string
  type: "blob" | "tree"
  size?: number
}

/**
 * Parse a GitHub URL into owner and repo.
 * Accepts: https://github.com/owner/repo, github.com/owner/repo, owner/repo
 */
export function parseGitHubUrl(url: string): { owner: string; repo: string } {
  const trimmed = url.trim().replace(/\/+$/, "")

  // Try full URL format: https://github.com/owner/repo or github.com/owner/repo
  const urlPattern = /^(?:https?:\/\/)?github\.com\/([^/]+)\/([^/]+?)(?:\.git)?$/
  const urlMatch = trimmed.match(urlPattern)
  if (urlMatch) {
    return { owner: urlMatch[1], repo: urlMatch[2] }
  }

  // Try shorthand: owner/repo
  const shortPattern = /^([^/\s]+)\/([^/\s]+)$/
  const shortMatch = trimmed.match(shortPattern)
  if (shortMatch) {
    return { owner: shortMatch[1], repo: shortMatch[2] }
  }

  throw new Error(
    `Invalid GitHub URL: "${url}". ` +
      `Expected formats: https://github.com/owner/repo, github.com/owner/repo, or owner/repo`
  )
}

/** Paths that should be excluded from analysis */
const SKIP_PATTERNS = [
  "node_modules",
  "dist",
  ".next",
  "__tests__",
  "/test/",
  ".test.",
  ".spec.",
  ".d.ts",
]

function shouldSkipPath(path: string): boolean {
  return SKIP_PATTERNS.some((pattern) => path.includes(pattern))
}

function isTypeScriptFile(path: string): boolean {
  return path.endsWith(".ts") || path.endsWith(".tsx")
}

function getAuthHeaders(): Record<string, string> {
  const token = process.env.GITHUB_TOKEN
  if (token) {
    return { Authorization: `Bearer ${token}` }
  }
  return {}
}

/**
 * Fetch the full file tree of a repository, filtered to TypeScript source files.
 */
export async function fetchRepoTree(
  owner: string,
  repo: string
): Promise<GitHubTreeItem[]> {
  const url = `https://api.github.com/repos/${owner}/${repo}/git/trees/HEAD?recursive=1`

  const response = await fetch(url, {
    headers: {
      Accept: "application/vnd.github.v3+json",
      ...getAuthHeaders(),
    },
  })

  if (response.status === 404) {
    throw new Error(`Repository not found: ${owner}/${repo}`)
  }
  if (response.status === 403) {
    const rateLimitReset = response.headers.get("x-ratelimit-reset")
    const resetTime = rateLimitReset
      ? new Date(Number(rateLimitReset) * 1000).toISOString()
      : "unknown"
    throw new Error(
      `GitHub API rate limit exceeded. Resets at ${resetTime}. ` +
        `Set GITHUB_TOKEN environment variable for higher rate limits.`
    )
  }
  if (!response.ok) {
    throw new Error(
      `GitHub API error: ${response.status} ${response.statusText}`
    )
  }

  const data = (await response.json()) as {
    tree: GitHubTreeItem[]
    truncated: boolean
  }

  if (data.truncated) {
    console.warn(
      `Warning: Repository tree was truncated by GitHub API. Some files may be missing.`
    )
  }

  return data.tree.filter(
    (item) =>
      item.type === "blob" &&
      isTypeScriptFile(item.path) &&
      !shouldSkipPath(item.path)
  )
}

/**
 * Fetch the raw content of a single file from a repository.
 */
export async function fetchFileContent(
  owner: string,
  repo: string,
  path: string
): Promise<string> {
  const url = `https://raw.githubusercontent.com/${owner}/${repo}/HEAD/${path}`

  const response = await fetch(url, {
    headers: getAuthHeaders(),
  })

  if (!response.ok) {
    throw new Error(
      `Failed to fetch ${path}: ${response.status} ${response.statusText}`
    )
  }

  return response.text()
}

/**
 * Simple semaphore for concurrency limiting.
 */
function createSemaphore(concurrency: number) {
  let running = 0
  const queue: Array<() => void> = []

  function acquire(): Promise<void> {
    return new Promise<void>((resolve) => {
      if (running < concurrency) {
        running++
        resolve()
      } else {
        queue.push(resolve)
      }
    })
  }

  function release(): void {
    running--
    const next = queue.shift()
    if (next) {
      running++
      next()
    }
  }

  return { acquire, release }
}

/**
 * Fetch multiple files with concurrency limiting and progress reporting.
 * Files that fail to download are skipped with a warning.
 */
export async function fetchFileBatch(
  owner: string,
  repo: string,
  paths: string[],
  onProgress?: (progress: number) => void
): Promise<Map<string, string>> {
  const results = new Map<string, string>()
  const semaphore = createSemaphore(10)
  let completed = 0

  const tasks = paths.map(async (path) => {
    await semaphore.acquire()
    try {
      const content = await fetchFileContent(owner, repo, path)
      results.set(path, content)
    } catch (error) {
      console.warn(
        `Skipping ${path}: ${error instanceof Error ? error.message : String(error)}`
      )
    } finally {
      semaphore.release()
      completed++
      onProgress?.(completed / paths.length)
    }
  })

  await Promise.all(tasks)
  return results
}
