use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};

use super::db::Database;
use super::github;
use super::layout::CitySnapshot;
use super::parser;

#[allow(dead_code)]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AnalysisProgress {
    pub stage: String,
    pub progress: f64,
    pub message: String,
    pub error: Option<String>,
    pub completed: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AnalyzeResult {
    pub success: bool,
    pub project_id: Option<String>,
    pub snapshot: Option<CitySnapshot>,
    pub error: Option<String>,
}

const SKIP_DIRS: &[&str] = &[
    "node_modules", ".git", "dist", ".next", "build", "target",
    "__pycache__", ".cache", "vendor", ".venv", "venv",
    "coverage", ".tox", ".mypy_cache", ".idea", ".vscode",
];

const SUPPORTED_EXTENSIONS: &[&str] = &[
    "ts", "tsx", "js", "jsx", "mjs", "cjs",
    "py", "css", "scss", "less", "sass",
    "html", "htm", "md", "mdx",
    "json", "yaml", "yml", "toml",
    "go", "rs", "java", "kt", "kts", "rb", "php", "swift",
    "c", "h", "cpp", "cxx", "cc", "hpp", "hxx", "hh",
    "sh", "bash", "zsh", "fish",
    "zig",
    "lua",
    "hs", "lhs",
    "dart",
    "ex", "exs",
    "scala",
    "r", "R",
    "jl",
    "pl", "pm", "t",
    "cs",
    "erl", "hrl",
    "nix",
    "glsl", "frag", "vert", "comp",
    "ml", "mli",
    "groovy", "gradle",
    "el",
];

fn should_skip_dir(dir_name: &str) -> bool {
    SKIP_DIRS.contains(&dir_name)
}

fn is_supported_extension(ext: &str) -> bool {
    SUPPORTED_EXTENSIONS.contains(&ext)
}

/// Recursively collect supported source files from a local directory
fn collect_source_files(dir: &Path) -> Vec<PathBuf> {
    let mut result = Vec::new();

    if let Ok(entries) = std::fs::read_dir(dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_dir() {
                if let Some(name) = path.file_name().and_then(|n| n.to_str()) {
                    if !should_skip_dir(name) && !name.starts_with('.') {
                        result.extend(collect_source_files(&path));
                    }
                }
            } else if path.is_file() {
                let ext = path.extension().and_then(|e| e.to_str()).unwrap_or("");
                if is_supported_extension(ext) {
                    result.push(path);
                }
            }
        }
    }

    result
}

/// Read files from a local directory and return (relative_path, content) pairs
fn read_local_files(base_dir: &Path) -> Vec<(String, String)> {
    let files = collect_source_files(base_dir);
    let mut result = Vec::new();

    for path in files {
        let relative = path.strip_prefix(base_dir)
            .unwrap_or(&path)
            .to_string_lossy()
            .to_string();

        match std::fs::read_to_string(&path) {
            Ok(content) => result.push((relative, content)),
            Err(e) => log::warn!("Skipping {}: {}", path.display(), e),
        }
    }

    result
}

/// Get the repos cache directory
fn repos_dir() -> Result<PathBuf, String> {
    let data_dir = dirs::data_dir()
        .ok_or_else(|| "Could not find data directory".to_string())?;
    let dir = data_dir.join("codecity").join("repos");
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir)
}

/// Clone a GitHub repo to local cache, or use existing clone
async fn clone_repo(repo_url: &str, github_token: Option<&str>) -> Result<PathBuf, String> {
    let (owner, repo) = github::parse_github_url(repo_url)
        .map_err(|e| e.to_string())?;

    let repos = repos_dir()?;
    let clone_dir = repos.join(format!("{}-{}", owner, repo));

    // If already cloned, pull latest
    if clone_dir.exists() {
        log::info!("Repo already cloned, pulling latest: {}", clone_dir.display());
        let output = tokio::process::Command::new("git")
            .args(["pull", "--ff-only"])
            .current_dir(&clone_dir)
            .output()
            .await
            .map_err(|e| format!("Failed to run git pull: {}", e))?;

        if !output.status.success() {
            log::warn!("git pull failed, using existing clone");
        }

        return Ok(clone_dir);
    }

    // Clone the repo
    let mut clone_url = if let Some(token) = github_token {
        format!("https://x-access-token:{}@github.com/{}/{}.git", token, owner, repo)
    } else {
        format!("https://github.com/{}/{}.git", owner, repo)
    };

    log::info!("Cloning repo: {}", repo_url);

    let output = tokio::process::Command::new("git")
        .args(["clone", "--depth", "1", &clone_url])
        .arg(&clone_dir)
        .output()
        .await
        .map_err(|e| format!("Failed to run git clone: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        // Try without token in URL (might be a public repo and token auth failed)
        if github_token.is_some() {
            clone_url = format!("https://github.com/{}/{}.git", owner, repo);
            let retry = tokio::process::Command::new("git")
                .args(["clone", "--depth", "1", &clone_url])
                .arg(&clone_dir)
                .output()
                .await
                .map_err(|e| format!("Failed to run git clone: {}", e))?;

            if !retry.status.success() {
                return Err(format!("git clone failed: {}", String::from_utf8_lossy(&retry.stderr)));
            }
        } else {
            return Err(format!("git clone failed: {}", stderr));
        }
    }

    Ok(clone_dir)
}

/// Detect if input is a GitHub URL or a local path
fn is_github_url(input: &str) -> bool {
    let trimmed = input.trim();
    trimmed.contains("github.com") || trimmed.matches('/').count() == 1 && !trimmed.starts_with('/') && !trimmed.starts_with('.') && !PathBuf::from(trimmed).exists()
}

/// Unified analyze entry point — auto-detects GitHub URL vs local path
///
/// - GitHub URL (e.g. "https://github.com/owner/repo", "owner/repo") → git clone + analyze
/// - Local path (e.g. "/Users/me/projects/myapp", "~/code/repo") → analyze directly
pub async fn analyze(
    db: &Database,
    input: &str,
    visibility: Option<&str>,
    github_token: Option<&str>,
) -> AnalyzeResult {
    let input = input.trim();
    let visibility = normalize_visibility(visibility);

    // Expand tilde
    let expanded = if input.starts_with('~') {
        dirs::home_dir()
            .map(|h| input.replacen('~', &h.to_string_lossy(), 1))
            .unwrap_or_else(|| input.to_string())
    } else {
        input.to_string()
    };

    let local_path = PathBuf::from(&expanded);

    // If it's an existing local directory, analyze directly
    if local_path.is_dir() {
        return analyze_from_dir(db, &local_path, &expanded, visibility).await;
    }

    // Otherwise treat as GitHub URL → clone then analyze
    if is_github_url(input) {
        return analyze_github(db, input, visibility, github_token).await;
    }

    // Neither a valid dir nor a GitHub URL
    AnalyzeResult {
        success: false,
        project_id: None,
        snapshot: None,
        error: Some(format!(
            "\"{}\" is not a valid local directory or GitHub URL",
            input
        )),
    }
}

fn normalize_visibility(visibility: Option<&str>) -> &str {
    match visibility {
        Some("PUBLIC") => "PUBLIC",
        _ => "PRIVATE",
    }
}

/// Analyze a GitHub repo: clone (or reuse) → read local files → parse → layout → save
async fn analyze_github(
    db: &Database,
    repo_url: &str,
    visibility: &str,
    github_token: Option<&str>,
) -> AnalyzeResult {
    let (owner, repo) = match github::parse_github_url(repo_url) {
        Ok(result) => result,
        Err(e) => {
            return AnalyzeResult {
                success: false,
                project_id: None,
                snapshot: None,
                error: Some(e.to_string()),
            }
        }
    };

    let name = format!("{}/{}", owner, repo);

    // Check for cached result
    if let Ok(Some(dup)) = db.find_duplicate(repo_url, "local") {
        if dup.status == "COMPLETED" {
            if let Ok(Some(snapshot)) = db.get_snapshot(&dup.id) {
                return AnalyzeResult {
                    success: true,
                    project_id: Some(dup.id),
                    snapshot: Some(snapshot),
                    error: None,
                };
            }
        }
        let _ = db.delete_project(&dup.id);
    }

    // Create project record
    let project = match db.create_project(&name, repo_url, visibility, "PROCESSING", "local") {
        Ok(p) => p,
        Err(e) => {
            return AnalyzeResult {
                success: false,
                project_id: None,
                snapshot: None,
                error: Some(format!("Failed to create project: {}", e)),
            }
        }
    };

    // Clone the repo locally
    let clone_dir = match clone_repo(repo_url, github_token).await {
        Ok(dir) => dir,
        Err(e) => {
            let _ = db.update_project_status(&project.id, "FAILED", 0, 0, Some(&e.to_string()));
            return AnalyzeResult {
                success: false,
                project_id: Some(project.id),
                snapshot: None,
                error: Some(e.to_string()),
            }
        }
    };

    // Parse from the cloned directory
    parse_and_save(db, &project, &clone_dir).await
}

/// Analyze a local directory directly — no cloning needed
async fn analyze_from_dir(
    db: &Database,
    dir: &Path,
    dir_str: &str,
    visibility: &str,
) -> AnalyzeResult {
    let name = dir.file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("local")
        .to_string();

    // Check for cached result
    if let Ok(Some(dup)) = db.find_duplicate(dir_str, "local") {
        if dup.status == "COMPLETED" {
            if let Ok(Some(snapshot)) = db.get_snapshot(&dup.id) {
                return AnalyzeResult {
                    success: true,
                    project_id: Some(dup.id),
                    snapshot: Some(snapshot),
                    error: None,
                };
            }
        }
        let _ = db.delete_project(&dup.id);
    }

    // Create project record
    let project = match db.create_project(&name, dir_str, visibility, "PROCESSING", "local") {
        Ok(p) => p,
        Err(e) => {
            return AnalyzeResult {
                success: false,
                project_id: None,
                snapshot: None,
                error: Some(format!("Failed to create project: {}", e)),
            }
        }
    };

    parse_and_save(db, &project, dir).await
}

/// Shared: read files from dir, parse, compute layout, save to DB
async fn parse_and_save(
    db: &Database,
    project: &super::db::ProjectRecord,
    dir: &Path,
) -> AnalyzeResult {
    let files = read_local_files(dir);

    if files.is_empty() {
        let msg = "No supported source files found";
        let _ = db.update_project_status(&project.id, "FAILED", 0, 0, Some(msg));
        return AnalyzeResult {
            success: false,
            project_id: Some(project.id.clone()),
            snapshot: None,
            error: Some(msg.to_string()),
        };
    }

    let parsed = parser::parse_files(&files, None);
    let snapshot = super::layout::create_snapshot(parsed, vec![]);

    let _ = db.update_project_status(
        &project.id,
        "COMPLETED",
        snapshot.stats.total_files as i64,
        snapshot.stats.total_lines as i64,
        None,
    );
    let _ = db.save_snapshot(&project.id, &snapshot);

    AnalyzeResult {
        success: true,
        project_id: Some(project.id.clone()),
        snapshot: Some(snapshot),
        error: None,
    }
}
